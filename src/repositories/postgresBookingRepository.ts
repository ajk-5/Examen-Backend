import { pool } from "../db";
import { Booking } from "../domain/booking";
import { BookingRepository } from "./bookingRepository";

export class PostgresBookingRepository implements BookingRepository {
  async findByRoomAndPeriod(roomId: string, from: Date, to: Date): Promise<Booking[]> {
    const result = await pool.query<Booking>(
      `
        SELECT
          id,
          room_id AS "roomId",
          member_id AS "memberId",
          start_at AS "start",
          end_at AS "end",
          status
        FROM bookings
        WHERE room_id = $1
          AND start_at < $3
          AND end_at > $2
          AND status = 'confirmed'
        ORDER BY start_at
      `,
      [roomId, from, to],
    );

    return result.rows;
  }
}
