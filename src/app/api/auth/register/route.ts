import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@/app/lib/prisma';

// Base schema for all registrations
const baseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN']),
});

// Role-specific schema extensions
const studentSchema = baseSchema.extend({
  academicLevel: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const teacherSchema = baseSchema.extend({
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.number().optional().or(z.string().optional()),
});

const parentSchema = baseSchema.extend({
  studentId: z.string().min(1, 'Student ID is required'),
  relationship: z.enum(['Father', 'Mother', 'Guardian']).default('Guardian'),
  occupation: z.string().optional(),
  alternatePhone: z.string().optional(),
});

const adminSchema = baseSchema.extend({
  department: z.string().optional(),
  accessLevel: z.enum(['standard', 'elevated', 'super']).optional().default('standard'),
});

// Combined schema with validation based on role
const userSchema = z.discriminatedUnion('role', [
  studentSchema.extend({ role: z.literal('STUDENT') }),
  teacherSchema.extend({ role: z.literal('TEACHER') }),
  parentSchema.extend({ role: z.literal('PARENT') }),
  adminSchema.extend({ role: z.literal('ADMIN') }),
]);

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
            academicLevel: body.academicLevel || undefined,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            phoneNumber: body.phoneNumber || undefined,
          },
        });
      } else if (role === 'TEACHER') {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            teacherId: `TE${Date.now().toString().slice(-6)}`,
            dateOfJoining: new Date(),
            qualification: body.qualification || undefined,
            specialization: body.specialization || undefined,
            experience: body.experience ? Number(body.experience) : undefined,
          },
        });
      } else if (role === 'PARENT') {
        // Verify that the student ID exists
        const studentIdToLink = body.studentId;
        const parentRelationship = body.relationship || 'Guardian';
        console.log(`Verifying student ID: ${studentIdToLink} for ${parentRelationship} registration`);
        
        try {
          const existingStudent = await prisma.student.findUnique({
            where: { studentId: studentIdToLink },
            include: {
              parentStudents: {
                include: {
                  parent: true
                }
              }
            }
          });
          
          if (!existingStudent) {
            console.error(`Student with ID ${studentIdToLink} not found`);
            return NextResponse.json(
              { message: `Student with ID ${studentIdToLink} not found. Please check the ID and try again.` },
              { status: 400 }
            );
          }
          
          console.log(`Found student with ID ${studentIdToLink}`);
          
          // Check if a parent with the same relationship already exists for this student
          if (parentRelationship === 'Father' || parentRelationship === 'Mother') {
            const existingParentWithSameRelationship = existingStudent.parentStudents.find(
              ps => ps.relationship === parentRelationship
            );
            
            if (existingParentWithSameRelationship) {
              console.error(`Student already has a ${parentRelationship} registered`);
              return NextResponse.json(
                { message: `This student is already linked to a ${parentRelationship}. Only one ${parentRelationship} can be registered per student.` },
                { status: 409 }
              );
            }
          }
          
          // Create parent profile
          const parent = await prisma.parent.create({
            data: {
              userId: user.id,
              parentId: `PA${Date.now().toString().slice(-6)}`,
              relationship: parentRelationship,
              occupation: body.occupation || undefined,
              alternatePhone: body.alternatePhone || undefined,
            },
          });
          
          // Create parent-student relationship
          await prisma.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: existingStudent.id,
              relationship: parentRelationship,
              isPrimary: true,
            },
          });
          
          console.log(`Created parent-student relationship (${parentRelationship}) for student ${studentIdToLink}`);
        } catch (error) {
          console.error('Error linking parent to student:', error);
          throw error; // Let the outer catch block handle this
        }
      } else if (role === 'ADMIN') {
        await prisma.admin.create({
          data: {
            userId: user.id,
            adminId: `AD${Date.now().toString().slice(-6)}`,
            department: body.department || undefined,
            accessLevel: body.accessLevel || 'standard',
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
