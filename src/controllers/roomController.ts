import { Request, Response } from "express";
import { ValidationError } from "../errorHandler";
import { RoomService } from "../services/roomService";

export class RoomController {
  constructor(private roomService: RoomService) {}

  getRooms = async (_request: Request, response: Response): Promise<void> => {
    const rooms = await this.roomService.getRooms();
    response.status(200).json(rooms);
  };

  getBookings = async (request: Request, response: Response): Promise<void> => {
    const roomId = request.params.id;

    if (typeof roomId !== "string") {
      throw new ValidationError("The room id is invalid");
    }

    const from = this.readDate(request.query.from, "from");
    const to = this.readDate(request.query.to, "to");
    const bookings = await this.roomService.getBookings(roomId, from, to);

    response.status(200).json(bookings);
  };

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
