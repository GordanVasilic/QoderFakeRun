import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { db } from '@/lib/prisma';
import { z } from 'zod';

const prisma = db;

// Validation schema
const RoleUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN'])
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    
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
    const validatedData = RoleUpdateSchema.parse(body);
    
    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: validatedData.role },
      select: { id: true, email: true, role: true }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        message: `User role updated to ${validatedData.role}`,
        user: updatedUser
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
    
    console.error('Error updating user role:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user role',
      code: 'ADMIN_ERROR'
    }, { status: 500 });
  }
}