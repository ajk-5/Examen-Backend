import { Booking } from "../domain/booking";
import { NotFoundError } from "../errorHandler";
import { BookingRepository } from "../repositories/bookingRepository";
import { MemberRepository } from "../repositories/memberRepository";

export class MemberService {
  constructor(
    private memberRepository: MemberRepository,
    private bookingRepository: BookingRepository,
  ) {}

  async getBookings(memberId: string): Promise<Booking[]> {
    const memberExists = await this.memberRepository.exists(memberId);

    if (!memberExists) {
      throw new NotFoundError("Member not found");
    }

    return this.bookingRepository.findByMember(memberId);
  }
}
