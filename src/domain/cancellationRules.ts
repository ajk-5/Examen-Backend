import { CancellationStatus } from "./booking";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getCancellationStatus(start: Date, now: Date): CancellationStatus {
  const timeBeforeStart = start.getTime() - now.getTime();
  return timeBeforeStart < DAY_IN_MS ? "late_cancelled" : "cancelled";
}
