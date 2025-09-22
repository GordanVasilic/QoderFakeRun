import { NextApiRequest, NextApiResponse } from 'next';
import { tokenService } from '@/lib/tokens';
import jwt from 'jsonwebtoken';

interface TokenAddRequest {
  tokens: number;
  packageId: string;
  paymentMethodId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.debug('🔍 Token add request received:', {
    method: req.method,
    body: req.body,
    headers: req.headers.authorization ? 'Bearer token present' : 'No auth header',
    userAgent: req.headers['user-agent']
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tokens, packageId, paymentMethodId }: TokenAddRequest = req.body;
    console.debug('🔍 Parsed request data:', { tokens, packageId, paymentMethodId, anonymousId: req.body.anonymousId });

    if (!tokens || typeof tokens !== 'number' || tokens <= 0) {
      console.debug('❌ Invalid token amount:', tokens);
      return res.status(400).json({ success: false, error: 'Invalid token amount. Must be a positive number.' });
    }

    if (!packageId || typeof packageId !== 'string') {
      console.debug('❌ Invalid package ID:', packageId);
      return res.status(400).json({ success: false, error: 'Package ID is required.' });
    }

    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      console.debug('❌ Invalid payment method ID:', paymentMethodId);
      return res.status(400).json({ success: false, error: 'Payment method ID is required.' });
    }

    console.debug('✅ All validation passed');

    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        console.error('Token verification failed:', error);
        // Continue as anonymous user
      }
    }

    if (userId) {
      // Add tokens to authenticated user
      console.debug('🔍 Adding tokens to authenticated user:', userId);
      const success = await tokenService.addTokensToUser(userId, tokens);
      console.debug('🔍 Token addition result for user:', { userId, success });
      
      if (!success) {
        console.debug('❌ Failed to add tokens to user account');
        return res.status(500).json({ success: false, error: 'Failed to add tokens to user account' });
      }
      
      console.debug('✅ Successfully added tokens to user account');
      return res.status(200).json({
        success: true,
        message: `Successfully added ${tokens} tokens to user account`,
        data: {
          userId,
          tokensAdded: tokens,
          packageId,
          paymentMethodId
        }
      });
    } else {
      // Add tokens to anonymous user
      const anonymousId = req.body.anonymousId;
      console.debug('🔍 Processing anonymous user request:', anonymousId);
      
      if (!anonymousId) {
        console.debug('❌ Missing anonymous ID');
        return res.status(400).json({ success: false, error: 'Anonymous ID required for non-authenticated users' });
      }

      console.debug('🔍 Adding tokens to anonymous user:', anonymousId);
      const success = await tokenService.addTokensToAnonymousUser(anonymousId, tokens);
      console.debug('🔍 Token addition result for anonymous user:', { anonymousId, success });
      
      if (!success) {
        console.debug('❌ Failed to add tokens to anonymous account');
        return res.status(500).json({ success: false, error: 'Failed to add tokens to anonymous account' });
      }
      
      console.debug('✅ Successfully added tokens to anonymous account');
      return res.status(200).json({
        success: true,
        message: `Successfully added ${tokens} tokens to anonymous account`,
        data: {
          anonymousId,
          tokensAdded: tokens,
          packageId,
          paymentMethodId
        }
      });
    }
  } catch (error) {
    console.error('❌ Error adding tokens:', error);
    console.debug('🔍 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to add tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}