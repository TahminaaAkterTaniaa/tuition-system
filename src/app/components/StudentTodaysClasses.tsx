"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCalendarStore } from "@/app/lib/store/calendarStore";

type StudentClassData = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  startTime: string | null;
  endTime: string | null;
  teacher: string;
};

export default function StudentTodaysClasses() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<StudentClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get selected date from global state
  const { selectedDate } = useCalendarStore();

  useEffect(() => {
    const fetchSelectedDateClasses = async () => {
      try {
        setLoading(true);
        // Format the selected date for the API using local date (avoiding timezone issues)
        const dateParam = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        
        // Debug logging to verify date consistency
        console.log(`StudentTodaysClasses: Selected date: ${selectedDate.toString()}`);
        console.log(`StudentTodaysClasses: API param: ${dateParam}`);
        
        const response = await fetch(`/api/student/classes/today?date=${dateParam}`);

        if (!response.ok) {
          throw new Error("Failed to fetch classes for selected date");
        }

        const data = await response.json();
        const classesData = data?.classes || [];

        // Format classes for display
        const formattedClasses = classesData.map((classItem: any) => ({
          id: classItem.id,
          name: classItem.name,
          subject: classItem.subject,
          schedule: classItem.schedule,
          room: classItem.room,
          startTime: classItem.startTime,
          endTime: classItem.endTime,
          teacher: classItem.teacher,
        }));

        setClasses(formattedClasses);
      } catch (err) {
        console.error("Error fetching classes for selected date:", err);
        setError("Failed to load classes for selected date. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchSelectedDateClasses();
    }
  }, [session, selectedDate]); // Add selectedDate as dependency

  // Helper function to format the selected date
  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today's Classes";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow's Classes";
    } else {
      return `Classes for ${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
  };

  const getSelectedDateSubtext = (date: Date): string => {
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return "Your classes for today";
    } else {
      return `Your classes for ${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          {formatSelectedDate(selectedDate)}
        </h2>
        <p className="text-sm text-gray-600 mb-6">{getSelectedDateSubtext(selectedDate)}</p>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          {formatSelectedDate(selectedDate)}
        </h2>
        <p className="text-sm text-gray-600 mb-6">{getSelectedDateSubtext(selectedDate)}</p>
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          {formatSelectedDate(selectedDate)}
        </h2>
        <p className="text-sm text-gray-600 mb-6">{getSelectedDateSubtext(selectedDate)}</p>
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-500">
            {isToday ? "No classes scheduled for today" : `No classes scheduled for this date`}
          </h3>
          <p className="text-gray-500 mt-1">
            {isToday ? "Enjoy your day off!" : "Select another date to view classes"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2 text-gray-900">
        {formatSelectedDate(selectedDate)}
      </h2>
      <p className="text-sm text-gray-600 mb-6">{getSelectedDateSubtext(selectedDate)}</p>

      <div className="space-y-4">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {classItem.name}
                </h3>
                <p className="text-sm text-gray-600">{classItem.subject}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-600">
                  {classItem.startTime}
                  {classItem.endTime && (
                    <span className="text-sm font-normal text-gray-500">
                      - {classItem.endTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {classItem.room}
              </div>
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {classItem.teacher}
              </div>
            </div>
          </div>
        ))}
      </div>

      {classes.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/student/classes"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View All Classes →
          </Link>
        </div>
      )}
    </div>
  );
}