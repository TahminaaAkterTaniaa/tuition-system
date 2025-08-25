"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCalendarStore } from "@/app/lib/store/calendarStore";

type CalendarClass = {
  id: string;
  name: string;
  subject: string;
  startTime: string;
  endTime?: string;
  room: string;
  date: string;
};

type CalendarDay = {
  date: number;
  isCurrentMonth: boolean;
  classes: CalendarClass[];
};

export default function MonthlyCalendar() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [allClasses, setAllClasses] = useState<CalendarClass[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected date from global state
  const { selectedDate, setSelectedDate } = useCalendarStore();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    const fetchMonthlyClasses = async () => {
      try {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const response = await fetch(
          `/api/teacher/classes?year=${year}&month=${month}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch monthly classes");
        }

        const data = await response.json();
        const classesData = data?.classes || [];

        setAllClasses(classesData);
        generateCalendarDays(classesData, year, month);
      } catch (err) {
        console.error("Error fetching monthly classes:", err);
        setError("Failed to load calendar. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchMonthlyClasses();
    }
  }, [session, currentDate]);

  // Regenerate calendar when filter changes
  useEffect(() => {
    if (allClasses.length > 0) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      generateCalendarDays(allClasses, year, month);
    }
  }, [selectedFilter, allClasses, currentDate]);

  const generateCalendarDays = (
    classesData: CalendarClass[],
    year: number,
    month: number
  ) => {
    // Filter classes based on selected filter
    const filteredClasses =
      selectedFilter === "all"
        ? classesData
        : classesData.filter((cls) => {
            return (
              cls.subject === selectedFilter || cls.name === selectedFilter
            );
          });

    // Generate calendar days
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: CalendarDay[] = [];

    // Previous month's trailing days
    const prevMonth = new Date(year, month - 2, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        classes: [],
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayClasses = filteredClasses.filter((cls: any) => {
        const classDate = new Date(cls.date);
        return (
          classDate.getDate() === day &&
          classDate.getMonth() === month - 1 &&
          classDate.getFullYear() === year
        );
      });

      days.push({
        date: day,
        isCurrentMonth: true,
        classes: dayClasses,
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        isCurrentMonth: false,
        classes: [],
      });
    }

    setCalendarDays(days);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getFilterOptions = () => {
    const uniqueSubjects = Array.from(
      new Set(allClasses.map((cls) => cls.subject))
    );
    const uniqueClasses = Array.from(
      new Set(allClasses.map((cls) => cls.name))
    );

    const options = [{ value: "all", label: "All Subjects" }];

    // Add subjects
    uniqueSubjects.forEach((subject) => {
      options.push({ value: subject, label: subject });
    });

    return options;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFilter(e.target.value);
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return; // Don't allow clicking on dates from other months

    // Create date for the clicked day
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day.date
    );

    // Update the selected date in global state
    setSelectedDate(clickedDate);
  };

  const isDateSelected = (day: CalendarDay): boolean => {
    if (!day.isCurrentMonth) return false;

    const dayDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day.date
    );

    return dayDate.toDateString() === selectedDate.toDateString();
  };

  const isToday = (day: CalendarDay): boolean => {
    if (!day.isCurrentMonth) return false;

    const today = new Date();
    const dayDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day.date
    );

    return dayDate.toDateString() === today.toDateString();
  };

  const getClassColor = (className: string) => {
    // Generate a consistent color based on class name hash
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      const char = className.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const colors = [
      "bg-blue-200",
      "bg-purple-200",
      "bg-green-200",
      "bg-indigo-200",
      "bg-emerald-200",
      "bg-orange-200",
      "bg-teal-200",
      "bg-cyan-200",
      "bg-red-200",
      "bg-yellow-200",
      "bg-pink-200",
      "bg-rose-200",
      "bg-violet-200",
      "bg-amber-200",
      "bg-lime-200",
      "bg-sky-200",
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous month"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="relative">
            <select
              value={selectedFilter}
              onChange={handleFilterChange}
              title="Filter classes by subject"
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
            >
              {getFilterOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next month"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => handleDateClick(day)}
            className={`min-h-[80px] p-1 border border-gray-100 transition-all duration-200 ${
              day.isCurrentMonth
                ? `bg-white cursor-pointer hover:bg-blue-50 ${
                    isDateSelected(day)
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : isToday(day)
                      ? "ring-1 ring-blue-300 bg-blue-25"
                      : ""
                  }`
                : "bg-gray-50"
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth
                  ? isDateSelected(day)
                    ? "text-blue-900"
                    : isToday(day)
                    ? "text-blue-700"
                    : "text-gray-900"
                  : "text-gray-400"
              }`}
            >
              {day.date}
              {isToday(day) && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                  Today
                </span>
              )}
              {isDateSelected(day) && !isToday(day) && (
                <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">
                  Selected
                </span>
              )}
            </div>

            {/* Classes for this day */}
            <div className="space-y-1">
              {day.classes.slice(0, 2).map((cls, clsIndex) => (
                <div
                  key={clsIndex}
                  className={`${getClassColor(
                    cls.name
                  )} text-black text-xs p-1 rounded truncate`}
                  title={`${cls.name} - ${cls.startTime}`}
                >
                  <div className="font-medium">{cls.name}</div>
                </div>
              ))}
              {day.classes.length > 2 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{day.classes.length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
