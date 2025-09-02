import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { db } from '@/lib/prisma';

const prisma = db;

export async function GET(request: NextRequest) {
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
    
    // Get users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        tokenBalance: true,
        createdAt: true,
        lastLoginAt: true,
        isPublic: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        users
      }
    });
    
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get users',
      code: 'ADMIN_ERROR'
    }, { status: 500 });
  }
}