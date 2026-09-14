import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { Conflict } from "@/db/store";
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("approve_plan"),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("submit"),
    requirementId: z.string().max(100),
    value: z.string().max(10000),
  }),
  z.object({
    type: z.literal("review"),
    requirementId: z.string().max(100),
    decision: z.enum(["accept", "reject"]),
    note: z.string().max(2000),
  }),
  z.object({ type: z.literal("run") }),
  z.object({
    type: z.literal("approve_message"),
    messageId: z.string().max(100),
  }),
  z.object({ type: z.literal("kickoff"), at: z.string().max(50) }),
]);
export const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  service: z.enum(["website", "brand", "implementation"]),
  target: z.string().max(10),
  scope: z.string().min(80).max(30000),
  signed: z.boolean(),
});
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) throw new AuthError();
  return user;
}
class AuthError extends Error {
  constructor() {
    super("Sign in to open your workspace.");
  }
}
export async function payload(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new Error("Cross-origin writes are not allowed.");
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new Error("Send JSON content.");
  const raw = await req.text();
  if (raw.length > 50000) throw new Error("Request is too large.");
  return JSON.parse(raw);
}
export function failure(error: unknown) {
  if (error instanceof AuthError)
    return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof Conflict)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues.map((e) => e.message).join(" ") },
      { status: 400 },
    );
  console.error(
    "Launchlane request failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json(
    {
      error:
        error instanceof Error && !/D1|SQLITE|database/i.test(error.message)
          ? error.message
          : "Could not save or load the workspace. Please retry.",
    },
    { status: 400 },
  );
}
