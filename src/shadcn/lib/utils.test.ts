/**
 * Tests for `cn`, the class-name helper every UI component uses to combine
 * Tailwind classes. It comes from the `cn` package (by the shadcn/ui author),
 * so these tests pin down the behaviour we rely on.
 */
import { describe, expect, it } from "vitest";
import { cn } from "@/shadcn/lib/utils";

describe("cn", () => {
  it("joins class names and skips falsy values", () => {
    expect(cn("px-2", false, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("lets a later Tailwind class override a conflicting earlier one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
