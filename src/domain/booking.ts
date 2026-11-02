export type BookingStatus = "confirmed" | "cancelled" | "late_cancelled";
export type CancellationStatus = Exclude<BookingStatus, "confirmed">;

export interface Booking {
  id: string;
  roomId: string;
  memberId: string;
  start: Date;
  end: Date;
  status: BookingStatus;
}
