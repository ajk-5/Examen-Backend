import { Booking, CancellationStatus } from "../domain/booking";

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

export type CancelBookingResult =
  | { type: "cancelled"; booking: Booking }
  | { type: "not_found" }
  | { type: "already_cancelled" };

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByMember(memberId: string): Promise<Booking[]>;
  findByRoomAndPeriod(roomId: string, from: Date, to: Date): Promise<Booking[]>;
  hasOverlap(roomId: string, start: Date, end: Date): Promise<boolean>;
  create(
    booking: NewBooking,
    now: Date,
    maxUpcomingBookings: number,
  ): Promise<CreateBookingResult>;
  cancel(
    id: string,
    getStatus: (start: Date) => CancellationStatus,
  ): Promise<CancelBookingResult>;
}
