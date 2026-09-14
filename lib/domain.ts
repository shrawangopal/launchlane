/** Pure workflow engine. It has no network, clock, storage, or model side effects. */
export type Service = "website" | "brand" | "implementation";
export type Requirement = {
  id: string;
  title: string;
  help: string;
  kind: "email" | "text" | "url";
  review: boolean;
  source: string;
  quote: string;
  value: string;
  status: "missing" | "review" | "accepted" | "rejected";
  feedback: string;
};
export type Evidence = {
  id: string;
  title: string;
  text: string;
  score: number;
};
export type Event = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};
export type Artifact = {
  id: string;
  name: string;
  kind: "folder" | "document" | "tasks" | "calendar";
  content: string;
};
export type Project = {
  id: string;
  name: string;
  email: string;
  service: Service;
  target: string;
  scope: string;
  signed: boolean;
  approved: boolean;
  revision: number;
  createdAt: string;
  requirements: Requirement[];
  artifacts: Artifact[];
  events: Event[];
  messages: {
    id: string;
    subject: string;
    body: string;
    status: "draft" | "approved";
  }[];
  kickoff: string | null;
  portalToken: string;
  runs: number;
  clarification: string[];
};
export const services: Record<Service, string> = {
  website: "Website launch",
  brand: "Brand identity",
  implementation: "Software implementation",
};
export const playbooks = [
  {
    id: "PB-01",
    title: "Every client · accountable contact",
    text: "Every launch needs one accountable client contact with a valid email address. The contact approves decisions and resolves missing inputs.",
  },
  {
    id: "PB-02",
    title: "Every client · success brief",
    text: "Before kickoff, collect a written success brief describing objectives, audience, and a measurable outcome. The operations owner must review and accept the brief.",
  },
  {
    id: "PB-03",
    title: "Website · brand assets",
    text: "Website projects require a HTTPS link to a shared brand asset folder containing the approved logo and brand guidelines. The operations owner checks permissions and content before accepting.",
  },
  {
    id: "PB-04",
    title: "Website · content inventory",
    text: "Website projects require a page and content inventory. Record planned pages, content owners, and outstanding copy. Review the inventory before kickoff.",
  },
  {
    id: "PB-05",
    title: "Brand · creative direction",
    text: "Brand identity projects require an approved creative direction describing the audience, positioning, and visual references. Review it before kickoff.",
  },
  {
    id: "PB-06",
    title: "Brand · reference assets",
    text: "Brand identity projects require a HTTPS link to existing brand assets or a reference folder. The operations owner checks access and content.",
  },
  {
    id: "PB-07",
    title: "Implementation · systems map",
    text: "Software implementation projects require a systems map identifying source and destination systems, data owners, and a test environment. Review the map before kickoff.",
  },
  {
    id: "PB-08",
    title: "Implementation · access plan",
    text: "Software implementation projects require an access plan naming the administrator, minimum roles, and how a sandbox invitation will be provided. Never collect passwords or API keys through intake.",
  },
  {
    id: "PB-09",
    title: "Launch · approvals and workspace",
    text: "Provision a local project workspace only after the operator approves the scope-based plan and attests that the agreement is signed. Kickoff is blocked until every required input is accepted. Generate a handoff brief and a task manifest from accepted inputs.",
  },
  {
    id: "PB-10",
    title: "Launch · communication policy",
    text: "Welcome and reminder messages are drafts. An operator reviews and approves messages before exporting them for delivery. Never claim that a draft was sent or that a calendar invitation was delivered.",
  },
];
const stop = new Set(
  "a an the is are to of in for and or with from this that our we your it on as be by at".split(
    " ",
  ),
);
export function tokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((t) => !stop.has(t)) ?? []
  );
}
/** BM25 lexical retrieval. Exact source passages are returned; no generated claims. */
export function retrieve(query: string, scope = "", limit = 4): Evidence[] {
  const docs = [
    ...playbooks,
    ...scope
      .split(/\n+/)
      .map((text, i) => ({
        id: `SOW-${i + 1}`,
        title: `Signed scope · paragraph ${i + 1}`,
        text,
      }))
      .filter((d) => d.text.trim()),
  ];
  const bags = docs.map((d) => tokens(d.title + " " + d.text));
  const avg = bags.reduce((n, b) => n + b.length, 0) / bags.length;
  const q = [...new Set(tokens(query))];
  return docs
    .map((d, i) => ({
      ...d,
      score: q.reduce((score, t) => {
        const freq = bags[i].filter((w) => w === t).length;
        const df = bags.filter((b) => b.includes(t)).length;
        return (
          score +
          (freq
            ? (Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)) *
                freq *
                2.2) /
              (freq + 1.2 * (0.25 + (0.75 * bags[i].length) / avg))
            : 0)
        );
      }, 0),
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
function req(
  id: string,
  title: string,
  help: string,
  kind: Requirement["kind"],
  source: string,
  review = true,
): Requirement {
  const evidence = playbooks.find((d) => d.id === source)!;
  return {
    id,
    title,
    help,
    kind,
    source,
    quote: evidence.text,
    review,
    value: "",
    status: "missing",
    feedback: "",
  };
}
export function requirements(service: Service): Requirement[] {
  const common = [
    req(
      "contact",
      "Accountable client contact",
      "Email of the person who can approve project decisions.",
      "email",
      "PB-01",
      false,
    ),
    req(
      "brief",
      "Success brief",
      "Describe the objective, audience, and how success will be measured (at least 40 characters).",
      "text",
      "PB-02",
    ),
  ];
  const specific: Record<Service, Requirement[]> = {
    website: [
      req(
        "assets",
        "Brand asset folder",
        "Share a HTTPS link. An operator will verify access and the files.",
        "url",
        "PB-03",
      ),
      req(
        "content",
        "Page & content inventory",
        "List the pages, content owners, and any missing copy (at least 40 characters).",
        "text",
        "PB-04",
      ),
    ],
    brand: [
      req(
        "direction",
        "Creative direction",
        "Describe positioning, audience, and visual references (at least 40 characters).",
        "text",
        "PB-05",
      ),
      req(
        "assets",
        "Reference asset folder",
        "Share a HTTPS link to existing assets or references.",
        "url",
        "PB-06",
      ),
    ],
    implementation: [
      req(
        "systems",
        "Systems map",
        "Name the source, destination, data owner, and test environment (at least 40 characters).",
        "text",
        "PB-07",
      ),
      req(
        "access",
        "Sandbox access plan",
        "Name the administrator and required roles. Do not paste passwords or keys.",
        "text",
        "PB-08",
      ),
    ],
  };
  return [...common, ...specific[service]];
}
export function stage(p: Project): string {
  if (p.kickoff) return "Kickoff confirmed";
  if (!p.approved) return "Plan review";
  if (
    p.requirements.every((r) => r.status === "accepted") &&
    p.artifacts.some(
      (a) => a.id === "handoff" && !a.content.startsWith("OUTDATED"),
    )
  )
    return "Ready for kickoff";
  return "Collecting inputs";
}
export function progress(p: Project): number {
  const n = p.requirements.filter((r) => r.status === "accepted").length;
  return Math.round(
    (((p.approved ? 1 : 0) +
      n +
      (p.artifacts.some((a) => a.id === "handoff") ? 1 : 0) +
      (p.kickoff ? 1 : 0)) /
      (p.requirements.length + 3)) *
      100,
  );
}
export function event(
  p: Project,
  actor: string,
  action: string,
  detail: string,
  now: string,
) {
  p.events.push({
    id: `evt-${p.events.length + 1}`,
    at: now,
    actor,
    action,
    detail,
  });
}
export function createProject(
  input: {
    id: string;
    name: string;
    email: string;
    service: Service;
    target: string;
    scope: string;
    signed: boolean;
    portalToken: string;
  },
  now: string,
): Project {
  if (!input.name.trim() || input.name.length > 100)
    throw new Error("Client name must be 1–100 characters.");
  if (!validEmail(input.email)) throw new Error("Enter a valid client email.");
  if (!(input.service in services))
    throw new Error("Choose a supported service.");
  if (input.scope.trim().length < 80 || input.scope.length > 30000)
    throw new Error("The scope must contain 80–30,000 characters.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.target) ||
    !Number.isFinite(Date.parse(input.target))
  )
    throw new Error("Enter a valid target date.");
  const p: Project = {
    ...input,
    name: input.name.trim(),
    email: input.email.trim(),
    revision: 0,
    createdAt: now,
    approved: false,
    requirements: requirements(input.service),
    artifacts: [],
    events: [],
    messages: [],
    kickoff: null,
    runs: 0,
    clarification: [],
  };
  const signatures: Record<Service, RegExp> = {
    website: /website|web design|web development|landing page/i,
    brand: /brand|identity|logo/i,
    implementation: /implementation|integration|migration|software/i,
  };
  if (!signatures[input.service].test(input.scope))
    p.clarification.push(
      "The selected service is not clearly named in the scope. Confirm the service before approving the plan.",
    );
  if (/\bnot signed\b|\bunsigned\b|\bdraft agreement\b/i.test(input.scope))
    p.clarification.push(
      "The scope describes an unsigned or draft agreement. Resolve this before approving.",
    );
  event(
    p,
    "agent",
    "plan.created",
    `Mapped ${p.requirements.length} requirements using ${services[p.service]} playbooks. Review coverage against the full scope before approval.`,
    now,
  );
  return p;
}
export function validEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.length <= 254;
}
export function validateValue(r: Requirement, value: string): string | null {
  if (value.length > 10000) return "Keep the response under 10,000 characters.";
  if (
    /\b(sk-[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9]{15,})\b|(?:password|api[_ -]?key|secret)\s*[:=]\s*\S+/i.test(
      value,
    )
  )
    return "Remove passwords, secrets, and API keys. Describe how access will be granted instead.";
  if (r.kind === "email" && !validEmail(value))
    return "Enter a valid email address.";
  if (r.kind === "url") {
    try {
      const u = new URL(value);
      if (
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        !u.hostname.includes(".")
      )
        return "Use a HTTPS link without embedded credentials.";
    } catch {
      return "Enter a valid HTTPS link.";
    }
  }
  if (r.kind === "text" && value.trim().length < 40)
    return "Please provide at least 40 characters so the operator can review this input.";
  return null;
}
export type Command =
  | { type: "approve_plan"; note?: string }
  | { type: "submit"; requirementId: string; value: string }
  | {
      type: "review";
      requirementId: string;
      decision: "accept" | "reject";
      note: string;
    }
  | { type: "run" }
  | { type: "approve_message"; messageId: string }
  | { type: "kickoff"; at: string };
function addArtifact(p: Project, a: Artifact) {
  const i = p.artifacts.findIndex((x) => x.id === a.id);
  if (i < 0) p.artifacts.push(a);
  else p.artifacts[i] = a;
}
/** Apply to a clone; caller persists with an optimistic revision check. */
export function transition(
  original: Project,
  command: Command,
  actor: string,
  now: string,
): Project {
  const p = structuredClone(original);
  if (command.type === "approve_plan") {
    if (p.approved) throw new Error("This plan is already approved.");
    if (!p.signed)
      throw new Error(
        "A signed agreement is required. Create a launch with the signed scope.",
      );
    if (
      p.clarification.length &&
      (!command.note || command.note.trim().length < 20)
    )
      throw new Error(
        "Explain how you resolved the scope clarification (at least 20 characters).",
      );
    p.approved = true;
    event(
      p,
      actor,
      "plan.approved",
      command.note?.trim() ||
        "Reviewed scope coverage and approved the onboarding requirements.",
      now,
    );
  } else if (command.type === "submit") {
    if (!p.approved)
      throw new Error("The launch plan must be approved before intake opens.");
    if (p.kickoff)
      throw new Error("Kickoff is already confirmed. This intake is closed.");
    const r = p.requirements.find((x) => x.id === command.requirementId);
    if (!r) throw new Error("Requirement not found.");
    const value = command.value.trim(),
      error = validateValue(r, value);
    if (error) throw new Error(error);
    r.value = value;
    r.status = r.review ? "review" : "accepted";
    r.feedback = r.review
      ? "Submitted. An operator must verify the content."
      : "Email format validated; mailbox ownership is not verified.";
    // A changed input invalidates readiness until the agent regenerates the handoff.
    const handoff = p.artifacts.find((a) => a.id === "handoff");
    if (handoff)
      handoff.content =
        "OUTDATED — run the agent after all inputs are accepted to regenerate this brief.";
    event(
      p,
      actor,
      "input.submitted",
      `${r.title}: ${r.status === "review" ? "awaiting review" : "format accepted"}.`,
      now,
    );
  } else if (command.type === "review") {
    if (p.kickoff) throw new Error("This intake is closed.");
    const r = p.requirements.find((x) => x.id === command.requirementId);
    if (!r || r.status !== "review")
      throw new Error("This input is not awaiting review.");
    if (command.note.trim().length < 8)
      throw new Error("Add a review note explaining your decision.");
    r.status = command.decision === "accept" ? "accepted" : "rejected";
    r.feedback = command.note.trim();
    event(p, actor, `input.${r.status}`, `${r.title}: ${r.feedback}`, now);
  } else if (command.type === "run") {
    if (!p.approved)
      throw new Error("Approve the launch plan before running the agent.");
    p.runs++;
    if (!p.artifacts.some((a) => a.id === "root")) {
      ["root", "inputs", "deliverables"].forEach((id) =>
        addArtifact(p, {
          id,
          name:
            id === "root"
              ? p.name
              : id === "inputs"
                ? "01 · Client inputs"
                : "02 · Deliverables",
          kind: "folder",
          content: id === "root" ? "/" : `/${p.id}/${id}`,
        }),
      );
      event(
        p,
        "agent",
        "workspace.provisioned",
        "Created and verified 3 workspace folder records in Launchlane. No external drive was modified.",
        now,
      );
    }
    if (!p.messages.some((m) => m.id === "welcome")) {
      p.messages.push({
        id: "welcome",
        subject: `Your ${services[p.service].toLowerCase()} starts here`,
        body: `Hi ${p.name},\n\nYour onboarding workspace is ready. Please provide:\n${p.requirements.map((r) => `• ${r.title}: ${r.help}`).join("\n")}\n\nTarget kickoff: ${p.target}. We will confirm a time after the prerequisites are accepted.`,
        status: "draft",
      });
      event(
        p,
        "agent",
        "message.drafted",
        "Prepared the welcome message for operator approval. Nothing has been sent.",
        now,
      );
    }
    const outstanding = p.requirements.filter((r) => r.status !== "accepted");
    if (outstanding.length) {
      event(
        p,
        "agent",
        "run.waiting",
        `Waiting for ${outstanding.map((r) => `${r.title} (${r.status})`).join(", ")}. No kickoff action taken.`,
        now,
      );
    } else {
      addArtifact(p, {
        id: "handoff",
        name: "Kickoff handoff.md",
        kind: "document",
        content: `# ${p.name} — Kickoff handoff\n\nService: ${services[p.service]}\nTarget: ${p.target}\n\n## Approved scope\n${p.scope}\n\n## Accepted client inputs\n${p.requirements.map((r) => `### ${r.title}\n${r.value}\n\nEvidence: ${r.source}\nReview: ${r.feedback}\n`).join("\n")}\n## Agenda\n1. Confirm objectives and success criteria\n2. Walk through deliverables and responsibilities\n3. Agree milestones, communication, and next actions\n`,
      });
      addArtifact(p, {
        id: "tasks",
        name: "Onboarding tasks.json",
        kind: "tasks",
        content: JSON.stringify(
          p.requirements.map((r) => ({
            title: r.title,
            status: r.status,
            source: r.source,
            review: r.feedback,
          })),
          null,
          2,
        ),
      });
      event(
        p,
        "agent",
        "handoff.verified",
        "Verified all inputs are accepted. Generated the handoff brief and task manifest. Ready for a confirmed kickoff time.",
        now,
      );
    }
  } else if (command.type === "approve_message") {
    const m = p.messages.find((x) => x.id === command.messageId);
    if (!m || m.status !== "draft") throw new Error("No draft message found.");
    m.status = "approved";
    event(
      p,
      actor,
      "message.approved",
      "Message approved for export. Delivery remains manual; no email sent.",
      now,
    );
  } else if (command.type === "kickoff") {
    if (
      stage(p) !== "Ready for kickoff" ||
      p.artifacts
        .find((a) => a.id === "handoff")
        ?.content.startsWith("OUTDATED")
    )
      throw new Error(
        "Accept every input and run the agent before confirming kickoff.",
      );
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/.test(command.at) ||
      !Number.isFinite(Date.parse(command.at)) ||
      Date.parse(command.at) <= Date.parse(now)
    )
      throw new Error("Choose a valid future kickoff time.");
    p.kickoff = command.at;
    addArtifact(p, {
      id: "calendar",
      name: "Kickoff.ics",
      kind: "calendar",
      content: calendar(p, now),
    });
    event(
      p,
      actor,
      "kickoff.confirmed",
      `Operator confirmed ${command.at}. Calendar file generated; invitations have not been sent.`,
      now,
    );
  }
  p.revision++;
  return p;
}
export function calendar(p: Project, now: string) {
  const fmt = (v: string) =>
    new Date(v)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const esc = (v: string) =>
    v
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Launchlane//Client Launch//EN",
    "BEGIN:VEVENT",
    `UID:${p.id}@launchlane.local`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(p.kickoff!)}`,
    `DTEND:${fmt(new Date(Date.parse(p.kickoff!) + 3600000).toISOString())}`,
    `SUMMARY:${esc(p.name)} kickoff`,
    "DESCRIPTION:Review the accepted handoff brief and confirm next actions.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
