import { Router } from "express";
import { MemberController } from "../controllers/memberController";

export function createMemberRouter(memberController: MemberController): Router {
  const router = Router();

  router.get("/:id/bookings", memberController.getBookings);

  return router;
}
