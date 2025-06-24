'use client';

import React from 'react';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  capacity: number;
  room: string | null;
  status: string;
  teacher: {
    user: {
      name: string | null;
      id?: string;
    } | null;
  } | null;
  enrolledCount: number;
  availableSeats: number;
  isFull: boolean;
  enrollmentStatus: string | null;
  roomDisplay?: string;
  schedulesDisplay?: string;
  roomDetails?: {
    id: string;
    name: string;
    capacity: number | null;
    building: string | null;
    floor: string | null;
    features: string | null;
  } | null;
}

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassItem | null;
  teacherName?: string;
}

const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({ isOpen, onClose, classData, teacherName }) => {
  if (!isOpen || !classData) return null;
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Helper function to get room display from various property formats
  const getRoomDisplay = (classItem: any): string => {
    // Option 1: roomDisplay property (from student classes API)
    if (classItem.roomDisplay) {
      return classItem.roomDisplay;
    }
    
    // Option 2: formattedRoom property (from student classes page)
    if (classItem.formattedRoom) {
      return classItem.formattedRoom;
    }
    
    // Option 3: roomDetails object (from general classes API)
    if (classItem.roomDetails) {
      const room = classItem.roomDetails;
      return room.building ? `${room.name} (${room.building})` : room.name;
    }
    
    // Option 4: Legacy room property
    if (classItem.room && typeof classItem.room === 'string') {
      return classItem.room;
    }
    
    // Fallback
    return 'Not assigned';
  };
  
  // Helper function to get schedule display from various property formats
  const getScheduleDisplay = (classItem: any): string => {
    // Option 1: schedulesDisplay property (from student classes API)
    if (classItem.schedulesDisplay) {
      return classItem.schedulesDisplay;
    }
    
    // Option 2: schedule property (from general classes API)
    if (classItem.schedule) {
      return classItem.schedule;
    }
    
    // Fallback
    return 'Not scheduled';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto backdrop-blur-sm bg-black/30">
      <div className="relative w-full max-w-2xl mx-auto my-6">
        {/* Modal content */}
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-200 rounded-t">
            <h3 className="text-2xl font-semibold text-gray-900">
              {classData.name}
            </h3>
            <button
              onClick={onClose}
              className="p-1 ml-auto bg-transparent border-0 text-gray-600 hover:text-gray-900 float-right text-3xl leading-none font-semibold"
            >
              <span className="text-gray-600 h-6 w-6 text-2xl block">×</span>
            </button>
          </div>
          
          {/* Body */}
          <div className="relative p-6 flex-auto">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-full">
                {classData.subject}
              </span>
              {classData.status && (
                <span className={`ml-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  classData.status === 'active' ? 'bg-green-100 text-green-800' : 
                  classData.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {classData.status.charAt(0).toUpperCase() + classData.status.slice(1)}
                </span>
              )}
            </div>
            
            {classData.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700">{classData.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Teacher</h4>
                <p className="text-gray-700">
                  {/* Display teacher name from prop or fallback */}
                  {teacherName || classData.teacher?.user?.name || 'Not assigned'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Room</h4>
                <p className="text-gray-700">{getRoomDisplay(classData)}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Schedule</h4>
                <p className="text-gray-700">{getScheduleDisplay(classData)}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Capacity</h4>
                <p className="text-gray-700">
                  {classData.enrolledCount} / {classData.capacity} students
                  {classData.isFull && <span className="ml-2 text-red-600 text-xs font-medium">(Full)</span>}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
                <p className="text-gray-700">{formatDate(classData.startDate)}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">End Date</h4>
                <p className="text-gray-700">{formatDate(classData.endDate)}</p>
              </div>
            </div>
            
            {classData.roomDetails?.features && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Room Features</h4>
                <p className="text-gray-700">{classData.roomDetails.features}</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200 rounded-b">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailsModal;
