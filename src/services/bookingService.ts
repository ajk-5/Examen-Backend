import { randomUUID } from "crypto";
import { ScheduleCache } from "../cache/scheduleCache";
import { Booking } from "../domain/booking";
import {
  BookingConflictError,
  checkMaintenance,
  checkMemberLimit,
  checkRoomAvailability,
  MAX_UPCOMING_BOOKINGS,
  validateBookingTime,
} from "../domain/bookingRules";
import { Clock } from "../domain/clock";
import { getCancellationStatus } from "../domain/cancellationRules";
import { NotFoundError, ValidationError } from "../errorHandler";
import { BookingRepository } from "../repositories/bookingRepository";
import { RoomRepository } from "../repositories/roomRepository";

export class BookingService {
  constructor(
    private roomRepository: RoomRepository,
    private bookingRepository: BookingRepository,
    private clock: Clock,
    private scheduleCache: ScheduleCache,
  ) {}

  async getBooking(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    return booking;
  }

  async cancelBooking(id: string): Promise<void> {
    const now = this.clock.now();
    const result = await this.bookingRepository.cancel(id, (start) =>
      getCancellationStatus(start, now),
    );

    if (result.type === "not_found") {
      throw new NotFoundError("Booking not found");
    }

    if (result.type === "already_cancelled") {
      throw new BookingConflictError("The booking is already cancelled");
    }

    await this.scheduleCache.invalidateRoom(result.booking.roomId);
  }

  async getRoomBookings(roomId: string, from: Date, to: Date): Promise<Booking[]> {
    if (from >= to) {
      throw new ValidationError("The start date must be before the end date");
    }

    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const cached = await this.scheduleCache.get(roomId, from, to);

    if (cached.bookings) {
      return cached.bookings;
    }

    const bookings = await this.bookingRepository.findByRoomAndPeriod(roomId, from, to);
    await this.scheduleCache.set(roomId, from, to, bookings, cached.version);

    return bookings;
  }

  async createBooking(
    roomId: string,
    memberId: string,
    start: Date,
    end: Date,
  ): Promise<Booking> {
    validateBookingTime(start, end);

    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    checkMaintenance(room, start, end);

    const hasOverlap = await this.bookingRepository.hasOverlap(roomId, start, end);
    checkRoomAvailability(hasOverlap);

    const result = await this.bookingRepository.create(
      {
        id: `booking-${randomUUID()}`,
        roomId,
        memberId,
        start,
        end,
      },
      this.clock.now(),
      MAX_UPCOMING_BOOKINGS,
    );

    if (result.type === "created") {
      await this.scheduleCache.invalidateRoom(roomId);
      return result.booking;
    }

    if (result.type === "member_not_found") {
      throw new NotFoundError("Member not found");
    }

    if (result.type === "member_limit") {
      checkMemberLimit(result.upcomingBookings);
    }

    if (result.type === "room_overlap") {
      checkRoomAvailability(true);
    }

    throw new Error("The booking could not be created");
  }
}
