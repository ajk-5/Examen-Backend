import { Room } from "../domain/room";

export interface RoomRepository {
  findAll(): Promise<Room[]>;
  findById(id: string): Promise<Room | null>;
}
