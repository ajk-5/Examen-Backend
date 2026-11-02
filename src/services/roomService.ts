import { Room } from "../domain/room";
import { RoomRepository } from "../repositories/roomRepository";

export class RoomService {
  constructor(private roomRepository: RoomRepository) {}

  async getRooms(): Promise<Room[]> {
    return this.roomRepository.findAll();
  }
}
