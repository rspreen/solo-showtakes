/**
 * Unit tests for reading where a request came from out of its headers.
 */
import { describe, expect, it } from "vitest";
import { requestContextFrom } from "./request-context";

describe("requestContextFrom", () => {
  it("takes the IP address from x-forwarded-for, and the user agent", () => {
    const context = requestContextFrom(
      new Headers({ "x-forwarded-for": "203.0.113.9", "user-agent": "Test Browser" }),
    );

    expect(context).toMatchObject({ ip: "203.0.113.9", userAgent: "Test Browser" });
  });

  it("uses the first address when x-forwarded-for lists several", () => {
    const context = requestContextFrom(
      new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
    );

    expect(context.ip).toBe("203.0.113.9");
  });

  it("leaves the IP address out when the header is missing", () => {
    expect(requestContextFrom(new Headers()).ip).toBeUndefined();
  });

  it("uses Vercel's request id when present", () => {
    const context = requestContextFrom(new Headers({ "x-vercel-id": "iad1::abc123" }));

    expect(context.requestId).toBe("iad1::abc123");
  });

  it("otherwise makes up a different id for each request", () => {
    const first = requestContextFrom(new Headers()).requestId;
    const second = requestContextFrom(new Headers()).requestId;

    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });
});
