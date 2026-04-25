import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("bootstrap smoke", () => {
  it("runs a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("exposes the cn() utility with Tailwind-merge semantics", () => {
    // Later class wins — confirms tailwind-merge is wired correctly.
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", undefined, "font-medium")).toBe("text-sm font-medium");
  });
});
