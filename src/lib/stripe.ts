// Real Stripe implementation using test keys from environment variables
import Stripe from 'stripe';
import { getPrismaClient } from './prisma';
import { tokenService } from './tokens';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2025-08-27.basil' 
});

// Constants
const CURRENCY = 'usd';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret_key';

// Get singleton Prisma client
const prisma = getPrismaClient();

export const stripeService = {
  // Create a payment intent for token purchase
  async createPaymentIntent({
    packageId,
    userId,
    anonymousId
  }: {
    packageId: string;
    userId?: string;
    anonymousId?: string;
  }) {
    try {
      // Get the token package
      const tokenPackage = tokenService.getTokenPackageById(packageId);
      
      if (!tokenPackage) {
        return { error: 'Invalid token package' };
      }
      
      // Either userId or anonymousId must be provided
      if (!userId && !anonymousId) {
        return { error: 'Either userId or anonymousId must be provided' };
      }
      
      // Store the payment intent in the database
      const paymentTransaction = await prisma.paymentTransaction.create({
        data: {
          userId,
          anonymousId,
          amount: tokenPackage.price, // Price is already in cents
          currency: CURRENCY,
          status: 'PENDING',
          tokensPurchased: tokenPackage.tokens
        }
      });
      
      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: tokenPackage.price, // Price is already in cents
        currency: CURRENCY,
        metadata: {
          paymentId: paymentTransaction.id,
          packageId: packageId,
          userId: userId || '',
          anonymousId: anonymousId || '',
          tokenCount: tokenPackage.tokens.toString()
        }
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentId: paymentTransaction.id,
        amount: tokenPackage.price,
        packageName: tokenPackage.name,
        tokens: tokenPackage.tokens
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return { error: 'Failed to create payment intent' };
    }
  },

  // Create a checkout session for token purchase
  async createCheckoutSession({
    packageId,
    userId,
    anonymousId,
    successUrl,
    cancelUrl
  }: {
    packageId: string;
    userId?: string;
    anonymousId?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    try {
      // Get the token package
      const tokenPackage = tokenService.getTokenPackageById(packageId);
      
      if (!tokenPackage) {
        return { error: 'Invalid token package' };
      }
      
      // Either userId or anonymousId must be provided
      if (!userId && !anonymousId) {
        return { error: 'Either userId or anonymousId must be provided' };
      }
      
      // Store the payment intent in the database
      const paymentTransaction = await prisma.paymentTransaction.create({
        data: {
          userId,
          anonymousId,
          amount: tokenPackage.price,
          currency: CURRENCY,
          status: 'PENDING',
          tokensPurchased: tokenPackage.tokens
        }
      });
      
      // Create a checkout session with Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: CURRENCY,
              product_data: {
                name: tokenPackage.name,
                description: `${tokenPackage.tokens} download tokens for FakeMyRide`,
              },
              unit_amount: tokenPackage.price, // Price is already in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentTransaction.id}`,
        cancel_url: cancelUrl,
        metadata: {
          paymentId: paymentTransaction.id,
          packageId: packageId,
          userId: userId || '',
          anonymousId: anonymousId || '',
          tokenCount: tokenPackage.tokens.toString()
        }
      });
      
      return { 
        sessionId: session.id,
        sessionUrl: session.url,
        paymentId: paymentTransaction.id
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { error: 'Failed to create checkout session' };
    }
  },
  
  // Handle webhook events from Stripe
  async handleWebhookEvent(body: string, signature: string) {
    try {
      // Verify the event
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        WEBHOOK_SECRET
      );
      
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          
          // Get payment ID from metadata
          const paymentId = session.metadata?.paymentId;
          
          if (paymentId) {
            // Update payment status
            const payment = await prisma.paymentTransaction.update({
              where: { id: paymentId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                providerTransactionId: typeof session.payment_intent === 'string' 
                  ? session.payment_intent 
                  : session.payment_intent?.id || session.id
              }
            });
            
            // Add tokens to user
            if (payment.userId) {
              await tokenService.addTokensToUser(payment.userId, payment.tokensPurchased);
            } else if (payment.anonymousId) {
              await tokenService.addTokensToAnonymousUser(payment.anonymousId, payment.tokensPurchased);
            }
          }
          break;
        }
        
        case 'checkout.session.expired': {
          const session = event.data.object;
          const paymentId = session.metadata?.paymentId;
          
          if (paymentId) {
            // Update payment status
            await prisma.paymentTransaction.update({
              where: { id: paymentId },
              data: {
                status: 'FAILED'
              }
            });
          }
          break;
        }
        
        // Add more event handlers as needed
      }
      
      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return { error: 'Webhook error' };
    }
  },
  
  // Check the status of a payment
  async getPaymentStatus(paymentId: string) {
    try {
      const payment = await prisma.paymentTransaction.findUnique({
        where: { id: paymentId }
      });
      
      return payment ? { status: payment.status, payment } : { error: 'Payment not found' };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return { error: 'Failed to get payment status' };
    }
  }
};

export default stripeService;