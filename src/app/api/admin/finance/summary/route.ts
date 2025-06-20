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
    
    // Get all classes with their enrolled students for revenue calculations
    const classesWithEnrollments = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        fee: true,
        enrollments: {
          where: {
            status: 'enrolled' // Only count enrolled students
          },
          select: {
            id: true,
            enrollmentDate: true
          }
        }
      }
    });
    
    // Count enrollments by status for payment stats
    const enrollmentCounts = await prisma.$transaction([
      prisma.enrollment.count({ where: { status: 'enrolled' } }),
      prisma.enrollment.count({ where: { status: 'pending' } }),
      prisma.enrollment.count({ where: { status: 'rejected' } })
    ]);
    
    const completedPayments = enrollmentCounts[0];
    const pendingPayments = enrollmentCounts[1];
    const failedPayments = enrollmentCounts[2];
    
    // Calculate total revenue: sum of (fee × enrollment count) for each class
    const totalRevenue = classesWithEnrollments.reduce((sum, cls) => {
      const classRevenue = (cls.fee || 0) * cls.enrollments.length;
      return sum + classRevenue;
    }, 0);
    
    // Calculate monthly revenue for the last 6 months
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    // Initialize monthly revenue object with all months set to 0
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthName] = 0;
    }
    
    // Calculate revenue per month based on class enrollments
    classesWithEnrollments.forEach(cls => {
      const fee = cls.fee || 0;
      
      // For each enrollment in this class, add its revenue to the appropriate month
      cls.enrollments.forEach(enrollment => {
        // Type assertion since we know enrollmentDate exists but TypeScript may not see it
        const enrollmentDate = (enrollment as unknown as { enrollmentDate: Date }).enrollmentDate;
        
        if (enrollmentDate && enrollmentDate >= sixMonthsAgo) {
          const monthName = new Date(enrollmentDate).toLocaleString('default', { month: 'short' });
          if (monthlyRevenue[monthName] !== undefined) {
            // Add this student's class fee to the month's revenue
            monthlyRevenue[monthName] += fee;
          }
        }
      });
    });
    
    // Calculate revenue for each class (fee × number of enrolled students)
    const classRevenueMap = new Map<string, { className: string, revenue: number }>();
    
    classesWithEnrollments.forEach(cls => {
      const classId = cls.id;
      const className = cls.name || 'Unknown Class';
      const classRevenue = (cls.fee || 0) * cls.enrollments.length;
      
      classRevenueMap.set(classId, {
        className,
        revenue: classRevenue
      });
    });
    
    // Sort classes by revenue and get top 5
    const topPayingClasses = Array.from(classRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
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
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
