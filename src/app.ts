import express from "express";
import { BookingController } from "./controllers/bookingController";
import { MemberController } from "./controllers/memberController";
import { RoomController } from "./controllers/roomController";
import { SystemClock } from "./domain/clock";
import { errorHandler } from "./errorHandler";
import { PostgresBookingRepository } from "./repositories/postgresBookingRepository";
import { PostgresMemberRepository } from "./repositories/postgresMemberRepository";
import { PostgresRoomRepository } from "./repositories/postgresRoomRepository";
import { createBookingRouter } from "./routes/bookingRoutes";
import { createMemberRouter } from "./routes/memberRoutes";
import { createRoomRouter } from "./routes/roomRoutes";
import { BookingService } from "./services/bookingService";
import { MemberService } from "./services/memberService";
import { RoomService } from "./services/roomService";

export const app = express();

app.use(express.json());

const roomRepository = new PostgresRoomRepository();
const bookingRepository = new PostgresBookingRepository();
const memberRepository = new PostgresMemberRepository();
const clock = new SystemClock();
const roomService = new RoomService(roomRepository);
const bookingService = new BookingService(roomRepository, bookingRepository, clock);
const memberService = new MemberService(memberRepository, bookingRepository);
const roomController = new RoomController(roomService, bookingService);
const bookingController = new BookingController(bookingService);
const memberController = new MemberController(memberService);

app.use("/rooms", createRoomRouter(roomController));
app.use("/bookings", createBookingRouter(bookingController));
app.use("/members", createMemberRouter(memberController));
app.use(errorHandler);
