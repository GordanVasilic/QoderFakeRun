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
    
    // Get stats (normally we'd use aggregations in the database)
    // But for the simple JSON storage we're using, we'll create mock stats
    
    // For a real database implementation:
    /*
    const [
      totalUsers, 
      totalRoutes, 
      totalDownloads, 
      tokensStats,
      revenueStats
    ] = await Promise.all([
      prisma.user.count(),
      prisma.route.count(),
      prisma.routeDownload.count(),
      prisma.user.aggregate({
        _sum: {
          tokenBalance: true
        }
      }),
      prisma.paymentTransaction.aggregate({
        _sum: {
          amount: true
        },
        where: {
          status: 'COMPLETED'
        }
      })
    ]);
    
    // Get users created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const newUsers24h = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday
        }
      }
    });
    
    // Active users (users who logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    */
    
    // For now, we'll use mock data:
    const stats = {
      totalUsers: 120,
      totalRoutes: 456,
      totalDownloads: 789,
      totalRevenue: 1234.56,
      tokensIssued: 2000,
      tokensUsed: 789,
      activeUsers: 85,
      newUsers24h: 12
    };
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get admin stats',
      code: 'ADMIN_ERROR'
    }, { status: 500 });
  }
}