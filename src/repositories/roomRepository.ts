import { Room } from "../domain/room";

export interface RoomRepository {
  findAll(): Promise<Room[]>;
}
