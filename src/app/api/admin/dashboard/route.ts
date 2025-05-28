import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get enrollment statistics
    const totalEnrollments = await prisma.enrollmentRequest.count();
    const activeEnrollments = await prisma.enrollmentRequest.count({
      where: { status: 'ACTIVE' }
    });
    const pendingEnrollments = await prisma.enrollmentRequest.count({
      where: { status: 'PENDING' }
    });

    // Get financial statistics
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const allPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED'
      }
    });

    const totalRevenue = allPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate approved enrollments for the current month
    const approvedEnrollmentsThisMonth = await prisma.enrollmentRequest.count({
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    // Calculate withdrawn students for the current month
    const withdrawnStudentsThisMonth = await prisma.withdrawalRequest.count({
      where: {
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      }
    });

    // Calculate enrollment approval rate
    const totalRequests = await prisma.enrollmentRequest.count();
    const approvalRate = ((approvedEnrollmentsThisMonth / totalRequests) * 100).toFixed(2);

    // For now, we don't have an expense model, so we'll set expenses to 0
    const expenses = 0;

    // Calculate net profit (this month)
    const netProfit = monthlyRevenue - expenses;

    // Find the top paying class
    const topPayingClass = await prisma.class.findMany({
      include: {
        enrollments: true
      }
    });

    let topClassName = 'N/A';
    let topClassRevenue = 0;
    
    if (topPayingClass && topPayingClass.length > 0) {
      const classRevenues = topPayingClass.map(cls => {
        const revenue = cls.enrollments.length * (cls.fee || 0);
        return { name: cls.name, revenue };
      });
      
      if (classRevenues.length > 0) {
        const topClass = classRevenues.reduce((prev, current) => 
          current.revenue > prev.revenue ? current : prev
        );
        
        topClassName = topClass.name;
        topClassRevenue = topClass.revenue;
      }
    }

    // Calculate pending payments
    const pendingPayments = await prisma.payment.aggregate({
      where: {
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    // Get recent activities
    const recentActivities = await prisma.activityLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true
      }
    });

    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      description: activity.description,
      userName: activity.user?.name || 'Unknown',
      createdAt: activity.createdAt
    }));

    return NextResponse.json({
      institution: {
        totalStudents: totalEnrollments,
        activeClasses: activeEnrollments,
        enrolledThisMonth: approvedEnrollmentsThisMonth,
        withdrawnThisMonth: withdrawnStudentsThisMonth,
        graduationThisMonth: 0 // Placeholder for now
      },
      financial: {
        monthlyRevenue: monthlyRevenue,
        outstandingPayments: pendingPayments._sum.amount || 0,
        expenses: expenses,
        netProfit: netProfit,
        topPayingClass: topClassName,
        topPayingClassRevenue: topClassRevenue
      },
      recentActivities: formattedActivities
    });
    
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message: error.message },
      { status: 500 }
    );
  }
}
