import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatThaiDateLong,
  formatThaiShortDate,
  toIsoDate,
} from "./format";

const value = "2026-08-21T09:02:46.868Z";

describe("date formatting", () => {
  it("formats a date with the Thai Buddhist calendar", () => {
    expect(formatDate(value)).toBe("21 ส.ค. 2569");
  });

  it("formats a short date with the Thai Buddhist calendar", () => {
    expect(formatThaiShortDate(value)).toBe("21 ส.ค. 69");
  });

  it("formats a date and time in the Bangkok timezone", () => {
    expect(formatDateTime(value)).toBe("21 ส.ค. 2569 16:02");
  });

  it("formats a full Thai Buddhist date for date inputs", () => {
    expect(formatThaiDateLong("2026-06-30")).toBe("30 มิถุนายน 2569");
    expect(formatThaiDateLong(null)).toBe("");
  });

  it("normalizes Mantine date strings and Date values to ISO", () => {
    expect(toIsoDate("2026-06-30")).toBe("2026-06-30T00:00:00.000Z");
    expect(toIsoDate(new Date("2026-06-30T00:00:00.000Z"))).toBe(
      "2026-06-30T00:00:00.000Z",
    );
    expect(toIsoDate("not-a-date")).toBeNull();
  });

  it.each([null, undefined, "not-a-date"]) (
    "returns a placeholder for an invalid date (%s)",
    (invalidValue) => {
      expect(formatDate(invalidValue)).toBe("-");
      expect(formatDateTime(invalidValue)).toBe("-");
      expect(formatThaiShortDate(invalidValue)).toBe("-");
    },
  );
});
