import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateTimeForCrm,
  getActivityDateParts,
  isDateKeyInRange,
  parseCrmDateTime,
} from "./dateTime.js";

test("offset-bearing CRM datetimes remain the same instant in each device zone", () => {
  const source = "2026-01-15T09:00:00+11:00";
  const expectedEpoch = new Date(source).getTime();

  for (const zone of [
    "Asia/Shanghai",
    "Australia/Adelaide",
    "America/Los_Angeles",
  ]) {
    assert.equal(parseCrmDateTime(source, zone)?.valueOf(), expectedEpoch);
  }

  assert.equal(
    formatDateTimeForCrm(source, "Asia/Shanghai"),
    "2026-01-15T06:00:00+08:00"
  );
  assert.equal(
    formatDateTimeForCrm(source, "America/Los_Angeles"),
    "2026-01-14T14:00:00-08:00"
  );
});

test("legacy offset-less values keep their wall time and use selected-date DST", () => {
  assert.equal(
    formatDateTimeForCrm("2026-01-15T09:00:00", "Australia/Adelaide"),
    "2026-01-15T09:00:00+10:30"
  );
  assert.equal(
    formatDateTimeForCrm("2026-07-15T09:00:00", "Australia/Adelaide"),
    "2026-07-15T09:00:00+09:30"
  );
  assert.equal(
    formatDateTimeForCrm("2026-01-15T09:00:00", "America/Los_Angeles"),
    "2026-01-15T09:00:00-08:00"
  );
  assert.equal(
    formatDateTimeForCrm("2026-07-15T09:00:00", "America/Los_Angeles"),
    "2026-07-15T09:00:00-07:00"
  );
});

test("missing timestamps stay missing instead of falling back to now", () => {
  assert.equal(parseCrmDateTime(null), null);
  assert.deepEqual(getActivityDateParts(undefined), {
    dateLabel: "—",
    dateKey: null,
    timeLabel: "--:--",
    timestamp: null,
  });
});

test("date-only filtering compares calendar strings without timezone conversion", () => {
  assert.equal(isDateKeyInRange("2026-09-30", "2026-09-30", "2026-10-01"), true);
  assert.equal(isDateKeyInRange("2026-10-02", "2026-09-30", "2026-10-01"), false);
  assert.equal(isDateKeyInRange("30/09/2026", "2026-09-30", "2026-10-01"), false);
});
