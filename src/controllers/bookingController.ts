import { Request, Response } from "express";
import { ValidationError } from "../errorHandler";
import { BookingService } from "../services/bookingService";

export class BookingController {
  constructor(private bookingService: BookingService) {}

  getBooking = async (request: Request, response: Response): Promise<void> => {
    const bookingId = this.readBookingId(request.params.id);
    const booking = await this.bookingService.getBooking(bookingId);
    response.status(200).json(booking);
  };

  cancelBooking = async (request: Request, response: Response): Promise<void> => {
    const bookingId = this.readBookingId(request.params.id);
    await this.bookingService.cancelBooking(bookingId);
    response.status(204).send();
  };

  private readBookingId(value: string | string[]): string {
    if (typeof value !== "string") {
      throw new ValidationError("The booking id is invalid");
    }

    return value;
  }
}
