import { Booking } from "../domain/booking";

export interface CachedSchedule {
  bookings: Booking[] | null;
  version: string;
}

export interface ScheduleCache {
  get(roomId: string, from: Date, to: Date): Promise<CachedSchedule>;
  set(roomId: string, from: Date, to: Date, bookings: Booking[], version: string): Promise<void>;
  invalidateRoom(roomId: string): Promise<void>;
}
