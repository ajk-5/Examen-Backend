import { Room } from "./room";

const HOUR_IN_MS = 60 * 60 * 1000;

export const MAX_UPCOMING_BOOKINGS = 2;

export class InvalidBookingError extends Error {}

export class BookingConflictError extends Error {}

export function validateBookingTime(start: Date, end: Date): void {
  const duration = end.getTime() - start.getTime();

  if (duration < HOUR_IN_MS || duration > 4 * HOUR_IN_MS) {
    throw new InvalidBookingError("A booking must last between 1 and 4 hours");
  }

  if (
    start.getUTCMinutes() !== 0 ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0
  ) {
    throw new InvalidBookingError("A booking must start on a full hour");
  }

  const startHour = start.getUTCHours();

  if (startHour < 10 || startHour > 23) {
    throw new InvalidBookingError("A booking must start between 10:00 and 23:00 UTC");
  }
}

export function checkMaintenance(room: Room, start: Date, end: Date): void {
  if (!room.maintenanceStart || !room.maintenanceEnd) {
    return;
  }

  const overlapsMaintenance = start < room.maintenanceEnd && end > room.maintenanceStart;

  if (overlapsMaintenance) {
    throw new BookingConflictError("The room is unavailable during maintenance");
  }
}

export function checkMemberLimit(upcomingBookings: number): void {
  if (upcomingBookings >= MAX_UPCOMING_BOOKINGS) {
    throw new BookingConflictError("The member already has two upcoming bookings");
  }
}

export function checkRoomAvailability(hasOverlap: boolean): void {
  if (hasOverlap) {
    throw new BookingConflictError("The room is already booked during this time");
  }
}
