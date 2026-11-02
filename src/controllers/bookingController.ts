import { Request, Response } from "express";
import { ValidationError } from "../errorHandler";
import { BookingService } from "../services/bookingService";

export class BookingController {
  constructor(private bookingService: BookingService) {}

  getBooking = async (request: Request, response: Response): Promise<void> => {
    const bookingId = request.params.id;

    if (typeof bookingId !== "string") {
      throw new ValidationError("The booking id is invalid");
    }

    const booking = await this.bookingService.getBooking(bookingId);
    response.status(200).json(booking);
  };
}
