import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@/app/lib/prisma';

// Schema for user registration validation
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const result = userSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password, role } = result.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const hashedPassword = await hash(password, 10);
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });
    
    // Create role-specific profile based on user role
    if (role === 'STUDENT') {
      await prisma.student.create({
        data: {
          userId: user.id,
          studentId: `ST${Date.now().toString().slice(-6)}`,
          enrollmentDate: new Date(),
        },
      });
    } else if (role === 'TEACHER') {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          teacherId: `TE${Date.now().toString().slice(-6)}`,
          dateOfJoining: new Date(),
        },
      });
    } else if (role === 'PARENT') {
      await prisma.parent.create({
        data: {
          userId: user.id,
          parentId: `PA${Date.now().toString().slice(-6)}`,
        },
      });
    } else if (role === 'ADMIN') {
      await prisma.admin.create({
        data: {
          userId: user.id,
          adminId: `AD${Date.now().toString().slice(-6)}`,
        },
      });
    }
    
    // Return success response without exposing sensitive user data
    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
