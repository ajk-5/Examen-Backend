import { Request, Response } from "express";
import { RoomService } from "../services/roomService";

export class RoomController {
  constructor(private roomService: RoomService) {}

  getRooms = async (_request: Request, response: Response): Promise<void> => {
    const rooms = await this.roomService.getRooms();
    response.status(200).json(rooms);
  };
}
