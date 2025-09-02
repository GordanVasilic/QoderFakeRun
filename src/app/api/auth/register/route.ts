import { NextRequest, NextResponse } from 'next/server';
import { authService, isAuthenticated, isAdmin } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';
import { getPrismaClient } from '@/lib/prisma';

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register endpoint
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 10, clientIP); // 10 registrations per minute per IP
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = RegisterSchema.parse(body);
    
    // Register user
    const result = await authService.register(validatedData);
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
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
        error: 'Too many registration attempts. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid registration data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 });
    }
    
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to register',
      code: 'REGISTRATION_ERROR'
    }, { status: 500 });
  }
}

// Get current user profile
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    // Return user profile
    return NextResponse.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    }, { status: 500 });
  }
}