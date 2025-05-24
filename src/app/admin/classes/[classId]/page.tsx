'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import TeacherProfileModal from '@/app/components/TeacherProfileModal';
import StudentProfileModal from '@/app/components/StudentProfileModal';

interface Student {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface Teacher {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface Enrollment {
  id: string;
  status: string;
  enrollmentDate: string;
  student: Student;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface ClassSchedule {
  id: string;
  day: string;
  time: string;
  timeSlotId?: string;
  roomId: string | null;
  room: {
    id: string;
    name: string;
    capacity: number;
  } | null;
  timeSlot?: TimeSlot;
}

interface ClassDetails {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  teacherId: string | null;
  teacher: Teacher | null;
  enrollments: Enrollment[];
  schedules?: ClassSchedule[];
}

export default function ClassDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;
  
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [rooms, setRooms] = useState<{id: string, name: string}[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [scheduleForm, setScheduleForm] = useState<{
    id?: string;
    day: string;
    timeSlotId: string;
    roomId: string;
  }>({
    day: '',
    timeSlotId: '',
    roomId: ''
  });

  // Function to handle student removal from class
  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove student');
      }
      
      // Remove the student from the list
      setClassDetails(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          enrollments: prev.enrollments.filter(e => e.id !== enrollmentId)
        };
      });
      
