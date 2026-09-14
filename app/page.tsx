"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Layers3,
  Plus,
  ArrowUpRight,
  Sparkles,
  ArrowLeft,
  Play,
  Check,
  FileText,
  Folder,
  ExternalLink,
  Download,
  Clock3,
  Search,
  ShieldCheck,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import {
  services,
  stage,
  progress,
  playbooks,
  type Project,
  type Service,
  type Requirement,
  type Evidence,
  type Command,
} from "@/lib/domain";
import { exampleScopes } from "@/lib/demo";

async function request(path: string, body?: unknown) {
  const r = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const d = (await r.json()) as {
    error?: string;
    projects: Project[];
    project: Project;
    evidence: Evidence[];
  };
  if (!r.ok) throw new Error(d.error || "Request failed.");
  return d;
}
function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Pill({ status }: { status: string }) {
  return (
    <span
      className={
        "pill " +
        (status.includes("Ready") ||
        status === "accepted" ||
        status.includes("confirmed")
          ? "success"
          : status.includes("review") || status === "rejected"
            ? "warning"
            : "neutral")
      }
    >
      {status}
    </span>
  );
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("launches"),
    [newOpen, setNewOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const d = await request("/api/projects");
      setProjects(d.projects);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function seed() {
    setBusy(true);
    try {
      const d = await request("/api/demo", {});
      setProjects(d.projects);
      toast.success("Three fictional demo clients are ready.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(p: Project, command: Command) {
    setBusy(true);
    try {
      const d = await request(`/api/projects/${encodeURIComponent(p.id)}`, {
        revision: p.revision,
        command,
      });
      setProjects((ps) => ps.map((x) => (x.id === p.id ? d.project : x)));
      toast.success(
        command.type === "run"
          ? "Agent run completed. Check the activity trail."
          : "Saved.",
      );
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "list_client_launches",
          title: "List client launches",
          description:
            "Read the signed-in operator’s saved launches and current stages. Does not modify data.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: unknown) => {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object.");
            const d = await request("/api/projects");
            setProjects(d.projects);
            return d.projects.map((p: Project) => ({
              id: p.id,
              name: p.name,
              stage: stage(p),
              progress: progress(p),
            }));
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const p = projects.find((p) => p.id === selected);
  const pending = projects.reduce(
    (n, p) =>
      n +
      (!p.approved ? 1 : 0) +
      p.requirements.filter((r) => r.status === "review").length,
    0,
  );
  return (
    <>
      <Toaster richColors position="bottom-right" />
      <header className="topbar">
        <a className="brand" href="/">
          <Layers3 />
          launchlane
        </a>
        <span className="brand-label">CLIENT OPERATIONS</span>
        <span className="demo-label">Workspace agent</span>
        <a
          className="avatar"
          href="/signin-with-chatgpt?return_to=/"
          title="Sign in"
        >
          SG
        </a>
      </header>
      <main className="main">
        {p ? (
          <ProjectDetail
            key={p.id}
            p={p}
            busy={busy}
            act={act}
            back={() => {
              setSelected(null);
              window.scrollTo(0, 0);
            }}
          />
        ) : (
          <>
            <div className="heading">
              <div>
                <p className="eyebrow">LESS CHASING. BETTER BEGINNINGS.</p>
                <h1>Great starts, on autopilot.</h1>
                <p className="muted">
                  Every client, every prerequisite, one clear path to kickoff.
                </p>
              </div>
              <Button
                disabled={!!error || loading}
                onClick={() => setNewOpen(true)}
              >
                <Plus size={17} /> New launch
              </Button>
            </div>
            {error ? (
              <section className="empty">
                <ShieldCheck size={32} />
                <h2>
                  {error.includes("Sign in")
                    ? "Your workspace, kept private."
                    : "Workspace unavailable"}
                </h2>
                <p>{error}</p>
                {error.includes("Sign in") ? (
                  <Button asChild>
                    <a href="/signin-with-chatgpt?return_to=/" target="_top">
                      Sign in to Launchlane
                    </a>
                  </Button>
                ) : (
                  <Button onClick={refresh}>Try again</Button>
                )}
              </section>
            ) : loading ? (
              <div className="empty">
                <Loader2 className="spin" /> Loading your workspace…
              </div>
            ) : (
              <>
                <div className="metrics">
                  <div>
                    <span>Active launches</span>
                    <strong>{projects.filter((p) => !p.kickoff).length}</strong>
                    <small>Clients moving toward kickoff</small>
                  </div>
                  <div>
                    <span>Needs your attention</span>
                    <strong>{pending}</strong>
                    <small>Plan and input reviews</small>
                  </div>
                  <div>
                    <span>Ready for kickoff</span>
                    <strong>
                      {
                        projects.filter((p) => stage(p) === "Ready for kickoff")
                          .length
                      }
                    </strong>
                    <small>Prerequisites verified</small>
                  </div>
                  <div>
                    <span>Agent runs</span>
                    <strong>{projects.reduce((n, p) => n + p.runs, 0)}</strong>
                    <small>Every outcome recorded</small>
                  </div>
                </div>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList variant="line" className="workspace-tabs">
                    <TabsTrigger value="launches">Launch pipeline</TabsTrigger>
                    <TabsTrigger value="playbooks">
                      Playbooks & evidence
                    </TabsTrigger>
                    <TabsTrigger value="activity">Activity trail</TabsTrigger>
                    <TabsTrigger value="connections">
                      Delivery & connections
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="launches">
                    <div className="section-heading">
                      <h2>Your launch pipeline</h2>
                      <span className="muted">{projects.length} clients</span>
                    </div>
                    {!projects.length ? (
                      <section className="empty">
                        <Sparkles size={32} />
                        <h2>Your next client starts here.</h2>
                        <p>
                          Create a launch from a signed scope, or explore three
                          fictional client journeys.
                        </p>
                        <div className="actions">
                          <Button onClick={() => setNewOpen(true)}>
                            Create a launch
                          </Button>
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={seed}
                          >
                            Load guided demo
                          </Button>
                        </div>
                      </section>
                    ) : (
                      <div className="launch-grid">
                        {projects.map((p) => (
                          <button
                            className="launch-card"
                            key={p.id}
                            onClick={() => {
                              setSelected(p.id);
                              window.scrollTo(0, 0);
                            }}
                          >
                            <div className="card-top">
                              <span className={"client-icon " + p.service}>
                                {p.name[0]}
                              </span>
                              <ArrowUpRight size={18} />
                            </div>
                            <h3>{p.name}</h3>
                            <p className="muted">{services[p.service]}</p>
                            <div className="progress-label">
                              <Pill status={stage(p)} />
                              <b>{progress(p)}%</b>
                            </div>
                            <Progress value={progress(p)} />
                            <div className="card-bottom">
                              <span>
                                <Clock3 size={14} /> Target {p.target}
                              </span>
                              <span>
                                {
                                  p.requirements.filter(
                                    (r) => r.status === "accepted",
                                  ).length
                                }
                                /{p.requirements.length} inputs
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <section className="agent-banner">
                      <Sparkles />
                      <div>
                        <h3>One agent. Every handoff.</h3>
                        <p>
                          Approve the plan. Collect the right inputs. Run the
                          agent to build a verified kickoff workspace.
                        </p>
                      </div>
                    </section>
                  </TabsContent>
                  <TabsContent value="playbooks">
                    <div className="section-heading">
                      <h2>The rules behind every launch</h2>
                      <span className="muted">
                        Version 1.0 · Operator-reviewed plans
                      </span>
                    </div>
                    <EvidenceSearch />
                    <div className="playbook-grid">
                      {playbooks.map((b) => (
                        <article className="panel" key={b.id}>
                          <span className="source-id">{b.id}</span>
                          <h3>{b.title}</h3>
                          <p className="muted">{b.text}</p>
                        </article>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="activity">
                    <h2 className="section-heading">
                      A record of every decision
                    </h2>
                    <Activity
                      events={projects
                        .flatMap((p) =>
                          p.events.map((e) => ({
                            ...e,
                            id: p.id + e.id,
                            detail: `${p.name} — ${e.detail}`,
                          })),
                        )
                        .sort((a, b) => b.at.localeCompare(a.at))}
                    />
                  </TabsContent>
                  <TabsContent value="connections">
                    <div className="section-heading">
                      <h2>Know exactly where work happens</h2>
                    </div>
                    <div className="playbook-grid">
                      <article className="panel">
                        <Folder />
                        <h3>Launchlane workspace</h3>
                        <Pill status="accepted" />
                        <p>
                          Folder records, accepted inputs, handoff documents,
                          and task manifests are created and stored in this
                          workspace. Download artifacts from each launch.
                        </p>
                      </article>
                      <article className="panel">
                        <Link2 />
                        <h3>Client intake portal</h3>
                        <Pill status="Available" />
                        <p>
                          Each launch has a private submission link. The link
                          grants intake access only. Share it only with the
                          intended client; hosted Site access restrictions still
                          apply.
                        </p>
                      </article>
                      <article className="panel">
                        <FileText />
                        <h3>Email & calendar</h3>
                        <Pill status="Manual delivery" />
                        <p>
                          Approve and export welcome messages. Confirm a kickoff
                          time to generate a calendar file. This version does
                          not send email or create external calendar events.
                        </p>
                      </article>
                      <article className="panel">
                        <ShieldCheck />
                        <h3>Connected business tools</h3>
                        <Pill status="Not connected" />
                        <p>
                          No CRM, external drive, or project-management account
                          is connected. Export the workspace package for
                          transfer. See the repository integration guide for the
                          next connector boundary.
                        </p>
                      </article>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
        <footer>
          Launchlane / Client Launch Agent
          <span>Evidence-backed. Human-approved.</span>
        </footer>
      </main>
      <NewLaunch
        open={newOpen}
        close={() => setNewOpen(false)}
        onCreate={(p) => {
          setProjects((ps) => [p, ...ps]);
          setSelected(p.id);
          setNewOpen(false);
        }}
      />
    </>
  );
}
function NewLaunch({
  open,
  close,
  onCreate,
}: {
  open: boolean;
  close: () => void;
  onCreate: (p: Project) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [service, setService] = useState<Service>("website"),
    [target, setTarget] = useState(""),
    [scope, setScope] = useState(""),
    [signed, setSigned] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await request("/api/projects", {
        name,
        email,
        service,
        target,
        scope,
        signed,
      });
      onCreate(d.project);
      setName("");
      setEmail("");
      setScope("");
      setSigned(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="launch-dialog">
        <DialogHeader>
          <DialogTitle>Start a client launch</DialogTitle>
          <DialogDescription>
            Build an operator-reviewed plan from a signed scope and service
            playbook.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="form">
          <div className="form-row">
            <label>
              Client name
              <Input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Studio"
              />
            </label>
            <label>
              Client email
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@acme.com"
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Service
              <Select
                value={service}
                onValueChange={(v) => setService(v as Service)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(services).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label>
              Target kickoff
              <Input
                required
                type="date"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
          </div>
          <label>
            Agreement / statement of work
            <Textarea
              required
              minLength={80}
              maxLength={30000}
              rows={7}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Paste the agreed deliverables, responsibilities, exclusions, and prerequisites…"
            />
          </label>
          <div className="actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScope(exampleScopes[service])}
            >
              Use fictional example
            </Button>
            <label className="import-label">
              Import text file
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 60000) {
                    setError("Use a text file under 60 KB.");
                    return;
                  }
                  setScope(await f.text());
                }}
              />
            </label>
          </div>
          <label className="check-label">
            <Checkbox
              checked={signed}
              onCheckedChange={(v) => setSigned(v === true)}
            />{" "}
            I confirm this agreement is signed, and I will review the generated
            plan.
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <Sparkles size={16} />}{" "}
            Create launch plan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ProjectDetail({
  p,
  busy,
  act,
  back,
}: {
  p: Project;
  busy: boolean;
  act: (p: Project, c: Command) => Promise<boolean>;
  back: () => void;
}) {
  const [detailTab, setDetailTab] = useState("plan"),
    [note, setNote] = useState(""),
    [kickoff, setKickoff] = useState(""),
    [portal, setPortal] = useState(false);
  const accepted = p.requirements.filter((r) => r.status === "accepted").length;
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} /> All launches
      </button>
      <div className="heading detail-heading">
        <div>
          <p className="eyebrow">{services[p.service].toUpperCase()}</p>
          <h1>{p.name}</h1>
          <div className="actions">
            <Pill status={stage(p)} />
            <span className="muted">
              Target {p.target} · {p.email}
            </span>
          </div>
        </div>
        <div className="actions">
          <Button variant="outline" onClick={() => setPortal(true)}>
            <Link2 size={16} /> Client portal
          </Button>
          <Button
            disabled={busy || !p.approved}
            onClick={() => act(p, { type: "run" })}
          >
            {busy ? <Loader2 className="spin" /> : <Play size={16} />} Run agent
          </Button>
        </div>
      </div>
      <div className="journey">
        {[
          "Plan approved",
          "Inputs accepted",
          "Workspace ready",
          "Kickoff confirmed",
        ].map((s, i) => {
          const done = [
            p.approved,
            accepted === p.requirements.length,
            p.artifacts.some(
              (a) => a.id === "handoff" && !a.content.startsWith("OUTDATED"),
            ),
            !!p.kickoff,
          ][i];
          return (
            <div key={s} className={done ? "done" : ""}>
              <span>{done ? <Check size={15} /> : i + 1}</span>
              {s}
            </div>
          );
        })}
      </div>
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList variant="line" className="workspace-tabs">
          <TabsTrigger value="plan">Launch plan</TabsTrigger>
          <TabsTrigger value="inputs">
            Client inputs ({accepted}/{p.requirements.length})
          </TabsTrigger>
          <TabsTrigger value="workspace">
            Workspace ({p.artifacts.length})
          </TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="plan">
          <div className="detail-grid">
            <section>
              <article className="panel">
                <div className="section-heading">
                  <h2>Scope → onboarding plan</h2>
                  <Pill status={p.approved ? "Approved" : "Review required"} />
                </div>
                <p className="muted">
                  The service playbook proposes the requirements below. Review
                  the complete scope for exceptions before approval. The agent
                  does not interpret arbitrary contract obligations.
                </p>
                {p.clarification.map((c) => (
                  <p className="warning-box" key={c}>
                    <AlertCircle size={17} />
                    {c}
                  </p>
                ))}
                <div className="requirement-list">
                  {p.requirements.map((r, i) => (
                    <div key={r.id}>
                      <span className="number">0{i + 1}</span>
                      <div>
                        <b>{r.title}</b>
                        <p>{r.help}</p>
                        <details>
                          <summary>Evidence · {r.source}</summary>
                          <blockquote>{r.quote}</blockquote>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
                {!p.approved && (
                  <div className="approve-box">
                    <label>
                      Review note{" "}
                      {p.clarification.length ? "(required)" : "(optional)"}
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Confirm coverage or explain a scope clarification…"
                      />
                    </label>
                    <Button
                      disabled={busy || !p.signed}
                      onClick={() => act(p, { type: "approve_plan", note })}
                    >
                      <CheckCircle2 size={16} /> Approve launch plan
                    </Button>
                    {!p.signed && (
                      <p className="error">
                        This launch lacks a signed agreement attestation. Create
                        a new launch with the signed scope.
                      </p>
                    )}
                  </div>
                )}
              </article>
              <EvidenceSearch project={p.id} />
            </section>
            <aside>
              <article className="panel">
                <p className="eyebrow">SOURCE OF TRUTH</p>
                <h3>Agreed scope</h3>
                <pre className="scope-text">{p.scope}</pre>
                <p className="muted">
                  Signature:{" "}
                  {p.signed ? "attested by operator" : "not confirmed"}
                </p>
              </article>
              <article className="panel tint">
                <ShieldCheck />
                <h3>Your approval is the gate.</h3>
                <p>
                  The agent provisions workspace records only after plan
                  approval. It cannot confirm kickoff while an input is missing,
                  rejected, or awaiting review.
                </p>
              </article>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="inputs">
          <div className="section-heading">
            <h2>Everything needed for a confident kickoff</h2>
            <span className="muted">
              {accepted} accepted · {p.requirements.length - accepted}{" "}
              outstanding
            </span>
          </div>
          {p.requirements.map((r) => (
            <InputCard
              key={r.id + ":" + r.status + ":" + r.value}
              r={r}
              closed={!p.approved || !!p.kickoff}
              busy={busy}
              submit={(value) =>
                act(p, { type: "submit", requirementId: r.id, value })
              }
              review={(decision, note) =>
                act(p, { type: "review", requirementId: r.id, decision, note })
              }
            />
          ))}
        </TabsContent>
        <TabsContent value="workspace">
          <div className="detail-grid">
            <section>
              <div className="section-heading">
                <h2>Provisioned in Launchlane</h2>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.artifacts.length}
                  onClick={() =>
                    download(
                      `${p.name}-workspace.json`,
                      JSON.stringify(
                        {
                          client: p.name,
                          scope: p.scope,
                          artifacts: p.artifacts,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  <Download size={15} /> Export package
                </Button>
              </div>
              {!p.artifacts.length ? (
                <div className="empty">
                  <Folder />
                  <h3>Your workspace is waiting.</h3>
                  <p>Approve the plan and run the agent to create it.</p>
                </div>
              ) : (
                p.artifacts.map((a) => (
                  <article className="artifact panel" key={a.id}>
                    <div className="actions">
                      {a.kind === "folder" ? <Folder /> : <FileText />}
                      <div>
                        <h3>{a.name}</h3>
                        <p className="muted">
                          {a.kind === "folder"
                            ? "Verified workspace folder record"
                            : a.content.startsWith("OUTDATED")
                              ? "Outdated — rerun the agent"
                              : "Generated from saved project evidence"}
                        </p>
                      </div>
                      {a.kind !== "folder" && (
                        <Button
                          className="push-right"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            download(
                              a.name,
                              a.content,
                              a.kind === "calendar"
                                ? "text/calendar"
                                : "text/plain",
                            )
                          }
                        >
                          <Download size={15} /> Download
                        </Button>
                      )}
                    </div>
                    {a.kind !== "folder" && (
                      <details>
                        <summary>Inspect content</summary>
                        <pre className="scope-text">{a.content}</pre>
                      </details>
                    )}
                  </article>
                ))
              )}
            </section>
            <aside>
              <article className="panel">
                <Clock3 />
                <h3>Confirm kickoff</h3>
                <p className="muted">
                  Confirm an agreed time, then download a one-hour calendar
                  event. Invitations are not sent automatically.
                </p>
                {p.kickoff ? (
                  <p className="success-box">
                    Confirmed: {new Date(p.kickoff).toLocaleString()}
                  </p>
                ) : (
                  <div className="form">
                    <label>
                      Agreed time (your local time)
                      <Input
                        type="datetime-local"
                        value={kickoff}
                        onChange={(e) => setKickoff(e.target.value)}
                      />
                    </label>
                    <Button
                      disabled={
                        busy || stage(p) !== "Ready for kickoff" || !kickoff
                      }
                      onClick={() =>
                        act(p, {
                          type: "kickoff",
                          at: new Date(kickoff).toISOString(),
                        })
                      }
                    >
                      Confirm & create calendar file
                    </Button>
                    {stage(p) !== "Ready for kickoff" && (
                      <p className="muted">
                        Accept every input, then run the agent to unlock
                        kickoff.
                      </p>
                    )}
                  </div>
                )}
              </article>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="messages">
          <h2 className="section-heading">
            Communication ready for your review
          </h2>
          {!p.messages.length ? (
            <div className="empty">
              Run the agent to draft a welcome message.
            </div>
          ) : (
            p.messages.map((m) => (
              <article className="panel" key={m.id}>
                <div className="section-heading">
                  <h3>{m.subject}</h3>
                  <Pill status={m.status} />
                </div>
                <p className="muted">To: {p.email} · Not sent</p>
                <pre className="scope-text">{m.body}</pre>
                <div className="actions">
                  {m.status === "draft" ? (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        act(p, { type: "approve_message", messageId: m.id })
                      }
                    >
                      Approve message
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(
                          "welcome-message.txt",
                          `To: ${p.email}\nSubject: ${m.subject}\n\n${m.body}\n\nClient intake: ${location.origin}/portal/${p.portalToken}`,
                        )
                      }
                    >
                      <Download size={15} /> Export approved message
                    </Button>
                  )}
                  <span className="muted">Manual delivery</span>
                </div>
              </article>
            ))
          )}
        </TabsContent>
        <TabsContent value="activity">
          <h2 className="section-heading">Every action, with its evidence</h2>
          <Activity events={[...p.events].reverse()} />
        </TabsContent>
      </Tabs>
      <Dialog open={portal} onOpenChange={setPortal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{p.name} · Client intake</DialogTitle>
            <DialogDescription>
              This private link permits submissions for this client only. Anyone
              with the link and Site access can use it.
            </DialogDescription>
          </DialogHeader>
          <p className="muted">
            The portal opens after plan approval. Keep this link private. Hosted
            access rules may require the client to sign in.
          </p>
          <div className="actions">
            <Button asChild>
              <a
                href={`/portal/${p.portalToken}`}
                target="_blank"
                rel="noreferrer"
              >
                Open client portal <ExternalLink size={15} />
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/portal/${p.portalToken}`,
                  );
                  toast.success("Private intake link copied.");
                } catch {
                  toast.error(
                    "Clipboard unavailable. Open the portal and copy its address.",
                  );
                }
              }}
            >
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function InputCard({
  r,
  closed,
  busy,
  submit,
  review,
}: {
  r: Requirement;
  closed: boolean;
  busy: boolean;
  submit: (v: string) => Promise<boolean>;
  review?: (d: "accept" | "reject", n: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(r.value),
    [note, setNote] = useState("");
  return (
    <article className="panel input-card">
      <div className="section-heading">
        <div>
          <h3>{r.title}</h3>
          <p className="muted">{r.help}</p>
        </div>
        <Pill status={r.status} />
      </div>
      <label className="sr-only" htmlFor={"input-" + r.id}>
        {r.title}
      </label>
      {r.kind === "text" ? (
        <Textarea
          id={"input-" + r.id}
          disabled={closed}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <Input
          id={"input-" + r.id}
          disabled={closed}
          type={r.kind === "email" ? "email" : "url"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={r.kind === "email" ? "contact@company.com" : "https://…"}
        />
      )}
      <div className="input-actions">
        <p className={r.status === "rejected" ? "error" : "muted"}>
          {r.feedback || `Required by ${r.source}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || closed || !value.trim() || value === r.value}
          onClick={() => submit(value)}
        >
          Submit input
        </Button>
      </div>
      {r.status === "review" && review && (
        <div className="review-area">
          <label>
            Review note
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you checked or what needs correcting…"
            />
          </label>
          <div className="actions">
            <Button
              size="sm"
              disabled={busy || note.trim().length < 8}
              onClick={() => review("accept", note)}
            >
              Accept input
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || note.trim().length < 8}
              onClick={() => review("reject", note)}
            >
              Request correction
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
function Activity({ events }: { events: Project["events"] }) {
  return events.length ? (
    <div className="panel activity">
      {events.map((e) => (
        <div className="activity-row" key={e.id}>
          <span className="event-icon">
            {e.actor === "agent" ? <Sparkles size={16} /> : <Check size={16} />}
          </span>
          <div>
            <b>{e.action.replaceAll(".", " · ")}</b>
            <p>{e.detail}</p>
            <small>
              {e.actor} · {new Date(e.at).toLocaleString()}
            </small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">
      Actions will appear here as your launches progress.
    </div>
  );
}
function EvidenceSearch({ project }: { project?: string }) {
  const [q, setQ] = useState(""),
    [results, setResults] = useState<Evidence[] | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel evidence-search">
      <h3>Find the supporting evidence</h3>
      <form
        className="actions"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const d = await request(
              `/api/evidence?q=${encodeURIComponent(q)}${project ? "&project=" + encodeURIComponent(project) : ""}`,
            );
            setResults(d.evidence);
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          aria-label="Search evidence"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. What is required before kickoff?"
        />
        <Button disabled={busy || !q.trim()} variant="outline">
          <Search size={16} /> Search
        </Button>
      </form>
      {results?.length === 0 && (
        <p className="muted">
          No supporting passage found. Try a more specific phrase or review the
          full scope.
        </p>
      )}
      {results?.map((e) => (
        <blockquote key={e.id}>
          <span className="source-id">{e.id}</span>
          <b>{e.title}</b>
          <p>{e.text}</p>
        </blockquote>
      ))}
    </section>
  );
}
