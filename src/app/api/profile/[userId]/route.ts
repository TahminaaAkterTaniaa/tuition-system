import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// Using the shared Prisma client instance from @/app/lib/prisma

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = params.userId;
    
    // Check if the user is requesting their own profile or is an admin
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get role-specific profile data
    let roleSpecificData = {};
    
    switch (user.role) {
      case 'STUDENT':
        const student = await prisma.student.findUnique({
          where: { userId },
        });
        roleSpecificData = student || {};
        break;
      case 'TEACHER':
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
        });
        roleSpecificData = teacher || {};
        break;
      case 'PARENT':
        const parent = await prisma.parent.findUnique({
          where: { userId },
        });
        roleSpecificData = parent || {};
        break;
      case 'ADMIN':
        const admin = await prisma.admin.findUnique({
          where: { userId },
        });
        roleSpecificData = admin || {};
        break;
    }
    
    // Combine user data with role-specific data
    const profileData = {
      ...user,
      ...roleSpecificData,
    };
    
    return NextResponse.json({ profile: profileData });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = params.userId;
    
    // Check if the user is updating their own profile or is an admin
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        // Don't allow email updates through this endpoint for security
      },
    });
    
    // Update role-specific profile data
    let roleSpecificData = {};
    
    switch (user.role) {
      case 'STUDENT':
        const student = await prisma.student.update({
          where: { userId },
          data: {
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            address: data.address,
            phoneNumber: data.phoneNumber,
            emergencyContact: data.emergencyContact,
            academicLevel: data.academicLevel,
          },
        });
        roleSpecificData = student;
        break;
      case 'TEACHER':
        const teacher = await prisma.teacher.update({
          where: { userId },
          data: {
            qualification: data.qualification,
            specialization: data.specialization,
            experience: data.experience ? parseInt(data.experience) : undefined,
            // Add other teacher-specific fields as needed
          },
        });
        roleSpecificData = teacher;
        break;
      case 'PARENT':
        const parent = await prisma.parent.update({
          where: { userId },
          data: {
            relationship: data.relationship,
            occupation: data.occupation,
            alternatePhone: data.alternatePhone,
            // Add other parent-specific fields as needed
          },
        });
        roleSpecificData = parent;
        break;
      case 'ADMIN':
        const admin = await prisma.admin.update({
          where: { userId },
          data: {
            department: data.department,
            // Don't allow access level updates through this endpoint for security
          },
        });
        roleSpecificData = admin;
        break;
    }
    
    // Combine updated user data with role-specific data
    const profileData = {
      ...updatedUser,
      ...roleSpecificData,
    };
    
    return NextResponse.json({ profile: profileData });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile data' },
      { status: 500 }
    );
  }
}
