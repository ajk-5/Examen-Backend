const { after, before, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("redis");
const { createApp } = require("../dist/app");
const { pool } = require("../dist/db");

const seedSql = fs.readFileSync(path.join(__dirname, "..", "seeds", "seed.sql"), "utf8");

let server;
let baseUrl;
let valkey;
const fixedClock = {
  now: () => new Date("2026-11-02T09:00:00Z"),
};
const app = createApp(fixedClock);

before(async () => {
  valkey = createClient({ url: process.env.VALKEY_URL });
  valkey.on("error", () => {});
  await valkey.connect();

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await pool.query(seedSql);
  await valkey.flushDb();
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  valkey.destroy();
  await pool.end();
});

test("GET /rooms returns the four rooms", async () => {
  const response = await fetch(`${baseUrl}/rooms`);
  const rooms = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rooms.length, 4);
});

test("GET /rooms/:id/bookings returns the room schedule", async () => {
  const response = await fetch(
    `${baseUrl}/rooms/room-2/bookings?from=2026-11-02T00:00:00Z&to=2026-11-03T00:00:00Z`,
  );
  const bookings = await response.json();

  assert.equal(response.status, 200);
  assert.equal(bookings.length, 1);
  assert.equal(bookings[0].id, "booking-3");
});

test("POST /rooms/:id/bookings creates a booking", async () => {
  const response = await postBooking("room-1", {
    memberId: "member-3",
    start: "2026-11-04T14:00:00Z",
    end: "2026-11-04T16:00:00Z",
  });
  const booking = await response.json();

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), `/bookings/${booking.id}`);
  assert.equal(booking.status, "confirmed");
});

test("POST /rooms/:id/bookings enforces the member limit", async () => {
  const response = await postBooking("room-2", {
    memberId: "member-1",
    start: "2026-11-04T14:00:00Z",
    end: "2026-11-04T16:00:00Z",
  });

  assert.equal(response.status, 409);
});

test("simultaneous overlapping bookings cannot both succeed", async () => {
  const booking = {
    start: "2026-11-04T14:00:00Z",
    end: "2026-11-04T16:00:00Z",
  };

  const responses = await Promise.all([
    postBooking("room-1", { ...booking, memberId: "member-2" }),
    postBooking("room-1", { ...booking, memberId: "member-3" }),
  ]);
  const statuses = responses.map((response) => response.status).sort();

  assert.deepEqual(statuses, [201, 409]);
});

test("GET /bookings/:id returns one booking", async () => {
  const response = await fetch(`${baseUrl}/bookings/booking-1`);
  const booking = await response.json();

  assert.equal(response.status, 200);
  assert.equal(booking.id, "booking-1");
});

test("DELETE /bookings/:id cancels only once", async () => {
  const firstResponse = await fetch(`${baseUrl}/bookings/booking-1`, {
    method: "DELETE",
  });
  const secondResponse = await fetch(`${baseUrl}/bookings/booking-1`, {
    method: "DELETE",
  });

  assert.equal(firstResponse.status, 204);
  assert.equal(secondResponse.status, 409);
});

test("GET /members/:id/bookings returns member bookings", async () => {
  const response = await fetch(`${baseUrl}/members/member-1/bookings`);
  const bookings = await response.json();

  assert.equal(response.status, 200);
  assert.equal(bookings.length, 2);
});

test("room schedules are cached with a time limit", async () => {
  await fetch(
    `${baseUrl}/rooms/room-2/bookings?from=2026-11-02T00:00:00Z&to=2026-11-03T00:00:00Z`,
  );

  const keys = await valkey.keys("room-schedule:room-2:v0:*");
  const ttl = await valkey.ttl(keys[0]);

  assert.equal(keys.length, 1);
  assert.ok(ttl > 0 && ttl <= 60);
});

test("creating a booking invalidates the room schedule", async () => {
  const url = `${baseUrl}/rooms/room-1/bookings?from=2026-11-04T00:00:00Z&to=2026-11-05T00:00:00Z`;

  await fetch(url);
  await postBooking("room-1", {
    memberId: "member-3",
    start: "2026-11-04T14:00:00Z",
    end: "2026-11-04T16:00:00Z",
  });

  const response = await fetch(url);
  const bookings = await response.json();

  assert.equal(await valkey.get("room-schedule:room-1:version"), "1");
  assert.equal(bookings.length, 1);
});

test("cancelling a booking invalidates the room schedule", async () => {
  const url = `${baseUrl}/rooms/room-1/bookings?from=2026-11-03T00:00:00Z&to=2026-11-04T00:00:00Z`;

  await fetch(url);
  await fetch(`${baseUrl}/bookings/booking-1`, { method: "DELETE" });

  const response = await fetch(url);
  const bookings = await response.json();

  assert.equal(await valkey.get("room-schedule:room-1:version"), "1");
  assert.equal(bookings.length, 0);
});

function postBooking(roomId, body) {
  return fetch(`${baseUrl}/rooms/${roomId}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
