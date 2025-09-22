import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';

// Validation schema
const ProfileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().min(3).optional(),
  isPublic: z.boolean().optional(),
  activityType: z.enum(['RUN', 'BIKE', 'WALK', 'HIKE']).optional(),
  paceUnit: z.enum(['METRIC', 'IMPERIAL']).optional()
});

export async function PATCH(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 20, clientIP);
    
    // Validate request body
    const body = await request.json();
    const validatedData = ProfileUpdateSchema.parse(body);
    
    // Update user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        tokenBalance: true,
        isPublic: true,
        activityType: true,
        paceUnit: true
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
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
    
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_ERROR'
    }, { status: 500 });
  }
}

// Get current user profile
export async function GET(request: NextRequest) {
  try {
    // TEMPORARY: Handle admin user bypass for profile endpoint
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify JWT token manually for admin user
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // If this is the admin temp user, return profile without database lookup
        if (decoded.id === 'admin-temp-id' && decoded.email === 'admin@qoderfakerun.com') {
          const adminUser = {
            id: 'admin-temp-id',
            email: 'admin@qoderfakerun.com',
            username: 'gogo',
            firstName: 'Admin',
            lastName: 'User',
            avatar: null,
            role: 'ADMIN',
            tokenBalance: 9999,
            isPublic: false,
            activityType: 'RUN',
            paceUnit: 'METRIC'
          };
          
          return NextResponse.json({
            success: true,
            data: { user: adminUser }
          });
        }
      } catch (jwtError) {
        // JWT verification failed, continue with normal flow
      }
    }
    
    // Check if user is authenticated using normal flow
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