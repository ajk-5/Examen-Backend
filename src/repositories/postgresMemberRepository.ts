import { pool } from "../db";
import { MemberRepository } from "./memberRepository";

export class PostgresMemberRepository implements MemberRepository {
  async exists(id: string): Promise<boolean> {
    const result = await pool.query("SELECT 1 FROM members WHERE id = $1", [id]);
    return result.rows.length > 0;
  }
}
