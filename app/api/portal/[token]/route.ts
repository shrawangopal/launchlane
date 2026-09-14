import { transition } from "@/lib/domain";
import { commandSchema, failure, payload } from "@/lib/api";
import { getByToken, save, Conflict } from "@/db/store";
type Context = { params: Promise<{ token: string }> };
function view(p: import("@/lib/domain").Project) {
  return {
    id: p.id,
    name: p.name,
    target: p.target,
    service: p.service,
    approved: p.approved,
    kickoff: p.kickoff,
    revision: p.revision,
    requirements: p.requirements,
  };
}
export async function GET(_req: Request, ctx: Context) {
  try {
    const { token } = await ctx.params;
    const row = await getByToken(token);
    return row
      ? Response.json(
          { project: view(row.project) },
          {
            headers: {
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
            },
          },
        )
      : Response.json(
          { error: "This intake link is unavailable." },
          { status: 404 },
        );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    const { token } = await ctx.params;
    const row = await getByToken(token);
    if (!row)
      return Response.json({ error: "Intake not found." }, { status: 404 });
    const body = await payload(req);
    if (body.revision !== row.project.revision) throw new Conflict();
    const command = commandSchema.parse(body.command);
    if (command.type !== "submit")
      return Response.json(
        { error: "Client intake can submit inputs only." },
        { status: 403 },
      );
    const p = transition(
      row.project,
      command,
      "Client portal",
      new Date().toISOString(),
    );
    await save(p, row.owner, row.project.revision);
    return Response.json({ project: view(p) });
  } catch (e) {
    return failure(e);
  }
}
