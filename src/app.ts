import express from "express";
import { BookingController } from "./controllers/bookingController";
import { RoomController } from "./controllers/roomController";
import { SystemClock } from "./domain/clock";
import { errorHandler } from "./errorHandler";
import { PostgresBookingRepository } from "./repositories/postgresBookingRepository";
import { PostgresRoomRepository } from "./repositories/postgresRoomRepository";
import { createBookingRouter } from "./routes/bookingRoutes";
import { createRoomRouter } from "./routes/roomRoutes";
import { BookingService } from "./services/bookingService";
import { RoomService } from "./services/roomService";

export const app = express();

app.use(express.json());

const roomRepository = new PostgresRoomRepository();
const bookingRepository = new PostgresBookingRepository();
const clock = new SystemClock();
const roomService = new RoomService(roomRepository);
const bookingService = new BookingService(roomRepository, bookingRepository, clock);
const roomController = new RoomController(roomService, bookingService);
const bookingController = new BookingController(bookingService);

app.use("/rooms", createRoomRouter(roomController));
app.use("/bookings", createBookingRouter(bookingController));
app.use(errorHandler);
