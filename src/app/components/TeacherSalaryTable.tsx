import { useState, useEffect } from 'react';
import { MdEdit } from 'react-icons/md';
import { formatCurrency } from '@/lib/utils';

// Type for teacher salary data
interface TeacherSalary {
  id: string;
  teacherId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  totalClasses: number;
  totalSchedules: number;
  salaryPerClass: number;
  extraPerSchedule: number;
  totalPay: number;
}

export default function TeacherSalaryTable() {
  const [teachers, setTeachers] = useState<TeacherSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<TeacherSalary | null>(null);
  const [salaryPerClass, setSalaryPerClass] = useState(0);
  const [extraPerSchedule, setExtraPerSchedule] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/finance/teachers');
        if (!response.ok) {
          throw new Error('Failed to fetch teachers');
        }
        const data = await response.json();
        setTeachers(data.teachers);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setError('Failed to load teacher data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Handle escape key and scroll prevention for modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open edit modal
  const handleEdit = (teacher: TeacherSalary) => {
    setCurrentTeacher(teacher);
    setSalaryPerClass(teacher.salaryPerClass);
    setExtraPerSchedule(teacher.extraPerSchedule);
    setIsModalOpen(true);
  };

  // Save teacher salary changes
  const handleSave = async () => {
    if (!currentTeacher) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/finance/teachers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: currentTeacher.id,
          salaryPerClass,
          extraPerSchedule,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update teacher salary');
      }

      const data = await response.json();
      
      // Update the teachers list with the updated teacher
      setTeachers(teachers.map(teacher => 
        teacher.id === data.teacher.id ? data.teacher : teacher
      ));

      // Close modal
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating teacher salary:', err);
      alert('Failed to update salary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold mb-4 md:mb-0">Teacher Salary Management</h2>
        <div>
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-4">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Classes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Schedules</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Per Class</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Per Schedule</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {teacher.image && (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={teacher.image} 
                              alt={teacher.name || "Teacher"} 
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                          <div className="text-xs text-gray-500">ID: {teacher.teacherId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.totalClasses}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.totalSchedules}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(teacher.salaryPerClass)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(teacher.extraPerSchedule)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(teacher.totalPay)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        <MdEdit className="mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No teachers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && currentTeacher && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-all duration-300"
          onClick={() => setIsModalOpen(false)}
          style={{ 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)' 
          }}
        >
          <div 
            className="bg-white rounded-lg p-8 w-full max-w-md transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">Update Teacher Salary</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Teacher: {currentTeacher.name}</p>
              <p className="text-sm text-gray-500">ID: {currentTeacher.teacherId}</p>
            </div>
            <div className="mb-4">
              <label htmlFor="salaryPerClass" className="block text-sm font-medium text-gray-700 mb-1">
                Salary Per Class
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="salaryPerClass"
                  value={salaryPerClass}
                  onChange={(e) => setSalaryPerClass(parseFloat(e.target.value) || 0)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="extraPerSchedule" className="block text-sm font-medium text-gray-700 mb-1">
                Extra Per Schedule
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="extraPerSchedule"
                  value={extraPerSchedule}
                  onChange={(e) => setExtraPerSchedule(parseFloat(e.target.value) || 0)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
