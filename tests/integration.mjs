/** Local-only integration tests. Creates one retained test launch, never deletes data. */
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Integration suite only runs against loopback.",
);
const login = await fetch(base + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Local development sign-in cookie required.");
async function api(path, body, auth = true, extra = {}) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(auth ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json().catch(() => ({ error: "Non-JSON rejection" })),
  };
}
assert.equal((await api("/api/projects", null, false)).status, 401);
assert.equal(
  (
    await api("/api/projects", null, false, {
      "oai-authenticated-user-id": "spoof",
      "oai-authenticated-user-email": "x@y.test",
    })
  ).status,
  401,
);
assert.ok(
  [400, 403].includes(
    (
      await api("/api/projects", { name: "bad" }, true, {
        Origin: "https://evil.example",
      })
    ).status,
  ),
);
const now = Date.now(),
  target = new Date(now + 7 * 86400000).toISOString().slice(0, 10);
let { status, data } = await api("/api/projects", {
  name: "Integration verification " + now,
  email: "owner@example.com",
  service: "website",
  target,
  signed: true,
  scope:
    "Signed website scope. Build a marketing website with five pages. Client will supply brand assets, website content, an accountable contact, and a success brief.",
});
assert.equal(status, 201);
let p = data.project;
const endpoint = "/api/projects/" + encodeURIComponent(p.id);
const command = (c) => api(endpoint, { revision: p.revision, command: c });
assert.equal((await command({ type: "run" })).status, 400);
const approved = await command({ type: "approve_plan" });
assert.equal(approved.status, 200);
p = approved.data.project;
const concurrent = await Promise.all([
  command({ type: "run" }),
  command({ type: "run" }),
]);
assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
p = concurrent.find((r) => r.status === 200).data.project;
assert.equal(p.artifacts.filter((a) => a.kind === "folder").length, 3);
const portal = "/api/portal/" + p.portalToken;
const pv = await api(portal, null, false);
assert.equal(pv.status, 200);
assert.equal(pv.data.project.scope, undefined);
assert.equal(pv.data.project.events, undefined);
assert.equal(pv.data.project.portalToken, undefined);
assert.equal(
  (
    await api(
      portal,
      { revision: p.revision, command: { type: "approve_plan" } },
      false,
    )
  ).status,
  403,
);
for (const r of p.requirements) {
  const value =
    r.kind === "email"
      ? "client@example.com"
      : r.kind === "url"
        ? "https://example.com/assets"
        : "The marketing owner will provide approved materials for the intended audience and measure success by qualified inquiries.";
  const submission = await api(
    portal,
    {
      revision: p.revision,
      command: { type: "submit", requirementId: r.id, value },
    },
    false,
  );
  assert.equal(submission.status, 200);
  p = (await api(endpoint)).data.project;
  if (r.review) {
    const reviewed = await command({
      type: "review",
      requirementId: r.id,
      decision: "accept",
      note: "Reviewed the test input and verified it against the checklist.",
    });
    assert.equal(reviewed.status, 200);
    p = reviewed.data.project;
  }
}
const run = await command({ type: "run" });
assert.equal(run.status, 200);
p = run.data.project;
assert.ok(p.artifacts.some((a) => a.id === "handoff"));
const kickoff = await command({
  type: "kickoff",
  at: new Date(now + 8 * 86400000).toISOString(),
});
assert.equal(kickoff.status, 200);
p = kickoff.data.project;
assert.equal(
  (
    await api(
      portal,
      {
        revision: p.revision,
        command: {
          type: "submit",
          requirementId: "contact",
          value: "new@example.com",
        },
      },
      false,
    )
  ).status,
  400,
);
assert.equal(
  (await api("/api/portal/not-a-real-token", null, false)).status,
  404,
);
const readback = (await api(endpoint)).data.project;
assert.equal(readback.kickoff, p.kickoff);
assert.equal(readback.artifacts.filter((a) => a.id === "calendar").length, 1);
await mkdir("work", { recursive: true });
await writeFile(
  "work/verified-workspace.json",
  JSON.stringify(
    { client: p.name, scope: p.scope, artifacts: p.artifacts },
    null,
    2,
  ),
);
console.log(
  "PASS: authentication, spoofed headers, origin checks, approval gates, optimistic concurrency, portal isolation, intake, reviews, provisioning, calendar creation, persistence.",
);
console.log("Retained test project: " + p.id);
