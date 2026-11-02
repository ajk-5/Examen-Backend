import { randomUUID } from "crypto";
import { Booking } from "../domain/booking";
import {
  checkMaintenance,
  checkMemberLimit,
  checkRoomAvailability,
  MAX_UPCOMING_BOOKINGS,
  validateBookingTime,
} from "../domain/bookingRules";
import { Clock } from "../domain/clock";
import { NotFoundError, ValidationError } from "../errorHandler";
import { BookingRepository } from "../repositories/bookingRepository";
import { RoomRepository } from "../repositories/roomRepository";

export class BookingService {
  constructor(
    private roomRepository: RoomRepository,
    private bookingRepository: BookingRepository,
    private clock: Clock,
  ) {}

  async getRoomBookings(roomId: string, from: Date, to: Date): Promise<Booking[]> {
    if (from >= to) {
      throw new ValidationError("The start date must be before the end date");
    }

    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    return this.bookingRepository.findByRoomAndPeriod(roomId, from, to);
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
