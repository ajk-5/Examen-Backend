import { Booking } from "../domain/booking";
import { Room } from "../domain/room";
import { NotFoundError, ValidationError } from "../errorHandler";
import { BookingRepository } from "../repositories/bookingRepository";
import { RoomRepository } from "../repositories/roomRepository";

export class RoomService {
  constructor(
    private roomRepository: RoomRepository,
    private bookingRepository: BookingRepository,
  ) {}

  async getRooms(): Promise<Room[]> {
    return this.roomRepository.findAll();
  }

  async getBookings(roomId: string, from: Date, to: Date): Promise<Booking[]> {
    if (from >= to) {
      throw new ValidationError("The start date must be before the end date");
    }

    const roomExists = await this.roomRepository.exists(roomId);

    if (!roomExists) {
      throw new NotFoundError("Room not found");
    }

    return this.bookingRepository.findByRoomAndPeriod(roomId, from, to);
  }
}
