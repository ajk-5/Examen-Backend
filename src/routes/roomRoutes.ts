import { Router } from "express";
import { RoomController } from "../controllers/roomController";

export function createRoomRouter(roomController: RoomController): Router {
  const router = Router();

  router.get("/", roomController.getRooms);

  return router;
}
