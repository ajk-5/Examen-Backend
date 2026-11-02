import { DatabaseError } from "pg";
import { pool } from "../db";
import { Booking } from "../domain/booking";
import {
  BookingRepository,
  CancelBookingResult,
  CreateBookingResult,
  NewBooking,
} from "./bookingRepository";
import { CancellationStatus } from "../domain/booking";

export class PostgresBookingRepository implements BookingRepository {
  async findById(id: string): Promise<Booking | null> {
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
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

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

  async hasOverlap(roomId: string, start: Date, end: Date): Promise<boolean> {
    const result = await pool.query(
      `
        SELECT 1
        FROM bookings
        WHERE room_id = $1
          AND start_at < $3
          AND end_at > $2
          AND status = 'confirmed'
        LIMIT 1
      `,
      [roomId, start, end],
    );

    return result.rows.length > 0;
  }

  async create(
    booking: NewBooking,
    now: Date,
    maxUpcomingBookings: number,
  ): Promise<CreateBookingResult> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const member = await client.query(
        "SELECT id FROM members WHERE id = $1 FOR UPDATE",
        [booking.memberId],
      );

      if (member.rows.length === 0) {
        await client.query("ROLLBACK");
        return { type: "member_not_found" };
      }

      const countResult = await client.query<{ count: number }>(
        `
          SELECT COUNT(*)::integer AS count
          FROM bookings
          WHERE member_id = $1
            AND status = 'confirmed'
            AND start_at > $2
        `,
        [booking.memberId, now],
      );
      const upcomingBookings = countResult.rows[0]?.count ?? 0;

      if (upcomingBookings >= maxUpcomingBookings) {
        await client.query("ROLLBACK");
        return { type: "member_limit", upcomingBookings };
      }

      const result = await client.query<Booking>(
        `
          INSERT INTO bookings (id, room_id, member_id, start_at, end_at, status)
          VALUES ($1, $2, $3, $4, $5, 'confirmed')
          RETURNING
            id,
            room_id AS "roomId",
            member_id AS "memberId",
            start_at AS "start",
            end_at AS "end",
            status
        `,
        [booking.id, booking.roomId, booking.memberId, booking.start, booking.end],
      );

      await client.query("COMMIT");
      return { type: "created", booking: result.rows[0]! };
    } catch (error) {
      await client.query("ROLLBACK");

      if (error instanceof DatabaseError && error.code === "23P01") {
        return { type: "room_overlap" };
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(
    id: string,
    getStatus: (start: Date) => CancellationStatus,
  ): Promise<CancelBookingResult> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<Booking>(
        `
          SELECT
            id,
            room_id AS "roomId",
            member_id AS "memberId",
            start_at AS "start",
            end_at AS "end",
            status
          FROM bookings
          WHERE id = $1
          FOR UPDATE
        `,
        [id],
      );
      const booking = result.rows[0];

      if (!booking) {
        await client.query("ROLLBACK");
        return { type: "not_found" };
      }

      if (booking.status !== "confirmed") {
        await client.query("ROLLBACK");
        return { type: "already_cancelled" };
      }

      const status = getStatus(booking.start);
      const updateResult = await client.query<Booking>(
        `
          UPDATE bookings
          SET status = $2
          WHERE id = $1
          RETURNING
            id,
            room_id AS "roomId",
            member_id AS "memberId",
            start_at AS "start",
            end_at AS "end",
            status
        `,
        [id, status],
      );

      await client.query("COMMIT");
      return { type: "cancelled", booking: updateResult.rows[0]! };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
