'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Student {
  id: number;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'late';
  notes: string;
}

interface ClassData {
  id: string | string[] | null;
  name: string;
  schedule: string;
  room: string;
}

interface AttendanceRecord {
  id: number;
  classId: string | string[] | null;
  className: string;
  date: string;
  time: string;
  present: number;
  absent: number;
  late: number;
  students: Student[];
}

export default function MarkAttendance() {
  // Get search params to check if we're editing an existing record
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';
  const recordId = searchParams.get('recordId');
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const classId = params.id || null;
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classData, setClassData] = useState<ClassData>({
    id: classId,
    name: '',
    schedule: '',
    room: '',
  });
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: 'Emma Johnson', email: 'emma.j@example.com', status: 'present', notes: '' },
    { id: 2, name: 'Noah Williams', email: 'noah.w@example.com', status: 'present', notes: '' },
    { id: 3, name: 'Olivia Brown', email: 'olivia.b@example.com', status: 'present', notes: '' },
    { id: 4, name: 'Liam Davis', email: 'liam.d@example.com', status: 'present', notes: '' },
    { id: 5, name: 'Ava Miller', email: 'ava.m@example.com', status: 'present', notes: '' },
    { id: 6, name: 'James Wilson', email: 'james.w@example.com', status: 'present', notes: '' },
    { id: 7, name: 'Sophia Moore', email: 'sophia.m@example.com', status: 'present', notes: '' },
    { id: 8, name: 'Benjamin Taylor', email: 'benjamin.t@example.com', status: 'present', notes: '' },
    { id: 9, name: 'Isabella Anderson', email: 'isabella.a@example.com', status: 'present', notes: '' },
    { id: 10, name: 'Lucas Thomas', email: 'lucas.t@example.com', status: 'present', notes: '' }
  ]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'TEACHER') {
      router.push('/');
      return;
    }

    // If we're in edit mode, load the existing attendance record
    if (editMode && recordId) {
      const existingRecordsString = localStorage.getItem('attendanceRecords');
      if (existingRecordsString) {
        const existingRecords = JSON.parse(existingRecordsString);
        const record = existingRecords.find((r: AttendanceRecord) => r.id.toString() === recordId);
        
        if (record) {
          setDate(record.date);
          setStudents(record.students);
          setClassData({
            id: record.classId,
            name: record.className,
            schedule: '9:00 AM - 10:30 AM', // This would come from the record in a real app
            room: 'Room 101', // This would come from the record in a real app
          });
        }
      }
    } else {
      // Get class data based on classId
      const classIdNumber = typeof classId === 'string' ? parseInt(classId) : null;
      
      // Set class data based on classId
      if (classIdNumber === 1) {
        setClassData({
          id: classId,
          name: 'Advanced Mathematics',
          schedule: '9:00 AM - 10:30 AM',
          room: 'Room 101',
        });
      } else if (classIdNumber === 2) {
        setClassData({
          id: classId,
          name: 'Physics',
          schedule: '1:00 PM - 2:30 PM',
          room: 'Lab 203',
        });
      } else if (classIdNumber === 3) {
        setClassData({
          id: classId,
          name: 'Chemistry',
          schedule: '3:00 PM - 4:30 PM',
          room: 'Lab 205',
        });
      } else {
        // Default fallback if class ID doesn't match
        setClassData({
          id: classId,
          name: 'Unknown Class',
          schedule: 'Schedule not available',
          room: 'Room not available',
        });
      }
    }
    
    setIsLoading(false);
  }, [session, status, router, classId, editMode, recordId]);

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setStudents(students.map(student => 
      student.id === studentId ? { ...student, status } : student
    ));
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    setStudents(students.map(student => 
      student.id === studentId ? { ...student, notes } : student
    ));
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'late') => {
    setStudents(students.map(student => ({ ...student, status })));
  };

  // Function to save attendance data to localStorage
  const saveAttendanceData = () => {
    // Get existing attendance records from localStorage
    const existingRecordsString = localStorage.getItem('attendanceRecords');
    let existingRecords: AttendanceRecord[] = existingRecordsString ? JSON.parse(existingRecordsString) : [];
    
    // Count present, absent, and late students
    const presentCount = students.filter(s => s.status === 'present').length;
    const absentCount = students.filter(s => s.status === 'absent').length;
    const lateCount = students.filter(s => s.status === 'late').length;
    
    // Create a new attendance record
    const newRecord: AttendanceRecord = {
      id: editMode && recordId ? parseInt(recordId) : Date.now(),
      classId: classData.id,
      className: classData.name,
      date: date,
      time: new Date().toLocaleTimeString(),
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      students: students
    };
    
    // Add the new record to the existing records
    existingRecords.push(newRecord);
    
    // Save the updated records back to localStorage
    localStorage.setItem('attendanceRecords', JSON.stringify(existingRecords));
    
    return newRecord;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save attendance data
    saveAttendanceData();
    
    // Redirect back to attendance page with success message
    router.push('/teacher/attendance?updated=true');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-gray-600 mt-1">{editMode ? 'Edit Attendance' : 'Mark Attendance'} | {classData.schedule} | {classData.room}</p>
        </div>
        <div className="flex space-x-3">
          <Link 
            href={`/teacher/classes/${classId}`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
          >
            Back to Class
          </Link>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  id="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                type="button" 
                onClick={() => handleMarkAll('present')}
                className="bg-green-100 text-green-800 hover:bg-green-200 px-4 py-2 rounded-md text-sm font-medium"
              >
                Mark All Present
              </button>
              <button 
                type="button" 
                onClick={() => handleMarkAll('absent')}
                className="bg-red-100 text-red-800 hover:bg-red-200 px-4 py-2 rounded-md text-sm font-medium"
              >
                Mark All Absent
              </button>
              <button 
                type="button" 
                onClick={() => handleMarkAll('late')}
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-4 py-2 rounded-md text-sm font-medium"
              >
                Mark All Late
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-bold">{student.name.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            student.status === 'present' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          Present
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            student.status === 'absent' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'late')}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            student.status === 'late' 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="text" 
                        value={student.notes} 
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        placeholder="Add notes (optional)"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Link 
              href={`/teacher/attendance`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium mr-3"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Save Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
