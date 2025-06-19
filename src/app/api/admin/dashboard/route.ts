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
    // Get total students count from student table (not enrollment requests)
    const totalStudents = await prisma.student.count();
    
    // Fix 1: Count active classes properly - counting classes with status 'active', 'Active', or 'APPROVED'
    const activeClasses = await prisma.class.count({
      where: {
        OR: [
          { status: 'active' },
          { status: 'Active' },
          { status: 'ACTIVE' },
          { status: 'APPROVED' },
          { status: 'Approved' },
          { status: 'approved' }
        ]
      }
    });
    
    const pendingEnrollments = await prisma.enrollmentRequest.count({
      where: { status: 'PENDING' }
    });

    // Get financial statistics
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Get all active classes and their enrollments for revenue calculation
    const classesWithEnrollments = await prisma.class.findMany({
      where: {
        OR: [
          { status: 'active' },
          { status: 'Active' },
          { status: 'ACTIVE' },
          { status: 'APPROVED' },
          { status: 'Approved' },
          { status: 'approved' }
        ]
      },
      include: {
        enrollments: true
      }
    });
    
    // Calculate totalRevenueThisMonth: Sum of revenue from all classes (enrolled students × class fee)
    const totalRevenueThisMonth = classesWithEnrollments.reduce((total, cls) => {
      const classRevenue = cls.enrollments.length * (cls.fee || 0);
      return total + classRevenue;
    }, 0);

    // Get payments with status COMPLETED for the current month
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Fix 2: Calculate enrollments for the current month (June 2025)
    // Using enrollmentDate field instead of createdAt and using the correct date range
    // Note: firstDayOfMonth and lastDayOfMonth are already declared above
    
    const approvedEnrollmentsThisMonth = await prisma.enrollment.count({
      where: {
        enrollmentDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });

    // Fix 3: Calculate withdrawn students for the current month with status 'Approved'
    const withdrawnStudentsThisMonth = await prisma.withdrawalRequest.count({
      where: {
        status: {
          in: ['Approved', 'APPROVED', 'approved']
        },
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });

    // Calculate enrollment approval rate
    const totalRequests = await prisma.enrollmentRequest.count();
    const approvalRate = ((approvedEnrollmentsThisMonth / totalRequests) * 100).toFixed(2);

    // Calculate expenses: Total of all teacher salaries
    // For each teacher: salary = (salaryPerClass × numberOfAssignedClasses) + (extraPerSchedule × class schedules count)
    // First get all teachers with their classes
    const teachers = await prisma.teacher.findMany({
      include: {
        classes: true // Classes assigned to each teacher
      }
    });
    
    // Get all class schedules to calculate schedules per teacher
    const allClassSchedules = await prisma.classSchedule.findMany();
    
    const expenses = teachers.reduce((total, teacher) => {
      // Count classes assigned to this teacher
      const classesCount = teacher.classes.length;
      
      // Count schedules for classes taught by this teacher
      const teacherClassIds = teacher.classes.map(cls => cls.id);
      const teacherSchedulesCount = allClassSchedules.filter(
        schedule => teacherClassIds.includes(schedule.classId)
      ).length;
      
      // Calculate teacher's salary - using type assertion since we know these fields exist in schema
      // Even though TypeScript can't see them in the current Prisma client generation
      const salaryPerClass = (teacher as any).salaryPerClass || 0;
      const extraPerSchedule = (teacher as any).extraPerSchedule || 0;
      
      const teacherSalary = salaryPerClass * classesCount + 
                           extraPerSchedule * teacherSchedulesCount;
                          
      return total + teacherSalary;
    }, 0);

    // Calculate net profit: Difference between totalRevenueThisMonth and expenses
    const netProfit = totalRevenueThisMonth - expenses;

    // Find the topEarningClass: Class with the highest total revenue
    let topClassName = 'N/A';
    let topClassRevenue = 0;
    
    if (classesWithEnrollments.length > 0) {
      const classRevenues = classesWithEnrollments.map(cls => {
        const revenue = cls.enrollments.length * (cls.fee || 0);
        return { name: cls.name, revenue };
      });
      
      if (classRevenues.length > 0) {
        const topClass = classRevenues.reduce((prev, current) => 
          current.revenue > prev.revenue ? current : prev,
          { name: 'N/A', revenue: 0 }
        );
        
        topClassName = topClass.name;
        topClassRevenue = topClass.revenue;
      }
    }

    // Calculate outstandingPayments: Sum of all payments where status is 'Pending' or 'Unpaid'
    const outstandingPayments = await prisma.payment.aggregate({
      where: {
        status: {
          in: ['PENDING', 'Pending', 'pending', 'UNPAID', 'Unpaid', 'unpaid']
        }
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
        totalStudents: totalStudents,
        activeClasses: activeClasses, // Updated to use the correct active classes count
        enrolledThisMonth: approvedEnrollmentsThisMonth,
        withdrawnThisMonth: withdrawnStudentsThisMonth,
        graduationThisMonth: 0 // Placeholder for now
      },
      financial: {
        monthlyRevenue: totalRevenueThisMonth,  // Updated to use the new calculation
        outstandingPayments: outstandingPayments._sum.amount || 0,
        expenses: expenses,  // Now calculated from teacher salaries
        netProfit: netProfit, // Updated: totalRevenueThisMonth - expenses
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
