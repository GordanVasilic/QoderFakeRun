import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { db } from '@/lib/prisma';
import { z } from 'zod';
import { tokenService } from '@/lib/tokens';

const prisma = db;

// Validation schema
const TokenUpdateSchema = z.object({
  tokens: z.number().int().min(1).max(100)
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const admin = await isAdmin(request);
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 });
    }
    
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 20, clientIP);
    
    // Get user ID from path
    const { id } = params;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    // Validate request body
    const body = await request.json();
    const validatedData = TokenUpdateSchema.parse(body);
    
    // Add tokens to user
    await tokenService.addTokensToUser(id, validatedData.tokens);
    
    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: { tokenBalance: true }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Added ${validatedData.tokens} tokens to user`,
        newBalance: updatedUser?.tokenBalance || 0
      }
    });
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 });
    }
    
    console.error('Error adding tokens to user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add tokens to user',
      code: 'ADMIN_ERROR'
    }, { status: 500 });
  }
}