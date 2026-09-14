import { examples } from "@/lib/demo";
import { failure, identity, payload } from "@/lib/api";
import { database, digest, list } from "@/db/store";
export async function POST(req: Request) {
  try {
    const u = await identity();
    await payload(req);
    const existing = await list(u.userId);
    if (existing.length) return Response.json({ projects: existing });
    const projects = examples(new Date().toISOString());
    const statements = await Promise.all(
      projects.map(async (p) =>
        database()
          .prepare(
            "INSERT INTO launches (id, owner, portal_hash, revision, created_at, body) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            `demo-${u.userId}-${p.service}`,
            u.userId,
            await digest(p.portalToken),
            p.revision,
            p.createdAt,
            JSON.stringify({ ...p, id: `demo-${u.userId}-${p.service}` }),
          ),
      ),
    );
    try {
      await database().batch(statements);
    } catch {
      const current = await list(u.userId);
      if (current.length) return Response.json({ projects: current });
      throw new Error("Could not create the demo workspace. Retry.");
    }
    return Response.json({ projects: await list(u.userId) });
  } catch (e) {
    return failure(e);
  }
}
