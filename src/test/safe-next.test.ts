import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

describe("sign-in return path", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/upgrade?tier=pro#plans")).toBe("/upgrade?tier=pro#plans");
  });
  it("refuses backslash host forms", () => {
    expect(safeNextPath("/\\attacker.com")).toBe("/dashboard");
    expect(safeNextPath("/\\/attacker.com")).toBe("/dashboard");
  });
  it("refuses protocol-relative and absolute URLs", () => {
    expect(safeNextPath("//attacker.com")).toBe("/dashboard");
    expect(safeNextPath("https://attacker.com/x")).toBe("/dashboard");
  });
  it("refuses control characters", () => {
    expect(safeNextPath("/\t/attacker.com")).toBe("/dashboard");
  });
});