      toast.success(`${studentName} has been removed from the class`);
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error(error.message || 'Failed to remove student');
    }
  };
  
  // Function to fetch class details
  const fetchClassDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/classes/${classId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch class details');
      }
      
      const data = await response.json();
      setClassDetails(data);
      
      // Fetch schedules
      const schedulesResponse = await fetch(`/api/admin/classes/${classId}/schedules`);
      
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setSchedules(schedulesData);
      }
      
      // Fetch available rooms
      const roomsResponse = await fetch('/api/admin/rooms');
      
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
      }

      // Fetch available time slots
      const timeSlotsResponse = await fetch('/api/admin/timeslots');
      
      if (timeSlotsResponse.ok) {
        const timeSlotsData = await timeSlotsResponse.json();
        setTimeSlots(timeSlotsData);
      }
    } catch (error) {
      console.error('Error fetching class details:', error);
      toast.error('Failed to load class details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication and fetch data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/classes/' + classId);
      return;
    }
    
    if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN') {
        router.push('/');
        toast.error('You do not have permission to view this page');
        return;
      }
      
      fetchClassDetails();
    }
  }, [status, session, classId, router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle schedule form change
  const handleScheduleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear previous error when form is changed
    if (scheduleError) {
      setScheduleError('');
    }
  };

  // Handle schedule form submission
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setScheduleError('');
    
    try {
      // Basic validation
      if (!scheduleForm.day || !scheduleForm.timeSlotId) {
        setScheduleError('Please select a day and time slot');
        return;
      }
      
      // Find the selected time slot to get start/end times
      const selectedTimeSlot = timeSlots.find(ts => ts.id === scheduleForm.timeSlotId);
      
      if (!selectedTimeSlot) {
        setScheduleError('Invalid time slot selected');
        return;
      }
      
      const payload = {
        day: scheduleForm.day,
        timeSlotId: scheduleForm.timeSlotId,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        roomId: scheduleForm.roomId || null
      };
      
      const response = await fetch(`/api/admin/classes/${classId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create schedule');
      }
      
      // Add the new schedule to the list
      setSchedules(prev => [...prev, data]);
      
      // Reset form and hide it
      setScheduleForm({
        day: '',
        timeSlotId: '',
        roomId: ''
      });
      setShowScheduleForm(false);
      toast.success('Schedule created successfully');
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      setScheduleError(error.message || 'Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: ClassSchedule) => {
    // Set form values with the selected schedule
    setScheduleForm({
      id: schedule.id,
      day: schedule.day,
      timeSlotId: schedule.timeSlotId || '',
      roomId: schedule.roomId || ''
    });
    
    // Show the form
    setShowScheduleForm(true);
  };
  

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/classes/${classId}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete schedule');
      }
      
      // Remove the deleted schedule from the list
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Schedule deleted successfully');
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error(error.message || 'Failed to delete schedule');
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

  if (!classDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Class Not Found</h2>
          <p className="text-gray-600 mb-4">The class you are looking for does not exist or you do not have permission to view it.</p>
          <Link href="/classes" className="text-indigo-600 hover:text-indigo-800">
            Return to Classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with class name and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{classDetails.name}</h1>
          <div className="mt-1 flex items-center">
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium mr-2">
              {classDetails.subject}
            </span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
              classDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {classDetails.status.charAt(0).toUpperCase() + classDetails.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link href={`/admin/classes/${classId}/edit`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Edit Class
          </Link>
          <Link href="/admin/timetable" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            View in Timetable
          </Link>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Class Details
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Enrolled Students ({classDetails.enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'schedule' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Class Details Tab */}
        {activeTab === 'details' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column - Basic details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                    <p className="mt-1 text-gray-900">{classDetails.subject}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1 text-gray-900">{classDetails.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Capacity</h3>
                    <p className="mt-1 text-gray-900">{classDetails.capacity} students</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Current Enrollment</h3>
                    <p className="mt-1 text-gray-900">{classDetails.enrollments.length} / {classDetails.capacity}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                    <p className="mt-1 text-gray-900">{formatDate(classDetails.startDate)}</p>
                  </div>
                  {classDetails.endDate && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                      <p className="mt-1 text-gray-900">{formatDate(classDetails.endDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column - Teacher information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Teacher Information</h2>
                {classDetails.teacher ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{classDetails.teacher.user?.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{classDetails.teacher.user?.email || 'No email available'}</p>
                      </div>
                    </div>
                    <div className="flex mt-4">
                      <button 
                        onClick={() => {
                          if (classDetails.teacher?.id) {
                            setSelectedTeacherId(classDetails.teacher.id);
                            setShowTeacherModal(true);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View Teacher Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-yellow-700">No teacher assigned to this class.</p>
                    <button className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      Assign Teacher
                    </button>
                  </div>
                )}

                {/* Room information */}
                <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Room Information</h2>
                {schedules.length > 0 && schedules.some(s => s.room) ? (
                  <div className="space-y-4">
                    {schedules.map((schedule) => (
                      schedule.room && (
                        <div key={schedule.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h3 className="font-medium text-gray-900">{schedule.room.name}</h3>
                          <p className="text-sm text-gray-500">Capacity: {schedule.room.capacity} students</p>
                          <p className="text-sm text-gray-700 mt-2">
                            {schedule.day} • {schedule.timeSlot ? `${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime}` : schedule.time}
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-yellow-700">No room assigned to this class.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enrolled Students Tab */}
        {activeTab === 'students' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                {classDetails.enrollments.length} / {classDetails.capacity}
              </span>
            </div>

            {classDetails.enrollments.length === 0 ? (
              <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                <p className="text-gray-700">No students enrolled in this class yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enrollment Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classDetails.enrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {enrollment.student.user.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {enrollment.student.user.email || 'No email'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(enrollment.enrollmentDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                            enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            onClick={() => {
                              setSelectedStudentId(enrollment.student.id);
                              setShowStudentModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                          >
                            View Profile
                          </button>
                          <button 
                            onClick={() => handleRemoveStudent(enrollment.id, enrollment.student.user.name || 'Student')}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Class Schedule</h2>
              <button 
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm rounded-md font-medium transition-colors"
              >
                {showScheduleForm ? 'Cancel' : 'Add Schedule'}
              </button>
            </div>
            
            {/* Schedule Form */}
            {showScheduleForm && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {scheduleForm.id ? 'Edit Schedule' : 'Add New Schedule'}
                </h3>
                
                {scheduleError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    {scheduleError}
                  </div>
                )}
                
                <form onSubmit={handleScheduleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">
                        Day <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="day"
                        name="day"
                        value={scheduleForm.day}
                        onChange={handleScheduleFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Select a day</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                        Room
                      </label>
                      <select
                        id="roomId"
                        name="roomId"
                        value={scheduleForm.roomId}
                        onChange={handleScheduleFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a room (optional)</option>
                        {rooms.map(room => (
                          <option key={room.id} value={room.id}>{room.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="timeSlotId" className="block text-sm font-medium text-gray-700 mb-1">
                        Time Slot <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="timeSlotId"
                        name="timeSlotId"
                        value={scheduleForm.timeSlotId}
                        onChange={handleScheduleFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Select a time slot</option>
                        {timeSlots.map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.label} ({slot.startTime} - {slot.endTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:bg-indigo-400"
                    >
                      {isSubmitting ? 'Saving...' : scheduleForm.id ? 'Update Schedule' : 'Add Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {schedules.length === 0 && !showScheduleForm ? (
              <div className="bg-yellow-50 p-6 text-center rounded-lg border border-yellow-200">
                <p className="text-yellow-700 mb-2">No schedule has been set for this class.</p>
                <button 
                  onClick={() => setShowScheduleForm(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Add your first schedule
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Room
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {schedule.day}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {schedule.timeSlot ? `${schedule.timeSlot.label} (${schedule.timeSlot.startTime} - ${schedule.timeSlot.endTime})` : schedule.time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {schedule.room ? schedule.room.name : 'No room assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button 
                              onClick={() => handleEditSchedule(schedule)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Teacher Profile Modal */}
      {showTeacherModal && selectedTeacherId && (
        <TeacherProfileModal 
          teacherId={selectedTeacherId} 
          isOpen={showTeacherModal}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* Student Profile Modal */}
      {showStudentModal && selectedStudentId && (
        <StudentProfileModal
          studentId={selectedStudentId}
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
        />
      )}
    </div>
  );
}
