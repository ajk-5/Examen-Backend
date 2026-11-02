const test = require("node:test");
const assert = require("node:assert/strict");
const {
  BookingConflictError,
  InvalidBookingError,
  checkMaintenance,
  checkMemberLimit,
  checkRoomAvailability,
  validateBookingTime,
} = require("../dist/domain/bookingRules");
const { getCancellationStatus } = require("../dist/domain/cancellationRules");

test("accepts a valid booking time", () => {
  const start = new Date("2026-11-04T14:00:00Z");
  const end = new Date("2026-11-04T16:00:00Z");

  assert.doesNotThrow(() => validateBookingTime(start, end));
});

test("rejects invalid booking times", () => {
  assert.throws(
    () =>
      validateBookingTime(
        new Date("2026-11-04T14:00:00Z"),
        new Date("2026-11-04T14:30:00Z"),
      ),
    InvalidBookingError,
  );

  assert.throws(
    () =>
      validateBookingTime(
        new Date("2026-11-04T14:30:00Z"),
        new Date("2026-11-04T16:00:00Z"),
      ),
    InvalidBookingError,
  );

  assert.throws(
    () =>
      validateBookingTime(
        new Date("2026-11-04T09:00:00Z"),
        new Date("2026-11-04T10:00:00Z"),
      ),
    InvalidBookingError,
  );
});

test("blocks room maintenance but allows adjacent times", () => {
  const room = {
    id: "room-4",
    name: "Salle Björk",
    capacity: 3,
    maintenanceStart: new Date("2026-11-05T00:00:00Z"),
    maintenanceEnd: new Date("2026-11-08T00:00:00Z"),
  };

  assert.throws(
    () =>
      checkMaintenance(
        room,
        new Date("2026-11-06T14:00:00Z"),
        new Date("2026-11-06T16:00:00Z"),
      ),
    BookingConflictError,
  );

  assert.doesNotThrow(() =>
    checkMaintenance(
      room,
      new Date("2026-11-04T22:00:00Z"),
      new Date("2026-11-05T00:00:00Z"),
    ),
  );
});

test("blocks a third upcoming booking", () => {
  assert.doesNotThrow(() => checkMemberLimit(1));
  assert.throws(() => checkMemberLimit(2), BookingConflictError);
});

test("blocks overlaps and allows an available room", () => {
  assert.doesNotThrow(() => checkRoomAvailability(false));
  assert.throws(() => checkRoomAvailability(true), BookingConflictError);
});

test("uses a fixed clock for cancellation status", () => {
  const now = new Date("2026-11-02T09:00:00Z");

  assert.equal(
    getCancellationStatus(new Date("2026-11-03T10:00:00Z"), now),
    "cancelled",
  );
  assert.equal(
    getCancellationStatus(new Date("2026-11-03T08:00:00Z"), now),
    "late_cancelled",
  );
  assert.equal(
    getCancellationStatus(new Date("2026-11-03T09:00:00Z"), now),
    "cancelled",
  );
});
