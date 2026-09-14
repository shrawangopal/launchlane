import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  transition,
  stage,
  retrieve,
  validateValue,
  calendar,
  type Project,
} from "../lib/domain.ts";
const now = "2026-09-14T12:00:00.000Z";
function project(overrides = {}) {
  return createProject(
    {
      id: "p1",
      name: "Acme",
      email: "hello@acme.example",
      service: "website",
      target: "2026-09-21",
      signed: true,
      portalToken: "test-token",
      scope:
        "Signed website agreement. Build five pages for a new marketing website. Client supplies the content, brand assets, and a contact.",
      ...overrides,
    },
    now,
  );
}
function ready(): Project {
  let p = transition(project(), { type: "approve_plan" }, "operator", now);
  for (const r of p.requirements) {
    p = transition(
      p,
      {
        type: "submit",
        requirementId: r.id,
        value:
          r.kind === "email"
            ? "a@b.example"
            : r.kind === "url"
              ? "https://example.com/assets"
              : "A complete brief describing target audience, owner, deliverables, and the measurable success criteria.",
      },
      "client",
      now,
    );
    if (r.review)
      p = transition(
        p,
        {
          type: "review",
          requirementId: r.id,
          decision: "accept",
          note: "Verified content and access for this requirement.",
        },
        "operator",
        now,
      );
  }
  return transition(p, { type: "run" }, "operator", now);
}
test("unsigned scope cannot be approved", () => {
  assert.throws(
    () =>
      transition(
        project({ signed: false }),
        { type: "approve_plan" },
        "operator",
        now,
      ),
    /signed agreement/,
  );
});
test("service mismatch requires explicit resolution", () => {
  const p = project({ service: "implementation" });
  assert.ok(p.clarification.length);
  assert.throws(
    () => transition(p, { type: "approve_plan" }, "operator", now),
    /clarification/,
  );
});
test("agent cannot provision before approval", () => {
  assert.throws(
    () => transition(project(), { type: "run" }, "operator", now),
    /Approve/,
  );
});
test("portal cannot submit before approval", () => {
  assert.throws(
    () =>
      transition(
        project(),
        { type: "submit", requirementId: "contact", value: "a@b.example" },
        "client",
        now,
      ),
    /approved/,
  );
});
test("short briefs, credentials, unsafe links rejected", () => {
  const p = project();
  assert.ok(validateValue(p.requirements[1], "hello"));
  assert.ok(
    validateValue(
      p.requirements[1],
      "password: supersecret and other very long useful information",
    ),
  );
  assert.ok(validateValue(p.requirements[2], "http://example.com"));
  assert.ok(validateValue(p.requirements[2], "https://user:pass@example.com"));
  assert.ok(validateValue(p.requirements[0], "invalid"));
});
test("URL format does not silently approve asset content", () => {
  let p = transition(project(), { type: "approve_plan" }, "operator", now);
  p = transition(
    p,
    {
      type: "submit",
      requirementId: "assets",
      value: "https://example.com/assets",
    },
    "client",
    now,
  );
  assert.equal(p.requirements[2].status, "review");
});
test("rejected input can be corrected and re-reviewed", () => {
  let p = transition(project(), { type: "approve_plan" }, "operator", now);
  p = transition(
    p,
    {
      type: "submit",
      requirementId: "assets",
      value: "https://example.com/assets",
    },
    "client",
    now,
  );
  p = transition(
    p,
    {
      type: "review",
      requirementId: "assets",
      decision: "reject",
      note: "Link is not accessible to the team.",
    },
    "operator",
    now,
  );
  assert.equal(p.requirements[2].status, "rejected");
  p = transition(
    p,
    {
      type: "submit",
      requirementId: "assets",
      value: "https://example.com/new-assets",
    },
    "client",
    now,
  );
  assert.equal(p.requirements[2].status, "review");
});
test("run is idempotent for workspace artifacts and messages", () => {
  let p = ready();
  const ids = p.artifacts.map((a) => a.id);
  p = transition(p, { type: "run" }, "operator", now);
  assert.deepEqual(
    p.artifacts.map((a) => a.id),
    ids,
  );
  assert.equal(p.messages.length, 1);
  assert.equal(stage(p), "Ready for kickoff");
});
test("missing inputs block kickoff", () => {
  const p = transition(project(), { type: "approve_plan" }, "operator", now);
  assert.throws(
    () =>
      transition(
        p,
        { type: "kickoff", at: "2026-09-21T10:00:00Z" },
        "operator",
        now,
      ),
    /Accept every input/,
  );
});
test("changed accepted input invalidates generated handoff", () => {
  let p = ready();
  p = transition(
    p,
    { type: "submit", requirementId: "contact", value: "new@b.example" },
    "client",
    now,
  );
  assert.equal(stage(p), "Collecting inputs");
  assert.throws(() =>
    transition(
      p,
      { type: "kickoff", at: "2026-09-21T10:00:00Z" },
      "operator",
      now,
    ),
  );
  p = transition(p, { type: "run" }, "operator", now);
  assert.equal(stage(p), "Ready for kickoff");
  assert.match(
    p.artifacts.find((a) => a.id === "handoff")!.content,
    /new@b.example/,
  );
});
test("kickoff generates an event, closes intake, rejects past time", () => {
  let p = ready();
  assert.throws(
    () =>
      transition(
        p,
        { type: "kickoff", at: "2026-09-01T10:00:00Z" },
        "operator",
        now,
      ),
    /future/,
  );
  p = transition(
    p,
    { type: "kickoff", at: "2026-09-21T10:00:00Z" },
    "operator",
    now,
  );
  assert.equal(stage(p), "Kickoff confirmed");
  assert.match(
    p.artifacts.find((a) => a.id === "calendar")!.content,
    /DTSTART:20260921T100000Z/,
  );
  assert.throws(
    () =>
      transition(
        p,
        { type: "submit", requirementId: "contact", value: "new@a.example" },
        "client",
        now,
      ),
    /closed/,
  );
});
test("calendar fields cannot inject extra events", () => {
  const p = ready();
  p.name = "Acme\nBEGIN:VEVENT";
  p.kickoff = "2026-09-21T10:00:00Z";
  assert.equal(calendar(p, now).split("\r\nBEGIN:VEVENT").length, 2);
});
test("unsupported queries return no fabricated answer", () =>
  assert.deepEqual(retrieve("xylophonemeteorite"), []));
test("retrieval finds scope and exact policy evidence", () => {
  assert.equal(
    retrieve("sandbox administrator least privilege access")[0].id,
    "PB-08",
  );
  assert.ok(
    retrieve(
      "custom booking excluded",
      "Custom booking software is excluded.",
    ).some((d) => d.id === "SOW-1"),
  );
});
test("transitions do not mutate original input", () => {
  const p = project();
  const next = transition(p, { type: "approve_plan" }, "operator", now);
  assert.equal(p.approved, false);
  assert.equal(next.approved, true);
  assert.equal(next.revision, p.revision + 1);
});
test("message approval never claims delivery", () => {
  let p = ready();
  p = transition(
    p,
    { type: "approve_message", messageId: "welcome" },
    "operator",
    now,
  );
  assert.equal(p.messages[0].status, "approved");
  assert.match(p.events.at(-1)!.detail, /no email sent/);
});
