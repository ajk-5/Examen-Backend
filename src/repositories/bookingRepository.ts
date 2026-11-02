import { Booking } from "../domain/booking";

export interface NewBooking {
  id: string;
  roomId: string;
  memberId: string;
  start: Date;
  end: Date;
}

export type CreateBookingResult =
  | { type: "created"; booking: Booking }
  | { type: "member_not_found" }
  | { type: "member_limit"; upcomingBookings: number }
  | { type: "room_overlap" };

export interface BookingRepository {
  findByRoomAndPeriod(roomId: string, from: Date, to: Date): Promise<Booking[]>;
  hasOverlap(roomId: string, start: Date, end: Date): Promise<boolean>;
  create(
    booking: NewBooking,
    now: Date,
    maxUpcomingBookings: number,
  ): Promise<CreateBookingResult>;
}
