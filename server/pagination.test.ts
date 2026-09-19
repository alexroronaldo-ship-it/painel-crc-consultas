import { describe, expect, it } from "vitest";
import { paginateItems, TABLE_PAGE_SIZE } from "../client/src/lib/pagination";

describe("table pagination", () => {
  const activities = Array.from({ length: 12 }, (_, index) => index + 1);

  it("shows five activities on each complete page", () => {
    expect(TABLE_PAGE_SIZE).toBe(5);
    expect(paginateItems(activities, 1).items).toEqual([1, 2, 3, 4, 5]);
    expect(paginateItems(activities, 2).items).toEqual([6, 7, 8, 9, 10]);
  });

  it("shows the remaining activities on the final page", () => {
    const result = paginateItems(activities, 3);
    expect(result.items).toEqual([11, 12]);
    expect(result.totalPages).toBe(3);
    expect(result.startItem).toBe(11);
    expect(result.endItem).toBe(12);
  });

  it("keeps the requested page inside the valid range", () => {
    expect(paginateItems(activities, 99).page).toBe(3);
    expect(paginateItems([], 2).page).toBe(1);
  });
});
