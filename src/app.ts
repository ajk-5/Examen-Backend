import express from "express";
import { RoomController } from "./controllers/roomController";
import { errorHandler } from "./errorHandler";
import { PostgresBookingRepository } from "./repositories/postgresBookingRepository";
import { PostgresRoomRepository } from "./repositories/postgresRoomRepository";
import { createRoomRouter } from "./routes/roomRoutes";
import { RoomService } from "./services/roomService";

export const app = express();

app.use(express.json());

const roomRepository = new PostgresRoomRepository();
const bookingRepository = new PostgresBookingRepository();
const roomService = new RoomService(roomRepository, bookingRepository);
const roomController = new RoomController(roomService);

app.use("/rooms", createRoomRouter(roomController));
app.use(errorHandler);
