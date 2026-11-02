import { pool } from "../db";
import { Room } from "../domain/room";
import { RoomRepository } from "./roomRepository";

export class PostgresRoomRepository implements RoomRepository {
  async findAll(): Promise<Room[]> {
    const result = await pool.query<Room>(`
      SELECT
        id,
        name,
        capacity,
        maintenance_start AS "maintenanceStart",
        maintenance_end AS "maintenanceEnd"
      FROM rooms
      ORDER BY id
    `);

    return result.rows;
  }

  async findById(id: string): Promise<Room | null> {
    const result = await pool.query<Room>(
      `
        SELECT
          id,
          name,
          capacity,
          maintenance_start AS "maintenanceStart",
          maintenance_end AS "maintenanceEnd"
        FROM rooms
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }
}
