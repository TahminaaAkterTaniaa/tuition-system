'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Define types
interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  maxScore: number;
  class: {
    id: string;
    name: string;
    subject: string;
  };
}

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher: {
    user: {
      name: string;
    };
  };
}

export default function StudentAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Fetch student's enrolled classes
  const fetchClasses = async () => {
    try {
      console.log('Fetching enrolled classes');
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch classes');
        return;
      }
      
      const response = await fetch(`/api/enrollment/direct-check?userId=${session.user.id}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.enrollments)) {
        const enrolledClasses = data.enrollments
          .filter((enrollment: any) => enrollment.status === 'enrolled')
          .map((enrollment: any) => enrollment.class);
        
        setClasses(enrolledClasses);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      toast.error('Failed to load classes');
    }
  };
  
  // Fetch assessments for all enrolled classes
  const fetchAllAssessments = async () => {
    try {
      setIsLoading(true);
      
      if (!session?.user?.id) {
        console.log('No user ID available, cannot fetch assessments');
        return;
      }
      
      // Get the student's enrolled classes
      const enrolledClassesResponse = await fetch(`/api/enrollment/direct-check?userId=${session.user.id}`);
      const enrolledClassesData = await enrolledClassesResponse.json();
      
      if (!enrolledClassesData.success || !enrolledClassesData.enrollments) {
        throw new Error('Failed to fetch enrolled classes');
      }
      
      // Extract class IDs from enrollments
      const classIds = enrolledClassesData.enrollments
        .filter((enrollment: any) => enrollment.status === 'enrolled')
        .map((enrollment: any) => enrollment.classId);
      
      if (classIds.length === 0) {
        console.log('No enrolled classes found');
        setAssessments([]);
        setFilteredAssessments([]);
        return;
      }
      
      // Fetch assessments for enrolled classes
      const assessmentsPromises = classIds.map((classId: string) => 
        fetch(`/api/student/assessments?classId=${classId}`).then(res => res.json())
      );
      
      const assessmentsResults = await Promise.all(assessmentsPromises);
      
      // Flatten and combine all assessments
      const allAssessments = assessmentsResults
        .flat()
        .filter(assessment => assessment && assessment.id);
      
      console.log('Assessments data:', allAssessments);
      
      setAssessments(allAssessments);
      setFilteredAssessments(allAssessments);
    } catch (err) {
      console.error('Error fetching assessments:', err);
      toast.error('Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Apply filters and sorting to assessments
  const applyFilters = () => {
    let filtered = [...assessments];
    
    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(assessment => assessment.class.id === selectedClass);
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(assessment => assessment.type === selectedType);
    }
    
    // Sort assessments
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'class') {
        return a.class.name.localeCompare(b.class.name);
      }
      return 0;
    });
    
    setFilteredAssessments(filtered);
  };
  
  // Handle filter changes
  useEffect(() => {
    applyFilters();
  }, [selectedClass, selectedType, sortBy, assessments]);
  
  // Initial data fetch
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'STUDENT') {
      router.push('/');
      return;
    }
    
    fetchClasses();
    fetchAllAssessments();
  }, [session, status, router]);
  
  // Get unique assessment types
  const assessmentTypes = Array.from(new Set(assessments.map(a => a.type)));
  
  // Calculate days remaining for an assessment
  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  // Determine urgency class based on days remaining
  const getUrgencyClass = (daysRemaining: number) => {
    if (daysRemaining <= 1) return 'text-red-600';
    if (daysRemaining <= 3) return 'text-yellow-600';
    return 'text-blue-600';
  };
  
  // Show loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessments</h1>
        <p className="text-gray-600">View and manage all your upcoming assessments</p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Class
            </label>
            <select
              id="classFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.subject}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              id="typeFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              {assessmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sortBy"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="dueDate">Due Date (Earliest First)</option>
              <option value="title">Title (A-Z)</option>
              <option value="class">Class Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Assessments List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredAssessments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredAssessments.map((assessment) => {
              const daysRemaining = getDaysRemaining(assessment.dueDate);
              const urgencyClass = getUrgencyClass(daysRemaining);
              
              return (
                <div key={assessment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-lg font-semibold text-gray-900">{assessment.title}</h3>
                      <p className="text-sm text-gray-600">{assessment.class.name} - {assessment.class.subject}</p>
                      {assessment.description && (
                        <p className="text-sm text-gray-500 mt-1">{assessment.description}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mb-2">
                        {assessment.type}
                      </span>
                      <p className={`text-sm font-medium ${urgencyClass}`}>
                        {daysRemaining === 0 ? 'Due Today' : 
                         daysRemaining === 1 ? 'Due Tomorrow' : 
                         daysRemaining < 0 ? 'Past Due' :
                         `Due in ${daysRemaining} days`}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(assessment.dueDate)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg">No assessments found.</p>
            <p className="text-sm mt-2">Try changing your filters or check back later.</p>
          </div>
        )}
      </div>
      
      {/* Back to Dashboard Link */}
      <div className="mt-8 text-center">
        <Link href="/student" className="text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
