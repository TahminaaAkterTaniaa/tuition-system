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
  console.log('Starting registration process...');
  
  try {
    // Log environment for debugging
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database connection available:', !!prisma);
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { message: 'Invalid request body format' },
        { status: 400 }
      );
    }
    
    // Validate request body
    console.log('Validating request data...');
    const result = userSchema.safeParse(body);
    if (!result.success) {
      console.log('Validation failed:', result.error.errors);
      return NextResponse.json(
        { message: 'Invalid input data', errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password, role } = result.data;
    console.log(`Registering user with email: ${email}, role: ${role}`);
    
    // Check if user already exists
    console.log('Checking for existing user...');
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        console.log('User already exists with email:', email);
        return NextResponse.json(
          { message: 'User with this email already exists' },
          { status: 409 }
        );
      }
      console.log('No existing user found, proceeding with registration');
    } catch (dbError) {
      console.error('Error checking existing user:', dbError);
      return NextResponse.json(
        { 
          message: 'Database error while checking existing user',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    // Hash the password
    console.log('Hashing password...');
    const hashedPassword = await hash(password, 10);
    
    // Create the user
    console.log('Creating user record...');
    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
      });
      console.log('User created successfully with ID:', user.id);
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { 
          message: 'Failed to create user record',
          details: createError instanceof Error ? createError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    // Create role-specific profile based on user role
    console.log(`Creating ${role} profile...`);
    try {
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
      console.log(`${role} profile created successfully`);
    } catch (profileError) {
      console.error(`Error creating ${role} profile:`, profileError);
      // Don't return error here, as the user is already created
      // We'll log the error but still consider registration successful
    }
    
    // Return success response without exposing sensitive user data
    console.log('Registration completed successfully');
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
    // Log the full error with stack trace
    console.error('Registration error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        message: 'An error occurred during registration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
