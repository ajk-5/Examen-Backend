import { Booking } from "../domain/booking";

export interface BookingRepository {
  findByRoomAndPeriod(roomId: string, from: Date, to: Date): Promise<Booking[]>;
}
