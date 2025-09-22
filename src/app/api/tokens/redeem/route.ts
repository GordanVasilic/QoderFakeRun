import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { tokenService } from '@/lib/tokens';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';

// Validation schema
const RedeemTokensSchema = z.object({
  anonymousId: z.string().optional(),
  tokens_to_redeem: z.number().min(1).max(10),
  download_url: z.string().url(),
});

// Redeem tokens for download access
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 10, clientIP);
    
    // Parse and validate request
    const body = await request.json();
    console.log('🔍 [POST /api/tokens/redeem] Received request body:', JSON.stringify(body, null, 2));
    
    const validatedData = RedeemTokensSchema.parse(body);
    console.log('✅ [POST /api/tokens/redeem] Validation successful:', JSON.stringify(validatedData, null, 2));
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    
    if (user) {
      // Check if authenticated user has enough tokens
      const hasEnoughTokens = await tokenService.checkUserTokenBalance(user.id, validatedData.tokens_to_redeem);
      
      if (!hasEnoughTokens) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient tokens',
          code: 'INSUFFICIENT_TOKENS'
        }, { status: 400 });
      }
      
      // Deduct tokens from authenticated user
      const deductResult = await tokenService.deductTokensFromUser(user.id, validatedData.tokens_to_redeem);
      
      if (!deductResult) {
        return NextResponse.json({
          success: false,
          error: 'Failed to deduct tokens',
          code: 'TOKEN_DEDUCTION_FAILED'
        }, { status: 500 });
      }
      
      // Track the download
      await tokenService.trackDownload({
        routeId: 'unknown', // We don't have route ID in this context
        userId: user.id,
        format: 'GPX', // Default format
        tokensUsed: validatedData.tokens_to_redeem,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      // Get updated balance
      const remainingBalance = await tokenService.getUserTokenBalance(user.id);
      
      return NextResponse.json({
        success: true,
        remaining_balance: remainingBalance,
        tokens_used: validatedData.tokens_to_redeem,
        download_url: validatedData.download_url
      });
      
    } else {
      // Handle anonymous user
      const anonymousId = validatedData.anonymousId;
      
      if (!anonymousId) {
        return NextResponse.json({
          success: false,
          error: 'Anonymous ID required for non-authenticated users',
          code: 'ANONYMOUS_ID_REQUIRED'
        }, { status: 400 });
      }
      
      // Check if anonymous user has enough tokens
      const hasEnoughTokens = await tokenService.checkAnonymousTokenBalance(anonymousId, validatedData.tokens_to_redeem);
      
      if (!hasEnoughTokens) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient tokens. Please purchase more tokens to continue.',
          code: 'INSUFFICIENT_TOKENS'
        }, { status: 400 });
      }
      
      // Deduct tokens from anonymous user
      const deductResult = await tokenService.deductTokensFromAnonymousUser(anonymousId, validatedData.tokens_to_redeem);
      
      if (!deductResult) {
        return NextResponse.json({
          success: false,
          error: 'Failed to deduct tokens',
          code: 'TOKEN_DEDUCTION_FAILED'
        }, { status: 500 });
      }
      
      // Track the download
      await tokenService.trackDownload({
        routeId: 'unknown', // We don't have route ID in this context
        anonymousId: anonymousId,
        format: 'GPX', // Default format
        tokensUsed: validatedData.tokens_to_redeem,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      // Get remaining balance from database
      const remainingBalance = await tokenService.getAnonymousTokenBalance(anonymousId);
      
      return NextResponse.json({
        success: true,
        remaining_balance: remainingBalance,
        tokens_used: validatedData.tokens_to_redeem,
        download_url: validatedData.download_url
      });
    }
    
  } catch (error) {
    // Handle rate limiting
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/tokens/redeem] Validation error:', {
        issues: error.issues
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.issues
      }, { status: 400 });
    }
    
    console.error('❌ [POST /api/tokens/redeem] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}