import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { db } from '@/lib/prisma';

const prisma = db;

export async function DELETE(
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
    await generalLimiter.check(request, 10, clientIP);
    
    // Get user ID from path
    const { id } = await params;
    
    // Prevent deleting yourself
    if (id === admin.id) {
      return NextResponse.json({
        success: false,
        error: 'You cannot delete your own account'
      }, { status: 400 });
    }
    
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
    
    // Delete user
    await prisma.user.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'User deleted successfully'
      }
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user',
      code: 'ADMIN_ERROR'
    }, { status: 500 });
  }
}