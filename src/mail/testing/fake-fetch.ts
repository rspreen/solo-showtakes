/**
 * Test helper: a stand-in for `fetch` that records each request and answers
 * with a canned reply, so mail adapters can be unit tested with no network.
 */

/** One request the fake received. */
export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Builds a fake `fetch` that answers every request with `status` and the
 * JSON `reply`. Requests it received are in `requests`.
 */
export function createFakeFetch(reply: unknown, status = 200) {
  const requests: RecordedRequest[] = [];

  const fakeFetch: typeof fetch = async (input, init) => {
    requests.push({
      url: input.toString(),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify(reply), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };

  return { fetch: fakeFetch, requests };
}
