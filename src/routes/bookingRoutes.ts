import { Router } from "express";
import { BookingController } from "../controllers/bookingController";

export function createBookingRouter(bookingController: BookingController): Router {
  const router = Router();

  router.get("/:id", bookingController.getBooking);

  return router;
}
