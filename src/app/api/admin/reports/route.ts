import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createActivityLog } from '@/app/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'enrollment';
    const timeRange = searchParams.get('timeRange') || '6months';
    
    // Calculate date range based on timeRange
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // A date far enough in the past
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    let result = {};
    
    // Generate report based on type
    if (reportType === 'enrollment') {
      result = await generateEnrollmentReport(startDate, endDate);
    } else if (reportType === 'academic') {
      result = await generateAcademicReport(startDate, endDate);
    } else if (reportType === 'attendance') {
      result = await generateAttendanceReport(startDate, endDate);
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
    
    // Log this activity
    await createActivityLog(
      session.user.id,
      'VIEW',
      `Generated ${reportType} report for ${timeRange} time range`,
      'REPORT',
      'report-' + Date.now(), // Generate a unique ID since there's no specific entity ID
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function generateEnrollmentReport(startDate: Date, endDate: Date) {
  // Count total enrollments
  const totalEnrollments = await prisma.enrollment.count();
  
  // Count active enrollments
  const activeEnrollments = await prisma.enrollment.count({
    where: {
      status: 'ACTIVE',
    },
  });
  
  // Count completed enrollments
  const completedEnrollments = await prisma.enrollment.count({
    where: {
      status: 'COMPLETED',
    },
  });
  
  // Count pending enrollments
  const pendingEnrollments = await prisma.enrollment.count({
    where: {
      status: 'PENDING',
    },
  });
  
  // Count withdrawn enrollments
  const withdrawnEnrollments = await prisma.enrollment.count({
    where: {
      status: 'WITHDRAWN',
    },
  });
  
  // Get monthly enrollments for chart
  const enrollments = await prisma.enrollment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  
  // Group enrollments by month
  const monthlyEnrollments: Record<string, number> = {};
  for (let i = 0; i <= getMonthDifference(startDate, endDate); i++) {
    const month = new Date(startDate);
    month.setMonth(startDate.getMonth() + i);
    const monthName = month.toLocaleString('default', { month: 'short' });
    monthlyEnrollments[monthName] = 0;
  }
  
  enrollments.forEach(enrollment => {
    const monthName = new Date(enrollment.createdAt).toLocaleString('default', { month: 'short' });
    if (monthlyEnrollments[monthName] !== undefined) {
      monthlyEnrollments[monthName]++;
    }
  });
  
  return {
    enrollmentStats: {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      pendingEnrollments,
      withdrawnEnrollments,
      monthlyEnrollments,
    },
  };
}

async function generateAcademicReport(startDate: Date, endDate: Date) {
  // Calculate average grade
  const gradesAggregate = await prisma.grade.aggregate({
    _avg: {
      value: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  const averageGrade = gradesAggregate._avg.value || 0;
  
  // Find classes with highest and lowest average grades
  const classGrades = await prisma.grade.groupBy({
    by: ['classId'],
    _avg: {
      value: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    having: {
      classId: {
        _count: {
          gt: 5, // Only consider classes with more than 5 grades for statistical significance
        },
      },
    },
    orderBy: {
      _avg: {
        value: 'desc',
      },
    },
  });
  
  // Get class names
  let topPerformingClass = 'N/A';
  let lowestPerformingClass = 'N/A';
  
  if (classGrades.length > 0) {
    const topClassId = classGrades[0].classId;
    const topClass = await prisma.class.findUnique({
      where: { id: topClassId },
      select: { name: true },
    });
    topPerformingClass = topClass?.name || 'N/A';
    
    if (classGrades.length > 1) {
      const lowestClassId = classGrades[classGrades.length - 1].classId;
      const lowestClass = await prisma.class.findUnique({
        where: { id: lowestClassId },
        select: { name: true },
      });
      lowestPerformingClass = lowestClass?.name || 'N/A';
    }
  }
  
  // Calculate grade distribution
  const allGrades = await prisma.grade.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      value: true,
    },
  });
  
  const gradeDistribution = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  };
  
  allGrades.forEach(grade => {
    if (grade.value >= 90) {
      gradeDistribution.A++;
    } else if (grade.value >= 80) {
      gradeDistribution.B++;
    } else if (grade.value >= 70) {
      gradeDistribution.C++;
    } else if (grade.value >= 60) {
      gradeDistribution.D++;
    } else {
      gradeDistribution.F++;
    }
  });
  
  return {
    academicStats: {
      averageGrade,
      topPerformingClass,
      lowestPerformingClass,
      gradeDistribution,
    },
  };
}

async function generateAttendanceReport(startDate: Date, endDate: Date) {
  // Calculate average attendance rate
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      isPresent: true,
    },
  });
  
  const totalRecords = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(record => record.isPresent).length;
  const averageAttendanceRate = totalRecords > 0 ? presentCount / totalRecords : 0;
  
  // Find classes with highest and lowest attendance rates
  const classAttendance = await prisma.attendance.groupBy({
    by: ['classId'],
    _count: {
      id: true,
    },
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  const classAttendanceRates = [];
  
  for (const item of classAttendance) {
    const classPresent = await prisma.attendance.count({
      where: {
        classId: item.classId,
        isPresent: true,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    const className = await prisma.class.findUnique({
      where: { id: item.classId },
      select: { name: true },
    });
    
    classAttendanceRates.push({
      classId: item.classId,
      className: className?.name || 'Unknown Class',
      attendanceRate: item._count.id > 0 ? classPresent / item._count.id : 0,
    });
  }
  
  // Sort by attendance rate
  classAttendanceRates.sort((a, b) => b.attendanceRate - a.attendanceRate);
  
  // Get top 5 and bottom 5 classes
  const classesWithHighestAttendance = classAttendanceRates.slice(0, 5);
  const classesWithLowestAttendance = [...classAttendanceRates].reverse().slice(0, 5);
  
  return {
    attendanceStats: {
      averageAttendanceRate,
      classesWithHighestAttendance,
      classesWithLowestAttendance,
    },
  };
}

// Helper function to calculate the difference in months between two dates
function getMonthDifference(startDate: Date, endDate: Date) {
  return (
    endDate.getMonth() -
    startDate.getMonth() +
    12 * (endDate.getFullYear() - startDate.getFullYear())
  );
}
