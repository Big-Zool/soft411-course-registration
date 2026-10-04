// The 4 automated checks. Test IDs (TC-xx) match the test case table in docs/REPORT.md.
const { test, expect } = require("@playwright/test");

const register = (request, studentId, courseCode) =>
  request.post("/api/registrations", { data: { studentId, courseCode } });

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("TC-02 badly formatted student IDs are rejected (equivalence partitioning)", async ({ request }) => {
  // 5 digits and 7 digits sit just either side of the valid 6.
  for (const badId of ["S12345", "S1234567", "100001", "s100001", ""]) {
    const res = await register(request, badId, "MATH101");
    expect(res.status(), `id "${badId}"`).toBe(400);
    expect((await res.json()).error).toBe("INVALID_STUDENT_ID");
  }
});

test("TC-05 going to 19 credits is refused and nothing changes (boundary value)", async ({ request }) => {
  // S100002 starts at 15 credits; SE411 is 4 credits -> 19.
  const res = await register(request, "S100002", "SE411");
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toBe("CREDIT_LIMIT");
  const schedule = await (await request.get("/api/students/S100002/schedule")).json();
  expect(schedule.totalCredits).toBe(15);
});

test("TC-06 missing prerequisite is refused (decision table)", async ({ request }) => {
  const res = await register(request, "S100001", "CS201");
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toBe("PREREQUISITE_MISSING");
});

test("TC-10 drop frees the seat, and dropping twice is refused (state transition)", async ({ request }) => {
  const seats = async () =>
    (await (await request.get("/api/courses")).json()).find((c) => c.code === "CS101").seatsLeft;

  const before = await seats();
  expect((await register(request, "S100001", "CS101")).status()).toBe(201);
  expect(await seats()).toBe(before - 1);

  const drop = await request.delete("/api/registrations", { data: { studentId: "S100001", courseCode: "CS101" } });
  expect(drop.status()).toBe(200);
  expect(await seats()).toBe(before);

  const dropAgain = await request.delete("/api/registrations", { data: { studentId: "S100001", courseCode: "CS101" } });
  expect(dropAgain.status()).toBe(404);
  expect((await dropAgain.json()).error).toBe("NOT_REGISTERED");
});
