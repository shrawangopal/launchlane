"use client";
import { useEffect, useState } from "react";
import { Layers3, ShieldCheck } from "lucide-react";
import { Toaster, toast } from "sonner";
import { InputCard } from "@/app/page";
import { services, type Project } from "@/lib/domain";
export default function ClientPortal({ token }: { token: string }) {
  const [p, setP] = useState<Project | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await fetch(`/api/portal/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const d = (await r.json()) as { error: string; project: Project };
      if (!r.ok) throw new Error(d.error);
      setP(d.project);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [token]);
  async function submit(id: string, value: string) {
    if (!p) return false;
    setBusy(true);
    try {
      const r = await fetch(`/api/portal/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: p.revision,
          command: { type: "submit", requirementId: id, value },
        }),
      });
      const d = (await r.json()) as { error: string; project: Project };
      if (!r.ok) throw new Error(d.error);
      setP(d.project);
      toast.success("Your input has been saved.");
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Toaster richColors />
      <header className="topbar">
        <span className="brand">
          <Layers3 />
          launchlane
        </span>
        <span className="demo-label">Client intake</span>
      </header>
      <main className="portal-main">
        {error ? (
          <div className="empty">
            <h2>Intake unavailable</h2>
            <p>{error}</p>
          </div>
        ) : !p ? (
          <div className="empty">Loading your intake…</div>
        ) : (
          <>
            <div className="portal-intro">
              <p className="eyebrow">LET’S GET STARTED</p>
              <h1>Welcome, {p.name}.</h1>
              <p className="muted">
                {services[p.service]} · Target kickoff {p.target}
              </p>
            </div>
            <section className="agent-banner">
              <ShieldCheck />
              <p>
                Provide the information below. Your project team will review
                submissions before confirming kickoff. Never include passwords
                or secret keys.
              </p>
            </section>
            <br />
            {!p.approved ? (
              <div className="empty">
                <h2>Your team is reviewing the plan.</h2>
                <p>
                  Intake will open once your onboarding requirements are
                  approved.
                </p>
              </div>
            ) : p.kickoff ? (
              <div className="success-box">
                Your kickoff is confirmed for{" "}
                {new Date(p.kickoff).toLocaleString()}. Intake is now closed.
              </div>
            ) : (
              p.requirements.map((r) => (
                <InputCard
                  key={r.id + ":" + r.status + ":" + r.value}
                  r={r}
                  closed={false}
                  busy={busy}
                  submit={(v) => submit(r.id, v)}
                />
              ))
            )}
            <footer>Private client intake · Launchlane</footer>
          </>
        )}
      </main>
    </>
  );
}
