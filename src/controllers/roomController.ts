import { Request, Response } from "express";
import { ValidationError } from "../errorHandler";
import { BookingService } from "../services/bookingService";
import { RoomService } from "../services/roomService";

export class RoomController {
  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
  ) {}

  getRooms = async (_request: Request, response: Response): Promise<void> => {
    const rooms = await this.roomService.getRooms();
    response.status(200).json(rooms);
  };

  getBookings = async (request: Request, response: Response): Promise<void> => {
    const roomId = this.readRoomId(request.params.id);
    const from = this.readDate(request.query.from, "from");
    const to = this.readDate(request.query.to, "to");
    const bookings = await this.bookingService.getRoomBookings(roomId, from, to);

    response.status(200).json(bookings);
  };

  createBooking = async (request: Request, response: Response): Promise<void> => {
    const roomId = this.readRoomId(request.params.id);
    const body: unknown = request.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ValidationError("The request body is invalid");
    }

    const values = body as Record<string, unknown>;

    if (typeof values.memberId !== "string" || values.memberId.length === 0) {
      throw new ValidationError("The memberId is required");
    }

    const start = this.readDate(values.start, "start");
    const end = this.readDate(values.end, "end");
    const booking = await this.bookingService.createBooking(
      roomId,
      values.memberId,
      start,
      end,
    );

    response.location(`/bookings/${booking.id}`).status(201).json(booking);
  };

  private readRoomId(value: string | string[]): string {
    if (typeof value !== "string") {
      throw new ValidationError("The room id is invalid");
    }

    return value;
  }

  private readDate(value: unknown, name: string): Date {
    if (typeof value !== "string") {
      throw new ValidationError(`The ${name} date is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new ValidationError(`The ${name} date is invalid`);
    }

    return date;
  }
}
