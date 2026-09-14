import {
  createProject,
  transition,
  type Project,
  type Service,
} from "./domain";
export const exampleScopes: Record<Service, string> = {
  website:
    "Signed statement of work — Website launch\nBuild a five-page marketing website: home, services, about, case studies, and contact.\nThe client supplies approved brand assets and all website copy. The client nominates one decision-maker.\nKickoff requires an accepted success brief and page inventory. Two rounds of design revisions are included.\nEcommerce, translations, and custom booking software are excluded.",
  brand:
    "Signed statement of work — Brand identity\nDevelop a logo system, color palette, typography, and a concise brand guide.\nThe client supplies existing reference assets, a creative direction, and a success brief describing the audience and positioning.\nOne client contact approves decisions. Two concept directions and two revision rounds are included.\nWebsite development and trademark registration are excluded.",
  implementation:
    "Signed statement of work — Software implementation\nConfigure the approved CRM integration in a sandbox and migrate a reviewed sample dataset.\nThe client supplies a systems map, identifies the data owner, and arranges least-privilege sandbox access.\nThe client nominates an accountable contact and confirms success criteria before kickoff.\nProduction access and full historical migration require separate approval.",
};
export function examples(now: string): Project[] {
  const date = new Date(Date.parse(now) + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  return (
    [
      ["Northstar Studio", "website"],
      ["Orbit Analytics", "implementation"],
      ["Forma Collective", "brand"],
    ] as const
  ).map(([name, service], index) => {
    let p = createProject(
      {
        id: crypto.randomUUID(),
        name,
        email: `hello@${["northstar", "orbit", "forma"][index]}.example`,
        service,
        target: date,
        scope: exampleScopes[service],
        signed: true,
        portalToken: crypto.randomUUID() + crypto.randomUUID(),
      },
      now,
    );
    if (index === 1) return p;
    p = transition(p, { type: "approve_plan" }, "Demo operator", now);
    p = transition(p, { type: "run" }, "Demo operator", now);
    for (const r of p.requirements) {
      const value =
        r.kind === "email"
          ? p.email
          : r.kind === "url"
            ? "https://example.com/demo-brand-folder"
            : r.id === "brief"
              ? "Launch a clear, accessible service experience for small business owners. Measure success by completed qualified inquiries."
              : "The client marketing lead owns the content and decisions. Audience: growing service businesses. References and milestones will be confirmed at kickoff.";
      if (index === 0 && r.id === "content") continue;
      p = transition(
        p,
        { type: "submit", requirementId: r.id, value },
        "Demo client",
        now,
      );
      if (r.review && !(index === 0 && r.id === "assets"))
        p = transition(
          p,
          {
            type: "review",
            requirementId: r.id,
            decision: "accept",
            note: "Fictional demo input reviewed for the guided example.",
          },
          "Demo operator",
          now,
        );
    }
    p = transition(p, { type: "run" }, "Demo operator", now);
    return p;
  });
}
