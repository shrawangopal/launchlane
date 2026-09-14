import { createProject } from "@/lib/domain";
import { createSchema, failure, identity, payload } from "@/lib/api";
import { insert, list } from "@/db/store";
export async function GET() {
  try {
    const user = await identity();
    return Response.json({ projects: await list(user.userId) });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const user = await identity();
    const data = createSchema.parse(await payload(req));
    const p = createProject(
      {
        ...data,
        id: crypto.randomUUID(),
        portalToken: crypto.randomUUID() + crypto.randomUUID(),
      },
      new Date().toISOString(),
    );
    await insert(p, user.userId);
    return Response.json({ project: p }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
