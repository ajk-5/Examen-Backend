import { Request, Response } from "express";
import { ValidationError } from "../errorHandler";
import { MemberService } from "../services/memberService";

export class MemberController {
  constructor(private memberService: MemberService) {}

  getBookings = async (request: Request, response: Response): Promise<void> => {
    const memberId = request.params.id;

    if (typeof memberId !== "string") {
      throw new ValidationError("The member id is invalid");
    }

    const bookings = await this.memberService.getBookings(memberId);
    response.status(200).json(bookings);
  };
}
