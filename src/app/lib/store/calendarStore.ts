import { create } from 'zustand';

interface CalendarState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  resetToToday: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDate: new Date(), // Initialize with today's date
  setSelectedDate: (date: Date) => set({ selectedDate: date }),
  resetToToday: () => set({ selectedDate: new Date() }),
}));