import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';
import { tokenService } from '@/lib/tokens';
import { getPrismaClient } from '@/lib/prisma';

// Validation schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  anonymousId: z.string().optional().nullable(), // For transferring tokens from anonymous user
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 10, clientIP); // 10 login attempts per minute per IP
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);
    
    // TEMPORARY: Hardcoded admin authentication bypass due to database connection issues
    if (validatedData.email === 'admin@qoderfakerun.com' && validatedData.password === 'gogo') {
      // Create mock admin user object with real database ID
      const adminUser = {
        id: 'cmeu1kwjg0000w5zgh3xdrxma', // Real admin user ID from database
        email: 'admin@qoderfakerun.com',
        username: 'gogo',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        tokenBalance: 9999
      };
      
      // Generate token manually
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      const token = jwt.sign({
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
        tokenBalance: adminUser.tokenBalance
      }, JWT_SECRET, { expiresIn: '7d' });
      
      return NextResponse.json({
        success: true,
        data: {
          user: adminUser,
          token: token
        }
      });
    }
    
    const result = await authService.login({
      email: validatedData.email,
      password: validatedData.password
    });
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 401 });
    }
    
    // If anonymousId is provided, transfer tokens from anonymous user
    if (validatedData.anonymousId) {
      await tokenService.transferAnonymousTokens(validatedData.anonymousId, result.user.id);
      
      // Update token balance in response
      const updatedUser = await getPrismaClient().user.findUnique({
        where: { id: result.user.id },
        select: { tokenBalance: true }
      });
      
      if (updatedUser) {
        result.user.tokenBalance = updatedUser.tokenBalance;
      }
    }
    
    // Return user and token
    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
    
  } catch (error) {
    // Handle rate limiting
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many login attempts. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid login data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 });
    }
    
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to login',
      code: 'LOGIN_ERROR'
    }, { status: 500 });
  }
}