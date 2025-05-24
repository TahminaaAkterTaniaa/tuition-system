'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number | null;
  building: string | null;
  floor: string | null;
  features: string | null;
}

interface Teacher {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

interface ClassFormData {
  name: string;
  subject: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: string;
  teacherId: string | null;
}

export default function EditClass() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    subject: '',
    description: '',
    startDate: '',
    endDate: '',
    capacity: '',
    teacherId: null,
  });
  
  // Define type for API response to ensure proper type checking
  interface ClassApiResponse {
    id: string;
    name: string;
    subject: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    capacity: number;
    teacherId: string | null;
    status: string;
  }
  
  // Fetch class data and teachers
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch class details
      const classResponse = await fetch(`/api/admin/classes/${classId}`);
      if (!classResponse.ok) {
        throw new Error('Failed to fetch class details');
      }
      
      const classData = await classResponse.json() as ClassApiResponse;
      
      // Fetch teachers for dropdown
      const teachersResponse = await fetch('/api/admin/teachers');
      if (!teachersResponse.ok) {
        throw new Error('Failed to fetch teachers');
      }
      
      const teachersData = await teachersResponse.json();
      setTeachers(teachersData);
      
      // Format dates for the form
      const startDate = classData.startDate ? new Date(classData.startDate).toISOString().split('T')[0] : ''; // Ensure date is never undefined
      const endDate = classData.endDate ? new Date(classData.endDate).toISOString().split('T')[0] : '';
      
      // Set form data with class details - ensure all properties are string type as required
      setFormData({
        name: classData.name,
        subject: classData.subject,
        description: classData.description || '',
        startDate: startDate,  // Already guaranteed to be string
        endDate: endDate,      // Already guaranteed to be string
        capacity: String(classData.capacity),
        teacherId: classData.teacherId,
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading class data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/classes/' + classId + '/edit');
      return;
    }
    
    if (session?.user.role !== 'ADMIN') {
      router.push('/');
      toast.error('Only admins can edit classes');
      return;
    }
    
    fetchData();
  }, [session, status, router, classId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'teacherId' ? (value || null) : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return false;
    }
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return false;
    }
    if (!formData.startDate) {
      toast.error('Start date is required');
      return false;
    }
    if (!formData.capacity || parseInt(formData.capacity) <= 0) {
      toast.error('Valid capacity is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          description: formData.description || null,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          capacity: parseInt(formData.capacity),
          teacherId: formData.teacherId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class');
      }
      
      toast.success('Class updated successfully');
      router.push(`/admin/classes/${classId}`);
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error.message || 'Failed to update class');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Edit Class</h1>
        <Link 
          href={`/admin/classes/${classId}`}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Cancel
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {/* Capacity */}
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity *
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            {/* Teacher */}
            <div>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
                Teacher
              </label>
              <select
                id="teacherId"
                name="teacherId"
                value={formData.teacherId || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.name} ({teacher.user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? 'Updating...' : 'Update Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
