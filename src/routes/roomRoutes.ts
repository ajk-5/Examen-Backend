import { Router } from "express";
import { RoomController } from "../controllers/roomController";

export function createRoomRouter(roomController: RoomController): Router {
  const router = Router();

  router.get("/", roomController.getRooms);
  router.get("/:id/bookings", roomController.getBookings);
  router.post("/:id/bookings", roomController.createBooking);

  return router;
}
