'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Edit3, X, Check } from 'lucide-react';
import CenteredSelect from './CenteredSelect';

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
}

interface ClassSchedule {
  id: string;
  day: string;
  time: string;
  timeSlotId: string | null;
  roomId: string | null;
  room?: {
    id: string;
    name: string;
    capacity: number | null;
  };
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label: string;
  };
}

interface ScheduleEditorProps {
  classId: string;
  className: string;
}

export default function ScheduleEditor({ classId, className }: ScheduleEditorProps) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [newSchedule, setNewSchedule] = useState({
    day: '',
    timeSlotId: '',
    roomId: ''
  });

  const [editForm, setEditForm] = useState({
    day: '',
    timeSlotId: '',
    roomId: ''
  });

  // Fetch existing schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/schedules`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      } else {
        console.error('Failed to fetch schedules');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // Fetch rooms and time slots
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch schedules
        await fetchSchedules();

        // Fetch rooms
        const roomsResponse = await fetch('/api/admin/rooms');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);
        }

        // Fetch time slots
        const timeSlotsResponse = await fetch('/api/admin/timeslots');
        if (timeSlotsResponse.ok) {
          const timeSlotsData = await timeSlotsResponse.json();
          setTimeSlots(timeSlotsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load schedule data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [classId]);

  const validateNewSchedule = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newSchedule.day) {
      errors.day = 'Please select a day';
    }
    if (!newSchedule.timeSlotId) {
      errors.timeSlotId = 'Please select a time slot';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!editForm.day) {
      errors.editDay = 'Please select a day';
    }
    if (!editForm.timeSlotId) {
      errors.editTimeSlotId = 'Please select a time slot';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSchedule = async () => {
    if (!validateNewSchedule()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      });

      if (response.ok) {
        toast.success('Schedule added successfully');
        setNewSchedule({ day: '', timeSlotId: '', roomId: '' });
        setValidationErrors({});
        setIsAddingNew(false);
        await fetchSchedules(); // Refresh the list
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to add schedule';
        toast.error(errorMsg);
        // Set API validation error for display
        setValidationErrors({ api: errorMsg });
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error('Failed to add schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSchedule = async (scheduleId: string) => {
    if (!validateEditForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast.success('Schedule updated successfully');
        setEditingId(null);
        setValidationErrors({});
        await fetchSchedules(); // Refresh the list
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to update schedule';
        toast.error(errorMsg);
        // Set API validation error for display
        setValidationErrors({ editApi: errorMsg });
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Schedule deleted successfully');
        await fetchSchedules(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (schedule: ClassSchedule) => {
    setEditingId(schedule.id);
    setEditForm({
      day: schedule.day,
      timeSlotId: schedule.timeSlotId || '',
      roomId: schedule.roomId || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ day: '', timeSlotId: '', roomId: '' });
    setValidationErrors({});
  };

  const cancelAdding = () => {
    setIsAddingNew(false);
    setNewSchedule({ day: '', timeSlotId: '', roomId: '' });
    setValidationErrors({});
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 overflow-visible">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Class Schedules for {className}</h3>
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          disabled={isAddingNew || isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <Plus size={16} />
          Add Schedule
        </button>
      </div>

      {/* Add new schedule form */}
      {isAddingNew && (
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-medium mb-3">Add New Schedule</h4>
          
          {/* API Error Display */}
          {validationErrors.api && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {validationErrors.api}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Day *</label>
              <CenteredSelect
                value={newSchedule.day}
                onChange={(value) => setNewSchedule({ ...newSchedule, day: value })}
                options={days.map(day => ({ value: day, label: day }))}
                placeholder="Select Day"
                error={!!validationErrors.day}
                required
              />
              {validationErrors.day && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.day}</p>
              )}
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot *</label>
              <CenteredSelect
                value={newSchedule.timeSlotId}
                onChange={(value) => setNewSchedule({ ...newSchedule, timeSlotId: value })}
                options={timeSlots.map(slot => ({ value: slot.id, label: slot.label }))}
                placeholder="Select Time Slot"
                error={!!validationErrors.timeSlotId}
                required
              />
              {validationErrors.timeSlotId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.timeSlotId}</p>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <CenteredSelect
                value={newSchedule.roomId}
                onChange={(value) => setNewSchedule({ ...newSchedule, roomId: value })}
                options={rooms.map(room => ({ value: room.id, label: room.name }))}
                placeholder="Select Room (Optional)"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleAddSchedule}
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Check size={16} />
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              disabled={isSubmitting}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing schedules */}
      {schedules.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No schedules found. Add a schedule to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="border border-gray-200 rounded p-4">
              {editingId === schedule.id ? (
                // Edit mode
                <div>
                  {/* Edit API Error Display */}
                  {validationErrors.editApi && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                      {validationErrors.editApi}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day *</label>
                      <CenteredSelect
                        value={editForm.day}
                        onChange={(value) => setEditForm({ ...editForm, day: value })}
                        options={days.map(day => ({ value: day, label: day }))}
                        placeholder="Select Day"
                        error={!!validationErrors.editDay}
                        required
                      />
                      {validationErrors.editDay && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.editDay}</p>
                      )}
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot *</label>
                      <CenteredSelect
                        value={editForm.timeSlotId}
                        onChange={(value) => setEditForm({ ...editForm, timeSlotId: value })}
                        options={timeSlots.map(slot => ({ value: slot.id, label: slot.label }))}
                        placeholder="Select Time Slot"
                        error={!!validationErrors.editTimeSlotId}
                        required
                      />
                      {validationErrors.editTimeSlotId && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.editTimeSlotId}</p>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                      <CenteredSelect
                        value={editForm.roomId}
                        onChange={(value) => setEditForm({ ...editForm, roomId: value })}
                        options={rooms.map(room => ({ value: room.id, label: room.name }))}
                        placeholder="Select Room (Optional)"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSchedule(schedule.id)}
                      disabled={isSubmitting}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Check size={16} />
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{schedule.day}</div>
                    <div className="text-sm text-gray-600">
                      {schedule.timeSlot?.label || schedule.time}
                      {schedule.room && (
                        <span className="ml-2 text-blue-600">• Room: {schedule.room.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(schedule)}
                      disabled={isSubmitting || editingId !== null}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      aria-label="Edit schedule"
                      title="Edit schedule"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      disabled={isSubmitting || editingId !== null}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Delete schedule"
                      title="Delete schedule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}