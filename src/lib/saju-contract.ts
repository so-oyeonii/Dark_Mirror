import type { Profile } from "./profile";

// Shared contract for the independent engine and UI sessions. No birth data leaves the browser.
export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type SajuPillar = {
  stem: string;
  branch: string;
  stemElement: FiveElement;
  branchElement: FiveElement;
};
export type SajuResult = {
  status: "ready";
  pillars: { year: SajuPillar; month: SajuPillar; day: SajuPillar; hour: SajuPillar | null };
  elements: Record<FiveElement, number>;
  engine: { name: string; version: string };
  conventions: string[];
  warnings: string[];
} | {
  status: "missing" | "unsupported" | "error";
  message: string;
};
export type CalculateSaju = (profile: Profile) => Promise<SajuResult>;
