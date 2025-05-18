'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

type ProfileData = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  // Common fields
  phoneNumber?: string;
  address?: string;
  // Student specific
  studentId?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  academicLevel?: string;
  enrollmentDate?: string;
  // Teacher specific
  teacherId?: string;
  qualification?: string;
  specialization?: string;
  experience?: number;
  dateOfJoining?: string;
  // Parent specific
  parentId?: string;
  relationship?: string;
  occupation?: string;
  alternatePhone?: string;
  // Admin specific
  adminId?: string;
  department?: string;
  accessLevel?: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/profile/${session.user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        
        const data = await response.json();
        setProfileData(data.profile);
        setFormData(data.profile);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user?.id) {
      fetchProfileData();
    }
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/${session?.user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      setProfileData(data.profile);
      setIsEditing(false);
      setUpdateSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Edit Profile
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEditing(false);
              setFormData(profileData || {});
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>

      {updateSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Profile updated successfully!</span>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            
            {/* Conditional fields based on user role */}
            {session?.user?.role === 'STUDENT' && (
              <>
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    name="studentId"
                    value={formData.studentId || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth?.split('T')[0] || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="academicLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Level
                  </label>
                  <input
                    type="text"
                    id="academicLevel"
                    name="academicLevel"
                    value={formData.academicLevel || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
            
            {session?.user?.role === 'TEACHER' && (
              <>
                <div>
                  <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher ID
                  </label>
                  <input
                    type="text"
                    id="teacherId"
                    name="teacherId"
                    value={formData.teacherId || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                
                <div>
                  <label htmlFor="qualification" className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    id="qualification"
                    name="qualification"
                    value={formData.qualification || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    id="specialization"
                    name="specialization"
                    value={formData.specialization || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (years)
                  </label>
                  <input
                    type="number"
                    id="experience"
                    name="experience"
                    value={formData.experience || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
            
            {session?.user?.role === 'PARENT' && (
              <>
                <div>
                  <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent ID
                  </label>
                  <input
                    type="text"
                    id="parentId"
                    name="parentId"
                    value={formData.parentId || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                
                <div>
                  <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship to Student
                  </label>
                  <input
                    type="text"
                    id="relationship"
                    name="relationship"
                    value={formData.relationship || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    id="occupation"
                    name="occupation"
                    value={formData.occupation || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="alternatePhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="text"
                    id="alternatePhone"
                    name="alternatePhone"
                    value={formData.alternatePhone || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
            
            {session?.user?.role === 'ADMIN' && (
              <>
                <div>
                  <label htmlFor="adminId" className="block text-sm font-medium text-gray-700 mb-1">
                    Admin ID
                  </label>
                  <input
                    type="text"
                    id="adminId"
                    name="adminId"
                    value={formData.adminId || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="accessLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Level
                  </label>
                  <input
                    type="text"
                    id="accessLevel"
                    name="accessLevel"
                    value={formData.accessLevel || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2 flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden">
              {profileData?.image ? (
                <Image
                  src={profileData.image}
                  alt={profileData.name || 'User'}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                  <span className="text-2xl font-bold">{profileData?.name?.charAt(0) || 'U'}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{profileData?.name}</h3>
              <p className="text-gray-600">{profileData?.email}</p>
              <p className="text-sm text-indigo-600 capitalize">{profileData?.role?.toLowerCase()}</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">Personal Information</h4>
            <div className="space-y-2">
              {session?.user?.role === 'STUDENT' && (
                <>
                  <p className="text-sm"><span className="font-medium text-gray-500">Student ID:</span> {profileData?.studentId}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Date of Birth:</span> {profileData?.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Academic Level:</span> {profileData?.academicLevel || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Enrollment Date:</span> {profileData?.enrollmentDate ? new Date(profileData.enrollmentDate).toLocaleDateString() : 'Not set'}</p>
                </>
              )}
              
              {session?.user?.role === 'TEACHER' && (
                <>
                  <p className="text-sm"><span className="font-medium text-gray-500">Teacher ID:</span> {profileData?.teacherId}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Qualification:</span> {profileData?.qualification || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Specialization:</span> {profileData?.specialization || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Experience:</span> {profileData?.experience ? `${profileData.experience} years` : 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Joined On:</span> {profileData?.dateOfJoining ? new Date(profileData.dateOfJoining).toLocaleDateString() : 'Not set'}</p>
                </>
              )}
              
              {session?.user?.role === 'PARENT' && (
                <>
                  <p className="text-sm"><span className="font-medium text-gray-500">Parent ID:</span> {profileData?.parentId}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Relationship:</span> {profileData?.relationship || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Occupation:</span> {profileData?.occupation || 'Not set'}</p>
                </>
              )}
              
              {session?.user?.role === 'ADMIN' && (
                <>
                  <p className="text-sm"><span className="font-medium text-gray-500">Admin ID:</span> {profileData?.adminId}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Department:</span> {profileData?.department || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Access Level:</span> {profileData?.accessLevel || 'Standard'}</p>
                </>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">Contact Information</h4>
            <div className="space-y-2">
              <p className="text-sm"><span className="font-medium text-gray-500">Email:</span> {profileData?.email}</p>
              <p className="text-sm"><span className="font-medium text-gray-500">Phone:</span> {profileData?.phoneNumber || 'Not set'}</p>
              {session?.user?.role === 'STUDENT' && (
                <>
                  <p className="text-sm"><span className="font-medium text-gray-500">Address:</span> {profileData?.address || 'Not set'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-500">Emergency Contact:</span> {profileData?.emergencyContact || 'Not set'}</p>
                </>
              )}
              {session?.user?.role === 'PARENT' && (
                <p className="text-sm"><span className="font-medium text-gray-500">Alternate Phone:</span> {profileData?.alternatePhone || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
