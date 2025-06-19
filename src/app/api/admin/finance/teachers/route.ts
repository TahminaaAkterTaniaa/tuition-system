import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Teacher, Class, User } from '@prisma/client';

// GET: Fetch all teachers with salary information
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication and authorization
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all teachers with user details and their classes
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        classes: {
          include: {
            schedules: true,
          },
        },
      },
    });

    // Calculate totals and format data for frontend
    const formattedTeachers = teachers.map((teacher: any) => {
      const totalClasses = teacher.classes.length;
      const totalSchedules = teacher.classes.reduce(
        (total: number, cls: any) => total + cls.schedules.length,
        0
      );
      
      const totalPay = (teacher.salaryPerClass * totalClasses) + 
                       (teacher.extraPerSchedule * totalSchedules);

      return {
        id: teacher.id,
        teacherId: teacher.teacherId,
        name: teacher.user.name,
        email: teacher.user.email,
        image: teacher.user.image,
        totalClasses,
        totalSchedules,
        salaryPerClass: teacher.salaryPerClass,
        extraPerSchedule: teacher.extraPerSchedule,
        totalPay,
      };
    });

    return NextResponse.json({ teachers: formattedTeachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}

// PUT: Update teacher salary information
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication and authorization
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the request body
    const { teacherId, salaryPerClass, extraPerSchedule } = await req.json();

    // Validate inputs
    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Ensure salary values are numbers and not negative
    const parsedSalaryPerClass = parseFloat(salaryPerClass);
    const parsedExtraPerSchedule = parseFloat(extraPerSchedule);

    if (isNaN(parsedSalaryPerClass) || isNaN(parsedExtraPerSchedule)) {
      return NextResponse.json(
        { error: 'Salary values must be valid numbers' },
        { status: 400 }
      );
    }

    if (parsedSalaryPerClass < 0 || parsedExtraPerSchedule < 0) {
      return NextResponse.json(
        { error: 'Salary values cannot be negative' },
        { status: 400 }
      );
    }

    // Update the teacher's salary information
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        salaryPerClass: parsedSalaryPerClass,
        extraPerSchedule: parsedExtraPerSchedule,
      } as any, // Type assertion needed as schema was extended
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        classes: {
          include: {
            schedules: true,
          },
        },
      },
    });

    // Calculate totals for the updated teacher
    const totalClasses = (updatedTeacher as any).classes.length;
    const totalSchedules = (updatedTeacher as any).classes.reduce(
      (total: number, cls: any) => total + cls.schedules.length,
      0
    );
    
    const totalPay = ((updatedTeacher as any).salaryPerClass * totalClasses) + 
                     ((updatedTeacher as any).extraPerSchedule * totalSchedules);

    return NextResponse.json({
      teacher: {
        id: updatedTeacher.id,
        teacherId: updatedTeacher.teacherId,
        name: (updatedTeacher as any).user.name,
        email: (updatedTeacher as any).user.email,
        totalClasses,
        totalSchedules,
        salaryPerClass: (updatedTeacher as any).salaryPerClass,
        extraPerSchedule: (updatedTeacher as any).extraPerSchedule,
        totalPay,
      },
    });
  } catch (error) {
    console.error('Error updating teacher salary:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher salary' },
      { status: 500 }
    );
  }
}
