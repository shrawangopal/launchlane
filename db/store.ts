import { env } from "cloudflare:workers";
import type { Project } from "@/lib/domain";
export function database(): D1Database {
  if (!env.DB) throw new Error("Database unavailable.");
  return env.DB;
}
export async function list(owner: string) {
  const rows = await database()
    .prepare(
      "SELECT body FROM launches WHERE owner = ? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(owner)
    .all<{ body: string }>();
  return rows.results.map((r) => JSON.parse(r.body) as Project);
}
export async function get(id: string, owner: string) {
  const row = await database()
    .prepare("SELECT body FROM launches WHERE id = ? AND owner = ?")
    .bind(id, owner)
    .first<{ body: string }>();
  return row ? (JSON.parse(row.body) as Project) : null;
}
export async function getByToken(token: string) {
  const hash = await digest(token);
  const row = await database()
    .prepare("SELECT body, owner FROM launches WHERE portal_hash = ?")
    .bind(hash)
    .first<{ body: string; owner: string }>();
  return row
    ? { project: JSON.parse(row.body) as Project, owner: row.owner }
    : null;
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function insert(p: Project, owner: string) {
  await database()
    .prepare(
      "INSERT INTO launches (id, owner, portal_hash, revision, created_at, body) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      p.id,
      owner,
      await digest(p.portalToken),
      p.revision,
      p.createdAt,
      JSON.stringify(p),
    )
    .run();
}
export async function save(p: Project, owner: string, previous: number) {
  const result = await database()
    .prepare(
      "UPDATE launches SET body = ?, revision = ? WHERE id = ? AND owner = ? AND revision = ?",
    )
    .bind(JSON.stringify(p), p.revision, p.id, owner, previous)
    .run();
  if (result.meta.changes !== 1) throw new Conflict();
}
export class Conflict extends Error {
  constructor() {
    super("This launch changed in another session. Refresh and retry.");
  }
}
