import { createClient } from "redis";
import { Booking } from "../domain/booking";
import { CachedSchedule, ScheduleCache } from "./scheduleCache";

interface StoredBooking extends Omit<Booking, "start" | "end"> {
  start: string;
  end: string;
}

export class ValkeyScheduleCache implements ScheduleCache {
  private client: ReturnType<typeof createClient> | null;

  constructor(
    url: string | undefined,
    private ttlSeconds: number,
  ) {
    this.client = url
      ? createClient({
          url,
          socket: {
            connectTimeout: 500,
            reconnectStrategy: false,
          },
        })
      : null;

    this.client?.on("error", () => {});
  }

  async get(roomId: string, from: Date, to: Date): Promise<CachedSchedule> {
    const client = await this.getClient();

    if (!client) {
      return { bookings: null, version: "0" };
    }

    try {
      const version = (await client.get(this.versionKey(roomId))) ?? "0";
      const value = await client.get(this.scheduleKey(roomId, from, to, version));

      if (!value) {
        return { bookings: null, version };
      }

      const storedBookings = JSON.parse(value) as StoredBooking[];
      const bookings = storedBookings.map((booking) => ({
        ...booking,
        start: new Date(booking.start),
        end: new Date(booking.end),
      }));

      return { bookings, version };
    } catch {
      return { bookings: null, version: "0" };
    }
  }

  async set(
    roomId: string,
    from: Date,
    to: Date,
    bookings: Booking[],
    version: string,
  ): Promise<void> {
    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      await client.set(
        this.scheduleKey(roomId, from, to, version),
        JSON.stringify(bookings),
        { EX: this.ttlSeconds },
      );
    } catch {
      // PostgreSQL remains available when the cache fails
    }
  }

  async invalidateRoom(roomId: string): Promise<void> {
    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      await client.incr(this.versionKey(roomId));
    } catch {
      // PostgreSQL remains available when the cache fails
    }
  }

  private async getClient(): Promise<ReturnType<typeof createClient> | null> {
    if (!this.client) {
      return null;
    }

    try {
      if (!this.client.isReady && !this.client.isOpen) {
        await this.client.connect();
        this.client.unref();
      }

      return this.client.isReady ? this.client : null;
    } catch {
      return null;
    }
  }

  private versionKey(roomId: string): string {
    return `room-schedule:${roomId}:version`;
  }

  private scheduleKey(roomId: string, from: Date, to: Date, version: string): string {
    return `room-schedule:${roomId}:v${version}:${from.toISOString()}:${to.toISOString()}`;
  }
}
