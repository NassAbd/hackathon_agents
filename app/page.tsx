"use client";
import Link from "next/link";
import { useGhost } from "@/lib/use-ghost";
import { GhostSidebar, GhostMark } from "@/components/GhostSidebar";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  CornerUpLeft,
  ExternalLink,
  GitBranch,
  Github,
  Hash,
  Inbox,
  Mail,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { appNames, apps, pages } from "@/lib/fixtures";
const icons = { email: Mail, slack: Hash, github: Github, crm: Building2 };
export default function Home() {
  const {
    state,
    visit,
    reset,
    agentStatus,
    reason,
    reply: openReply,
    generateDraft,
    draft,
    setDraft,
    draftStatus,
    draftFactIds,
    contextOrigin,
    diagnostic,
  } = useGhost();
  const app = state.currentApp;
  const reply = state.boundary;
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="GHOST home">
          <GhostMark />
          <span>
            GHOST<span className="brand-light"> / workspace</span>
          </span>
        </Link>
        <div className="top-center">
          <span className="live-dot" /> Your workflow, connected
        </div>
        <button className="reset" onClick={reset}>
          <RotateCcw size={14} /> Reset demo
        </button>
        <span className="avatar small">AM</span>
      </header>
      <main className="workspace">
        <section className="browser">
          <nav className="tabs" aria-label="Work applications">
            {apps.map((id) => {
              const Icon = icons[id];
              return (
                <button
                  key={id}
                  className={`tab ${app === id ? "active" : ""}`}
                  aria-current={app === id ? "page" : undefined}
                  onClick={() => visit(id)}
                >
                  <Icon size={16} />
                  {appNames[id]}
                  {id === "email" && <span className="tab-dot" />}
                </button>
              );
            })}
            <span className="tab-space" />
            <span className="demo-badge">SIMULATED WORKSPACE</span>
          </nav>
          <div className="address">
            <ArrowLeft size={15} />
            <ArrowRight size={15} />
            <div>
              <ShieldCheck size={13} />
              {pages[app].url}
            </div>
            <MoreHorizontal size={18} />
          </div>
          <div className="app-surface" key={app}>
            {app === "email" && (
              <>
                <div className="app-heading">
                  <div>
                    <Mail size={21} />
                    <strong>Mail</strong>
                  </div>
                  <span className="muted">alex@meridian.io</span>
                </div>
                <div className="mail-layout">
                  <aside className="mail-nav">
                    <div className="selected">
                      <Inbox size={16} /> Inbox <span>1</span>
                    </div>
                    <div>
                      <Star size={16} /> Starred
                    </div>
                    <div>
                      <CornerUpLeft size={16} /> Sent
                    </div>
                    <div>
                      <Mail size={16} /> Drafts <span>{draft ? 1 : 0}</span>
                    </div>
                    <label>LABELS</label>
                    <div>
                      <i className="label-dot" /> Customers
                    </div>
                    <div>
                      <i className="label-dot purple" /> Important
                    </div>
                  </aside>
                  <article className="email">
                    <div className="breadcrumb">
                      Inbox <span>/</span> Customers
                    </div>
                    <div className="subject-row">
                      <h1>Payment failures ahead of our renewal</h1>
                      <Star size={19} />
                    </div>
                    <span className="pill amber">Customer escalation</span>
                    <div className="sender">
                      <span className="avatar sarah">SC</span>
                      <div>
                        <strong>
                          Sarah Chen{" "}
                          <span className="muted">&lt;sarah@acme.com&gt;</span>
                        </strong>
                        <small>
                          to me <ChevronDown size={11} />
                        </small>
                      </div>
                      <time>Today, 14:02</time>
                    </div>
                    <div className="email-body">
                      <p>Hi Alex,</p>
                      <p>
                        We’ve been experiencing payment failures again this
                        week. Our team is starting to lose confidence, and this
                        is becoming a serious concern ahead of our renewal.
                      </p>
                      <p>
                        Can you tell me what’s happening and what you’re doing
                        about it?
                      </p>
                      <p>
                        Thanks,
                        <br />
                        Sarah
                      </p>
                      <div className="signature">
                        <strong>Sarah Chen</strong>
                        <br />
                        Head of Operations · ACME
                      </div>
                    </div>
                    {!reply ? (
                      <button className="outline-button" onClick={openReply}>
                        <CornerUpLeft size={15} /> Reply
                      </button>
                    ) : (
                      <div className="composer">
                        <div>
                          <CornerUpLeft size={15} /> To Sarah Chen{" "}
                          <span className="muted">&lt;sarah@acme.com&gt;</span>
                        </div>
                        <textarea
                          aria-label="Reply draft"
                          placeholder="Your reply…"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                        <footer>
                          <span className="muted">
                            Draft only · nothing is sent
                          </span>
                          <span className="draft-label">
                            {draftStatus === "loading"
                              ? "GHOST is composing…"
                              : draft
                                ? "Grounded draft · ready to edit"
                                : "Use the restored context to draft your reply"}
                          </span>
                        </footer>
                      </div>
                    )}
                    {!state.returned &&
                      state.events.at(-1)?.action === "REPLY" && (
                        <p className="early-reply-note">
                          Open the related investigation, then return here to
                          reply with the context you’ve collected.
                        </p>
                      )}
                    <div className="investigate">
                      <span>
                        <span className="live-dot" />{" "}
                        {state.returned
                          ? "Your collected context is ready when you click Reply"
                          : "Start with the engineering conversation"}
                      </span>
                      <button onClick={() => visit("slack")}>
                        {state.returned ? "Review Slack" : "Open Slack"}{" "}
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </article>
                </div>
              </>
            )}
            {app === "slack" && (
              <>
                <div className="app-heading">
                  <div>
                    <Hash size={22} />
                    <strong>Meridian</strong>
                    <ChevronDown size={14} />
                  </div>
                  <Search size={17} />
                </div>
                <div className="slack-layout">
                  <aside className="slack-nav">
                    <label>WORKSPACE</label>
                    <div>♡ &nbsp; Threads</div>
                    <div>◉ &nbsp; Mentions</div>
                    <label>CHANNELS</label>
                    <div># &nbsp; general</div>
                    <div># &nbsp; engineering</div>
                    <div className="selected"># &nbsp; inc-payments</div>
                    <div># &nbsp; customer-success</div>
                  </aside>
                  <article className="conversation">
                    <div className="channel-heading">
                      <h2># inc-payments</h2>
                      <span className="pill amber">Incident room</span>
                    </div>
                    <p className="channel-description">
                      Payment reliability · Engineering + Customer Success
                    </p>
                    <div className="date-rule">Today, September 12</div>
                    <Message
                      initials="MP"
                      name="Maya Patel"
                      time="14:08"
                      color="mint"
                    >
                      <p>
                        Picking up the ACME escalation from Sarah. We’ve
                        confirmed the payment failures affect the{" "}
                        <mark>EU region only</mark>. Other regions are
                        unaffected.
                      </p>
                      <span className="reaction">👀 &nbsp; 3</span>
                    </Message>
                    <Message
                      initials="LM"
                      name="Leo Martin"
                      time="14:11"
                      color="lavender"
                    >
                      <p>
                        The failures started{" "}
                        <mark>after the latest deployment</mark>. Looks related
                        to the payment routing changes.
                      </p>
                      <p>Investigation and resolution are tracked here:</p>
                      <button
                        className="link-card"
                        onClick={() => visit("github")}
                      >
                        <Github size={20} />
                        <span>
                          <strong>EU payment timeouts · #4821</strong>
                          <small>meridian / payments · View incident</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    </Message>
                    <Message
                      initials="AM"
                      name="Alex Morgan"
                      time="14:13"
                      color="peach"
                    >
                      <p>
                        Thanks, following the incident. I’ll pull together the
                        update for Sarah.
                      </p>
                    </Message>
                    <div className="read-only-note">
                      <ShieldCheck size={14} /> Simulated conversation · GHOST
                      observes the context you open
                    </div>
                  </article>
                </div>
              </>
            )}
            {app === "github" && (
              <>
                <div className="app-heading">
                  <div>
                    <Github size={22} />
                    <strong>
                      meridian <span className="muted">/</span> payments
                    </strong>
                    <span className="pill">Private</span>
                  </div>
                  <Star size={17} />
                </div>
                <div className="github-nav">
                  <span>⌘ &nbsp; Code</span>
                  <strong>
                    <CircleDot size={14} /> Issues{" "}
                    <span className="count">12</span>
                  </strong>
                  <span>
                    <GitBranch size={14} /> Pull requests
                  </span>
                </div>
                <article className="issue">
                  <div className="breadcrumb">
                    Issues <span>/</span> Incident investigation
                  </div>
                  <h1>
                    EU payment timeouts <span className="muted">#4821</span>
                  </h1>
                  <div className="issue-meta">
                    <span className="pill violet">
                      <Check size={13} /> Closed
                    </span>
                    <span>Leo Martin opened this issue today · 3 updates</span>
                  </div>
                  <div className="issue-card">
                    <div className="issue-card-header">
                      <span className="avatar lavender small">LM</span>
                      <strong>Leo Martin</strong>
                      <span className="muted">commented today</span>
                      <MoreHorizontal size={18} />
                    </div>
                    <div className="issue-content">
                      <span className="eyebrow">INCIDENT REPORT</span>
                      <h3>EU payment routing regression</h3>
                      <p>
                        Payment timeouts in the EU region following the latest
                        deployment. ACME is an affected customer.
                      </p>
                      <h4>Root cause</h4>
                      <p>
                        A <mark>routing configuration error</mark> introduced in
                        the latest deployment caused payment requests to time
                        out.
                      </p>
                      <h4>Resolution</h4>
                      <div className="resolved">
                        <Check size={16} />
                        <span>
                          Fix deployed at <strong>14:32 UTC</strong>
                        </span>
                      </div>
                      <h4>Verification</h4>
                      <p>
                        The payment error rate has{" "}
                        <mark>returned to normal</mark>.
                      </p>
                      <div className="code-note">
                        <span className="live-dot" /> payments-eu &nbsp; /
                        &nbsp; healthy
                      </div>
                    </div>
                  </div>
                  <div className="investigate">
                    <span>Connect the incident to the customer</span>
                    <button onClick={() => visit("crm")}>
                      Open ACME in CRM <ArrowUpRight size={14} />
                    </button>
                  </div>
                </article>
              </>
            )}
            {app === "crm" && (
              <>
                <div className="app-heading">
                  <div>
                    <Building2 size={21} />
                    <strong>
                      Meridian <span className="muted">CRM</span>
                    </strong>
                  </div>
                  <Search size={17} />
                </div>
                <article className="crm">
                  <div className="breadcrumb">
                    Accounts <span>/</span> ACME
                  </div>
                  <div className="account-heading">
                    <span className="company-logo">A</span>
                    <div>
                      <h1>ACME</h1>
                      <p>
                        Enterprise account · acme.com <ExternalLink size={12} />
                      </p>
                    </div>
                    <span className="pill amber">● At risk</span>
                  </div>
                  <div className="crm-tabs">
                    <strong>Overview</strong>
                    <span>Activity</span>
                    <span>Contacts</span>
                  </div>
                  <div className="metrics">
                    <div>
                      <span>Annual recurring revenue</span>
                      <strong>€120,000</strong>
                      <small>Enterprise plan</small>
                    </div>
                    <div>
                      <span>Next renewal</span>
                      <strong>
                        19 <em>days</em>
                      </strong>
                      <small>October 1, 2026</small>
                    </div>
                    <div>
                      <span>Account health</span>
                      <strong className="risk">At risk</strong>
                      <small>Payment reliability concerns</small>
                    </div>
                  </div>
                  <section className="crm-card">
                    <h3>Account context</h3>
                    <div className="account-row">
                      <span>Primary contact</span>
                      <strong>
                        Sarah Chen <small>Head of Operations</small>
                      </strong>
                      <span className="avatar sarah small">SC</span>
                    </div>
                    <div className="account-row">
                      <span>Account owner</span>
                      <strong>
                        Alex Morgan <small>Customer Success</small>
                      </strong>
                      <span className="avatar small">AM</span>
                    </div>
                  </section>
                  <section className="crm-card note">
                    <span className="eyebrow">LATEST ACCOUNT NOTE</span>
                    <h3>Reliability is the renewal conversation.</h3>
                    <p>
                      Sarah flagged recurring payment failures ahead of renewal.
                      The team needs a clear explanation of the incident and the
                      resolution.
                    </p>
                    <span className="muted">Alex Morgan · Today</span>
                  </section>
                  <div className="investigate">
                    <span>
                      <Check size={15} />{" "}
                      {state.visited.includes("github") &&
                      state.visited.includes("slack")
                        ? "You have the technical and commercial context"
                        : "Account context added to your investigation"}
                    </span>
                    <button onClick={() => visit("email")}>
                      Return to Email <ArrowUpRight size={14} />
                    </button>
                  </div>
                </article>
              </>
            )}
          </div>
        </section>
        <GhostSidebar
          state={state}
          onSource={visit}
          agentStatus={agentStatus}
          reason={reason}
          onDraft={generateDraft}
          draftStatus={draftStatus}
          draftFactIds={draftFactIds}
          contextOrigin={contextOrigin}
          diagnostic={diagnostic}
        />
      </main>
      <footer className="bottom-bar">
        <span>
          <span className="live-dot" /> GHOST is following your workflow
        </span>
        <span>
          The prompt isn’t what you type.{" "}
          <strong>The prompt is what you do.</strong>
        </span>
        <span>AGENTS, EVERYWHERE ’26</span>
      </footer>
    </div>
  );
}
function Message({
  initials,
  name,
  time,
  color,
  children,
}: {
  initials: string;
  name: string;
  time: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="message">
      <span className={`avatar ${color}`}>{initials}</span>
      <div>
        <div className="message-heading">
          <strong>{name}</strong>
          <time>{time}</time>
        </div>
        {children}
      </div>
    </div>
  );
}
