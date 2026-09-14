import { retrieve } from "@/lib/domain";
import { get } from "@/db/store";
import { failure, identity } from "@/lib/api";
export async function GET(req: Request) {
  try {
    const u = await identity();
    const q = new URL(req.url).searchParams;
    const id = q.get("project");
    const p = id ? await get(id, u.userId) : null;
    if (id && !p)
      return Response.json({ error: "Launch not found." }, { status: 404 });
    return Response.json({
      evidence: retrieve((q.get("q") || "").slice(0, 1000), p?.scope),
      mode: "BM25 evidence retrieval; no generated answer",
    });
  } catch (e) {
    return failure(e);
  }
}
