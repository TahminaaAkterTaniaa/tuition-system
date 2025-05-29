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
    
    // Fetch all enrollments with class information
    // Explicitly select only the fields that exist in the database
    const enrollments = await prisma.enrollment.findMany({
      select: {
        id: true,
        status: true,
        enrollmentDate: true,
        class: {
          select: {
            id: true,
            name: true,
            fee: true
          }
        }
      }
    });
    
    // Calculate total revenue (sum of class fees for enrolled students)
    const completedEnrollments = enrollments.filter(e => e.status === 'enrolled');
    const totalRevenue = completedEnrollments.reduce((sum, enrollment) => sum + (enrollment.class?.fee || 0), 0);
    
    // Count enrollments by status (map to payment status)
    const completedPayments = enrollments.filter(e => e.status === 'enrolled').length;
    const pendingPayments = enrollments.filter(e => e.status === 'pending').length;
    const failedPayments = enrollments.filter(e => e.status === 'rejected').length;
    
    // Calculate monthly revenue for the last 6 months
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    // Initialize monthly revenue object
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthName] = 0;
    }
    
    // Calculate monthly revenue based on enrollments
    completedEnrollments.forEach(enrollment => {
      // Use the enrollment date as the payment date
      const enrollmentDate = enrollment.enrollmentDate;
      const monthName = new Date(enrollmentDate).toLocaleString('default', { month: 'short' });
      if (monthlyRevenue[monthName] !== undefined && enrollmentDate >= sixMonthsAgo) {
        monthlyRevenue[monthName] += enrollment.class?.fee || 0;
      }
    });
    
    // Get top paying classes
    // Group enrollments by class and calculate revenue for each class
    const classRevenueMap = new Map<string, { className: string, revenue: number }>();
    
    completedEnrollments.forEach(enrollment => {
      const classId = enrollment.class.id;
      const className = enrollment.class.name || 'Unknown Class';
      const fee = enrollment.class.fee || 0;
      
      if (classRevenueMap.has(classId)) {
        const current = classRevenueMap.get(classId)!;
        classRevenueMap.set(classId, {
          className,
          revenue: current.revenue + fee
        });
      } else {
        classRevenueMap.set(classId, {
          className,
          revenue: fee
        });
      }
    });
    
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
