export interface ClassItem {
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
  roomDetails?: {
    id: string;
    name: string;
    capacity: number | null;
    building: string | null;
    floor: string | null;
    features: string | null;
  } | null;
}
