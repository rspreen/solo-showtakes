/**
 * Test helper: reads and clears the local Mailpit inbox through its HTTP
 * API, so integration tests can check which emails were sent.
 *
 * Tests share one inbox and run in parallel, so each test sends to its own
 * unique address (`uniqueTestAddress()`), looks only at mail to that
 * address, and deletes it afterwards.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

/** An email as Mailpit lists it (the fields our tests use). */
export interface InboxMessage {
  ID: string;
  Subject: string;
  From: { Name: string; Address: string };
  To: { Name: string; Address: string }[];
}

/** Mailpit's address, from MAILPIT_URL (see .env.example). */
export function mailpitUrl(): string {
  const url = process.env.MAILPIT_URL;
  if (!url) {
    throw new Error(
      "MAILPIT_URL is not set. Copy it from .env.example into .env.",
    );
  }
  return url;
}

/** A recipient address no other test uses. */
export function uniqueTestAddress(): string {
  return `mail-test-${randomUUID()}@example.com`;
}

/** Every message in the inbox addressed to `address`. */
export async function messagesTo(address: string): Promise<InboxMessage[]> {
  const searchUrl = new URL("/api/v1/search", mailpitUrl());
  searchUrl.searchParams.set("query", `to:"${address}"`);
  const reply = (await callMailpit(searchUrl, { method: "GET" })) as {
    messages: InboxMessage[];
  };
  return reply.messages;
}

/** Deletes every message addressed to `address`. */
export async function deleteMessagesTo(address: string): Promise<void> {
  const ids = (await messagesTo(address)).map((message) => message.ID);
  if (ids.length === 0) return;
  await callMailpit(new URL("/api/v1/messages", mailpitUrl()), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: ids }),
  });
}

/**
 * Makes one request to Mailpit's API and returns its reply (parsed if
 * JSON), with a clear message if Mailpit is not running.
 */
async function callMailpit(url: URL, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Cannot reach Mailpit at ${url.origin}. Start it with \`pnpm services:up\` (needs OrbStack running).`,
      { cause: error },
    );
  }
  if (!response.ok) {
    throw new Error(
      `Mailpit answered ${response.status} to ${init.method} ${url.pathname}: ${await response.text()}`,
    );
  }
  const isJson = response.headers.get("content-type")?.includes("json");
  return isJson ? response.json() : response.text();
}
