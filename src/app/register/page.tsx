'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import axios from 'axios';

// Base schema for all registrations
const baseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']),
});

// Role-specific schema extensions
const studentSchema = baseSchema.extend({
  academicLevel: z.string().min(1, 'Academic level is required'),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const teacherSchema = baseSchema.extend({
  qualification: z.string().min(1, 'Qualification is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  experience: z.string().min(1, 'Experience is required'),
});

const parentSchema = baseSchema.extend({
  relationship: z.string().min(1, 'Relationship is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  occupation: z.string().optional(),
  alternatePhone: z.string().optional(),
});

const adminSchema = baseSchema.extend({
  department: z.string().min(1, 'Department is required'),
  accessLevel: z.enum(['standard', 'elevated', 'super']).default('standard'),
});

// Combined schema with conditional validation based on role
const registerSchema = z.discriminatedUnion('role', [
  studentSchema.omit({ role: true }).extend({ role: z.literal('STUDENT') }),
  teacherSchema.omit({ role: true }).extend({ role: z.literal('TEACHER') }),
  parentSchema.omit({ role: true }).extend({ role: z.literal('PARENT') }),
  adminSchema.omit({ role: true }).extend({ role: z.literal('ADMIN') }),
]).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Type for the form data
type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN'>('STUDENT');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT',
      academicLevel: '',
    } as any,
  });
  
  // Watch for role changes to update the form
  const role = watch('role');
  
  // Reset form fields when role changes
  useEffect(() => {
    if (role !== selectedRole) {
      setSelectedRole(role as any);
      // Reset form with new role but keep name, email and password
      const currentData = watch();
      reset({
        ...currentData,
        role: role,
      } as any);
    }
  }, [role, selectedRole, reset, watch]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use type-safe approach based on role discriminated union
      let registrationData;
      
      switch (data.role) {
        case 'STUDENT':
          registrationData = {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            academicLevel: data.academicLevel,
            dateOfBirth: data.dateOfBirth,
            phoneNumber: data.phoneNumber,
          };
          break;
          
        case 'TEACHER':
          registrationData = {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            qualification: data.qualification,
            specialization: data.specialization,
            experience: data.experience,
          };
          break;
          
        case 'PARENT':
          registrationData = {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            relationship: data.relationship,
            studentId: data.studentId,
            occupation: data.occupation,
            alternatePhone: data.alternatePhone,
          };
          break;
          
        case 'ADMIN':
          registrationData = {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            department: data.department,
            accessLevel: data.accessLevel,
          };
          break;
      }
      
      const response = await axios.post('/api/auth/register', registrationData);
      
      if (response.status === 201) {
        // Registration successful, redirect to login
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 shadow-lg sm:rounded-xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    {...register('name')}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password')}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Register as
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'].map((roleOption) => (
                    <div key={roleOption} className="relative">
                      <input
                        type="radio"
                        id={`role-${roleOption}`}
                        value={roleOption}
                        {...register('role')}
                        className="sr-only"
                        checked={watch('role') === roleOption}
                      />
                      <label
                        htmlFor={`role-${roleOption}`}
                        className={`
                          flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer text-sm font-medium
                          ${watch('role') === roleOption 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                        `}
                      >
                        {roleOption === 'STUDENT' && 'Student'}
                        {roleOption === 'TEACHER' && 'Teacher'}
                        {roleOption === 'PARENT' && 'Parent'}
                        {roleOption === 'ADMIN' && 'Administrator'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Role-specific fields */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                {selectedRole === 'STUDENT' && 'Student Information'}
                {selectedRole === 'TEACHER' && 'Teacher Information'}
                {selectedRole === 'PARENT' && 'Parent Information'}
                {selectedRole === 'ADMIN' && 'Administrator Information'}
              </h3>
              
              {/* Student-specific fields */}
              {selectedRole === 'STUDENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <label htmlFor="academicLevel" className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="academicLevel"
                      {...register('academicLevel')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Academic Level</option>
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                      <option value="Higher Secondary">Higher Secondary</option>
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                    {errors.academicLevel && (
                      <p className="text-red-500 text-xs mt-1">{errors.academicLevel.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      {...register('phoneNumber')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              )}
              
              {/* Teacher-specific fields */}
              {selectedRole === 'TEACHER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="qualification" className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="qualification"
                      type="text"
                      {...register('qualification')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., M.Sc. in Mathematics"
                    />
                    {errors.qualification && (
                      <p className="text-red-500 text-xs mt-1">{errors.qualification.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="specialization"
                      type="text"
                      {...register('specialization')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., Calculus, Algebra"
                    />
                    {errors.specialization && (
                      <p className="text-red-500 text-xs mt-1">{errors.specialization.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="experience"
                      type="text"
                      {...register('experience')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., 5 years teaching high school mathematics"
                    />
                    {errors.experience && (
                      <p className="text-red-500 text-xs mt-1">{errors.experience.message}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Parent-specific fields */}
              {selectedRole === 'PARENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      {...register('studentId')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., ST123456"
                    />
                    {errors.studentId && (
                      <p className="text-red-500 text-xs mt-1">{errors.studentId.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your child's Student ID to link your account. You can find this ID on their enrollment documents.
                    </p>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship to Student <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="relationship"
                      {...register('relationship')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Relationship</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.relationship && (
                      <p className="text-red-500 text-xs mt-1">{errors.relationship.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                      Occupation
                    </label>
                    <input
                      id="occupation"
                      type="text"
                      {...register('occupation')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Occupation"
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="alternatePhone" className="block text-sm font-medium text-gray-700 mb-1">
                      Alternate Phone Number
                    </label>
                    <input
                      id="alternatePhone"
                      type="tel"
                      {...register('alternatePhone')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Alternate Phone Number"
                    />
                  </div>
                </div>
              )}
              
              {/* Admin-specific fields */}
              {selectedRole === 'ADMIN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      id="department"
                      {...register('department')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Department</option>
                      <option value="Administration">Administration</option>
                      <option value="Academic Affairs">Academic Affairs</option>
                      <option value="Student Services">Student Services</option>
                      <option value="Finance">Finance</option>
                      <option value="IT">IT</option>
                    </select>
                    {errors.department && (
                      <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="accessLevel" className="block text-sm font-medium text-gray-700 mb-1">
                      Access Level
                    </label>
                    <select
                      id="accessLevel"
                      {...register('accessLevel')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="standard">Standard</option>
                      <option value="elevated">Elevated</option>
                      <option value="super">Super Admin</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
