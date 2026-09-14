import { transition } from "@/lib/domain";
import { commandSchema, failure, identity, payload } from "@/lib/api";
import { get, save, Conflict } from "@/db/store";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, ctx: Context) {
  try {
    const u = await identity();
    const { id } = await ctx.params;
    const p = await get(id, u.userId);
    return p
      ? Response.json({ project: p })
      : Response.json({ error: "Launch not found." }, { status: 404 });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    const u = await identity();
    const { id } = await ctx.params;
    const p = await get(id, u.userId);
    if (!p)
      return Response.json({ error: "Launch not found." }, { status: 404 });
    const body = await payload(req);
    if (body.revision !== p.revision) throw new Conflict();
    const command = commandSchema.parse(body.command);
    const next = transition(
      p,
      command,
      u.displayName,
      new Date().toISOString(),
    );
    await save(next, u.userId, p.revision);
    return Response.json({ project: next });
  } catch (e) {
    return failure(e);
  }
}
