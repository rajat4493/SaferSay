"use client";

import { CalendarClock, Check, ClipboardCheck, Download, EyeOff, FileText, Link, Send, Users } from "lucide-react";
import { Card } from "@/components/AppShell";
import { useSurveyData } from "@/components/DataProvider";
import {
  buildReport,
  createParticipantTokens,
  questionBank,
  seedEmployees,
  submitTokenResponse,
} from "@/lib/localData";

export function ProductDemo() {
  const { data, setData, resetData } = useSurveyData();
  const cycle = data.responses.cycles[0];
  const employeesLoaded = data.identity.employees.length > 0;
  const windowSet = Boolean(cycle.opensAt && cycle.closesAt);
  const launched = cycle.status === "open";
  const report = buildReport(data, cycle.id);
  const nextToken = data.identity.participants.find((participant) => participant.status === "issued")?.token;

  function loadPeople() {
    const employees = seedEmployees();
    setData({
      ...data,
      identity: {
        employees,
        participants: createParticipantTokens(cycle.id, employees),
      },
    });
  }

  function setDefaultWindow() {
    setData({
      ...data,
      responses: {
        ...data.responses,
        cycles: data.responses.cycles.map((item) =>
          item.id === cycle.id ? { ...item, opensAt: "2026-07-30", closesAt: "2026-08-06" } : item,
        ),
      },
    });
  }

  function launchSurvey() {
    if (!employeesLoaded || !windowSet) return;
    setData({
      ...data,
      responses: {
        ...data.responses,
        cycles: data.responses.cycles.map((item) =>
          item.id === cycle.id ? { ...item, status: "open" } : item,
        ),
      },
    });
  }

  function closeSurvey() {
    setData({
      ...data,
      responses: {
        ...data.responses,
        cycles: data.responses.cycles.map((item) =>
          item.id === cycle.id ? { ...item, status: "closed" } : item,
        ),
      },
    });
  }

  function submitSample() {
    if (!nextToken) return;
    setData(submitTokenResponse(data, nextToken, [4, 4, 3, 3]));
  }

  function exportCsv() {
    const csv = report.protected
      ? "metric,status\nreport,protected_until_5_responses"
      : ["metric,score", ...report.rows.map((row) => `${row.label},${row.value}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "safersay-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">Persistent cycle</p>
            <h2 className="mt-1 text-2xl font-semibold">{cycle.name}</h2>
          </div>
          <span className="rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-accent)]">{cycle.status}</span>
        </div>
        <div className="mt-5 space-y-3">
          <Action icon={Users} label="Load people" value={employeesLoaded ? `${data.identity.employees.length} employees loaded` : "Directory or CSV"} done={employeesLoaded} onClick={loadPeople} />
          <Action icon={FileText} label="Template" value={`${cycle.template} selected`} done />
          <Action icon={CalendarClock} label="Window" value={windowSet ? `${cycle.opensAt} - ${cycle.closesAt}` : "Use 7-day default"} done={windowSet} onClick={setDefaultWindow} />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button disabled={!employeesLoaded || !windowSet || launched} onClick={launchSurvey} className="flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] text-sm font-semibold text-white disabled:bg-[#b8b0a6]">
            <Send size={16} />
            {launched ? "Survey live" : "Launch survey"}
          </button>
          <button onClick={resetData} className="h-11 rounded-full border border-[var(--brand-border)] bg-white text-sm font-semibold">Reset data</button>
        </div>
      </Card>

      <Card>
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[2rem] bg-[#161616] p-3">
            <div className="min-h-[430px] rounded-[1.45rem] bg-[var(--brand-bg)] p-5">
              {!launched ? (
                <Phone title="Waiting for launch" text="The respondent link opens after HR launches the cycle." />
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">Before Q1</p>
                  <h3 className="mt-3 text-2xl font-semibold">How your answers stay confidential</h3>
                  <p className="mt-4 text-sm leading-6 text-[var(--brand-muted)]">Sign-in confirms eligibility. Answers are stored separately. Groups under 5 stay hidden.</p>
                  <div className="mt-5 rounded-2xl bg-white p-3 text-sm font-semibold">{questionBank[0].text}</div>
                  <button onClick={submitSample} disabled={!nextToken} className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand-accent)] text-sm font-semibold text-white disabled:bg-[#b8b0a6]">
                    {nextToken ? "Submit next sample response" : "All sample tokens spent"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Responses" value={String(report.n)} />
              <Stat label="Threshold" value="5" />
              <Stat label="Report" value={report.protected ? "Safe" : "Open"} />
            </div>
            {report.protected ? (
              <div className="mt-5 rounded-2xl bg-[var(--brand-accent-soft)] p-5 text-sm leading-6 text-[var(--brand-muted)]">
                <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--brand-accent)]"><EyeOff size={16} /> Protected report</div>
                Results unlock at 5 responses. Current answers are persisted but not rendered.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {report.rows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-2 flex justify-between text-sm"><span>{row.label}</span><span>{row.value}</span></div>
                    <div className="h-2 rounded-full bg-[var(--brand-border)]"><div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: row.width }} /></div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${nextToken ?? "spent"}`)} className="rounded-full border border-[var(--brand-border)] bg-white py-2 text-sm font-semibold"><Link className="mx-auto" size={16} /></button>
              <button onClick={() => navigator.clipboard.writeText("We heard workload needs attention. We will clarify priorities this month.")} className="rounded-full border border-[var(--brand-border)] bg-white py-2 text-sm font-semibold"><ClipboardCheck className="mx-auto" size={16} /></button>
              <button onClick={exportCsv} className="rounded-full border border-[var(--brand-border)] bg-white py-2 text-sm font-semibold"><Download className="mx-auto" size={16} /></button>
              <button onClick={closeSurvey} disabled={!launched} className="rounded-full border border-[var(--brand-border)] bg-white py-2 text-sm font-semibold disabled:opacity-40">Close</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Action({ icon: Icon, label, value, done = false, onClick }: { icon: typeof Users; label: string; value: string; done?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--brand-border)] bg-white p-3 text-left">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"><Icon size={18} /></div>
      <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{label}</div><div className="truncate text-sm text-[var(--brand-muted)]">{value}</div></div>
      {done && <Check size={18} className="text-[var(--brand-accent)]" />}
    </button>
  );
}

function Phone({ title, text }: { title: string; text: string }) {
  return <><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">Respondent</p><h3 className="mt-3 text-2xl font-semibold">{title}</h3><p className="mt-4 text-sm leading-6 text-[var(--brand-muted)]">{text}</p></>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-3"><div className="text-xl font-semibold">{value}</div><div className="text-xs text-[var(--brand-muted)]">{label}</div></div>;
}
