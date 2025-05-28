import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Calculate total revenue
    const totalRevenueResult = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'COMPLETED',
      },
    });
    const totalRevenue = totalRevenueResult._sum.amount || 0;
    
    // Count payments by status
    const completedPayments = await prisma.payment.count({
      where: {
        status: 'COMPLETED',
      },
    });
    
    const pendingPayments = await prisma.payment.count({
      where: {
        status: 'PENDING',
      },
    });
    
    const failedPayments = await prisma.payment.count({
      where: {
        status: 'FAILED',
      },
    });
    
    // Calculate monthly revenue for the last 6 months
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paymentDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    });
    
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthName] = 0;
    }
    
    monthlyPayments.forEach(payment => {
      const monthName = new Date(payment.paymentDate).toLocaleString('default', { month: 'short' });
      if (monthlyRevenue[monthName] !== undefined) {
        monthlyRevenue[monthName] += payment.amount;
      }
    });
    
    // Get top paying classes
    const classRevenues = await prisma.payment.groupBy({
      by: ['enrollmentId'],
      _sum: {
        amount: true,
      },
      where: {
        status: 'COMPLETED',
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 5,
    });
    
    const enrollmentIds = classRevenues.map(item => item.enrollmentId);
    
    const enrollments = await prisma.enrollment.findMany({
      where: {
        id: {
          in: enrollmentIds,
        },
      },
      select: {
        id: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });
    
    const topPayingClasses = classRevenues.map(revenueItem => {
      const enrollment = enrollments.find(e => e.id === revenueItem.enrollmentId);
      return {
        className: enrollment?.class?.name || 'Unknown Class',
        revenue: revenueItem._sum.amount || 0,
      };
    });
    
    return NextResponse.json({
      totalRevenue,
      pendingPayments,
      completedPayments,
      failedPayments,
      monthlyRevenue,
      topPayingClasses,
    });
  } catch (error) {
    console.error('Error generating financial summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
