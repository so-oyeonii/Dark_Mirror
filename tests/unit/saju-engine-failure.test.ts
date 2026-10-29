import { expect, it, vi } from "vitest";
import { EMPTY_PROFILE } from "@/lib/profile";
import { calculateSaju } from "@/lib/saju";

vi.mock("manseryeok", () => { throw new Error("private-internal-detail"); });

it("returns a safe error if the local engine chunk cannot load", async () => {
  const result = await calculateSaju({ ...EMPTY_PROFILE, birthYear: "2000", birthMonth: "7", birthDay: "18", birthTime: "12:00" });
  expect(result.status).toBe("error");
  expect(JSON.stringify(result)).not.toContain("private-internal-detail");
  expect(result).not.toHaveProperty("pillars");
});
