import { Router } from "express";
import { BookingController } from "../controllers/bookingController";

export function createBookingRouter(bookingController: BookingController): Router {
  const router = Router();

  router.get("/:id", bookingController.getBooking);
  router.delete("/:id", bookingController.cancelBooking);

  return router;
}
