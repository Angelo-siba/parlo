import { ArrowRight, ArrowUpRight, Camera, Check, CheckCircle2, Clock3, Download, FileCheck2, FolderKanban, Palette, Receipt, Sparkles, Video, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const orange = "#d4521a";

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a href="/" className="flex items-center gap-2.5" aria-label="Parlo home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4521a] text-lg font-bold text-white shadow-sm">P</span>
      <span className={dark ? "text-lg font-semibold tracking-tight text-white" : "text-lg font-semibold tracking-tight text-[#2c211b]"}>Parlo</span>
    </a>
  );
}

function PublicHeader() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <Logo />
      <nav className="hidden items-center gap-8 text-sm font-medium text-[#6e625a] md:flex">
        <a href="#features" className="transition-colors hover:text-[#2c211b]">Features</a>
        <a href="#comparison" className="transition-colors hover:text-[#2c211b]">Why Parlo</a>
        <a href="/pricing" className="transition-colors hover:text-[#2c211b]">Pricing</a>
      </nav>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button asChild variant="ghost" className="hidden text-[#594b43] sm:inline-flex">
          <a href="/login">Log in</a>
        </Button>
        <Button asChild className="bg-[#d4521a] text-white shadow-sm hover:bg-[#b94615]">
          <a href="/signup">Get started</a>
        </Button>
      </div>
    </header>
  );
}

function WindowChrome({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"overflow-hidden rounded-2xl border border-[#e4d7cc] bg-[#fffdfa] shadow-[0_24px_70px_rgba(68,42,25,0.14)] " + className}>
      <div className="flex items-center gap-2 border-b border-[#eee4da] bg-[#fbf7f1] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b5a0]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ead5ad]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#bfd1b0]" />
        <span className="ml-3 truncate text-[10px] font-medium text-[#9b8e84]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function DashboardMockup() {
  return (
    <WindowChrome title="parlo.app / workspace">
      <div className="flex min-h-[285px] bg-[#fffdfa] text-left">
        <aside className="hidden w-[112px] border-r border-[#eee4da] bg-[#fcf8f3] p-3 sm:block">
          <div className="mb-7 flex items-center gap-1.5 text-[10px] font-semibold text-[#2c211b]"><span className="flex h-4 w-4 items-center justify-center rounded bg-[#d4521a] text-[8px] text-white">P</span> Parlo</div>
          <div className="space-y-2 text-[9px] text-[#9b8e84]"><div className="rounded-md bg-[#f4e3d8] px-2 py-1.5 font-semibold text-[#d4521a]">Overview</div><div className="px-2 py-1.5">Projects</div><div className="px-2 py-1.5">Settings</div></div>
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between"><div><div className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#a39287]">Workspace</div><div className="mt-1 text-sm font-semibold text-[#2c211b]">Good morning, Angelo</div></div><div className="rounded-md bg-[#d4521a] px-2.5 py-1.5 text-[9px] font-semibold text-white">+ New project</div></div>
          <div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-lg border border-[#eee4da] bg-[#fbf7f1] p-2.5"><div className="text-[9px] text-[#9b8e84]">Active projects</div><div className="mt-1 text-base font-semibold text-[#2c211b]">4</div></div><div className="rounded-lg border border-[#eee4da] bg-[#fbf7f1] p-2.5"><div className="text-[9px] text-[#9b8e84]">Awaiting review</div><div className="mt-1 text-base font-semibold text-[#d4521a]">2</div></div><div className="rounded-lg border border-[#eee4da] bg-[#fbf7f1] p-2.5"><div className="text-[9px] text-[#9b8e84]">This month</div><div className="mt-1 text-base font-semibold text-[#2c211b]">$2.4k</div></div></div>
          <div className="mt-5 flex items-center justify-between"><div className="text-[11px] font-semibold text-[#2c211b]">Your projects</div><div className="text-[9px] text-[#d4521a]">View all</div></div>
          <div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-lg border border-[#eee4da] p-2.5"><div className="flex items-center justify-between"><div className="h-5 w-5 rounded bg-[#f0d7c9]" /><span className="rounded-full bg-[#fff0e9] px-1.5 py-0.5 text-[8px] text-[#d4521a]">In review</span></div><div className="mt-2 text-[10px] font-semibold text-[#2c211b]">Brand refresh</div><div className="mt-1 text-[8px] text-[#9b8e84]">Maya Creative · 6 files</div></div><div className="rounded-lg border border-[#eee4da] p-2.5"><div className="flex items-center justify-between"><div className="h-5 w-5 rounded bg-[#dce8dd]" /><span className="rounded-full bg-[#e8f3e9] px-1.5 py-0.5 text-[8px] text-[#56815b]">Active</span></div><div className="mt-2 text-[10px] font-semibold text-[#2c211b]">Product shoot</div><div className="mt-1 text-[8px] text-[#9b8e84]">Onda Studio · 3 files</div></div></div>
        </div>
      </div>
    </WindowChrome>
  );
}

function PortalMockup() {
  return (
    <WindowChrome title="parlo.app / client portal">
      <div className="min-h-[285px] bg-[#f5f0e8] p-4 text-left sm:p-5">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4521a] text-xs font-bold text-white">P</div><div><div className="text-[10px] font-semibold text-[#2c211b]">Maya Creative</div><div className="text-[8px] text-[#9b8e84]">Brand refresh</div></div></div><span className="rounded-full border border-[#d9c8ba] bg-[#fffdfa] px-2 py-1 text-[8px] text-[#77685e]">Client portal</span></div>
        <div className="mt-5 rounded-xl border border-[#e4d7cc] bg-[#fffdfa] p-4"><div className="flex items-end justify-between"><div><div className="text-[8px] uppercase tracking-[0.13em] text-[#a39287]">Review files</div><div className="mt-1 text-sm font-semibold text-[#2c211b]">Final brand assets</div></div><div className="text-[9px] font-medium text-[#d4521a]">2 of 3 approved</div></div><div className="mt-4 space-y-2"><div className="flex items-center justify-between rounded-lg border border-[#eee4da] px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><div className="h-6 w-6 rounded bg-[#eed4c5]" /><div className="min-w-0"><div className="truncate text-[9px] font-medium text-[#2c211b]">Primary-logo.svg</div><div className="text-[8px] text-[#9b8e84]">2.4 MB · v3</div></div></div><span className="flex items-center gap-1 text-[8px] font-semibold text-[#56815b]"><CheckCircle2 className="h-3 w-3" /> Approved</span></div><div className="flex items-center justify-between rounded-lg border border-[#eee4da] px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><div className="h-6 w-6 rounded bg-[#d8e1ed]" /><div className="min-w-0"><div className="truncate text-[9px] font-medium text-[#2c211b]">Social-templates.zip</div><div className="text-[8px] text-[#9b8e84]">18.2 MB · v2</div></div></div><span className="rounded-full bg-[#fff1e9] px-1.5 py-1 text-[8px] font-semibold text-[#d4521a]">Review</span></div><div className="flex items-center justify-between rounded-lg border border-[#eee4da] px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><div className="h-6 w-6 rounded bg-[#e9dfc6]" /><div className="min-w-0"><div className="truncate text-[9px] font-medium text-[#2c211b]">Brand-guidelines.pdf</div><div className="text-[8px] text-[#9b8e84]">4.1 MB · v1</div></div></div><span className="flex items-center gap-1 text-[8px] font-semibold text-[#56815b]"><CheckCircle2 className="h-3 w-3" /> Approved</span></div></div></div>
      </div>
    </WindowChrome>
  );
}

function InvoiceMockup() {
  return (
    <WindowChrome title="parlo.app / invoice INV-0042">
      <div className="min-h-[285px] bg-[#fffdfa] p-4 text-left sm:p-5"><div className="flex items-start justify-between border-b border-[#eee4da] pb-4"><div><div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2c211b]"><span className="flex h-5 w-5 items-center justify-center rounded bg-[#d4521a] text-[8px] text-white">P</span> Parlo</div><div className="mt-3 text-[8px] uppercase tracking-[0.13em] text-[#a39287]">Invoice for</div><div className="mt-1 text-[10px] font-semibold text-[#2c211b]">Onda Studio</div></div><div className="text-right"><div className="text-[9px] font-semibold text-[#2c211b]">INV-0042</div><div className="mt-1 text-[8px] text-[#9b8e84]">Due 24 Oct 2026</div><span className="mt-2 inline-flex rounded-full bg-[#fff1e9] px-2 py-1 text-[8px] font-semibold text-[#d4521a]">Awaiting payment</span></div></div><div className="space-y-2 py-4"><div className="flex justify-between text-[9px] text-[#76675e]"><span>Creative direction</span><span>$450.00</span></div><div className="flex justify-between text-[9px] text-[#76675e]"><span>Final asset delivery</span><span>$850.00</span></div><div className="mt-3 flex justify-between border-t border-[#eee4da] pt-3 text-[11px] font-semibold text-[#2c211b]"><span>Total</span><span>$1,300.00</span></div></div><div className="flex items-center justify-between rounded-lg bg-[#fbf2ed] p-2.5"><div className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5 text-[#d4521a]" /><span className="text-[8px] text-[#765f53]">Secure payment via PayPal</span></div><span className="rounded-md bg-[#d4521a] px-2.5 py-1.5 text-[8px] font-semibold text-white">Pay now</span></div></div>
    </WindowChrome>
  );
}

const features = [
  { icon: FolderKanban, title: "One calm workspace", description: "Keep briefs, files, approvals, and project status together instead of stitching together five different tools.", mockup: <DashboardMockup /> },
  { icon: FileCheck2, title: "A client experience that feels premium", description: "Give clients one clean link to review files, leave feedback, approve work, and see what happens next.", mockup: <PortalMockup /> },
  { icon: Receipt, title: "Invoices that move projects forward", description: "Send a clear invoice alongside the work and make it easy for clients to pay without another account to create.", mockup: <InvoiceMockup /> },
];

function FeatureIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e9] text-[#d4521a]"><Icon className="h-5 w-5" /></div>;
}

const TEMPLATE_RESOURCES = [
  {
    eyebrow: "Proposal",
    title: "Client brief & proposal",
    description: "Turn a discovery call into a clear, professional starting point.",
    file: "parlo-client-brief-proposal-template.docx",
    sections: ["Project snapshot", "Goals, scope & timeline", "Investment and next steps"],
    icon: FileCheck2,
  },
  {
    eyebrow: "Scope",
    title: "Scope of work",
    description: "Make deliverables, revisions, and boundaries impossible to misremember.",
    file: "parlo-scope-of-work-template.docx",
    sections: ["Deliverables & revisions", "What's out of scope", "Timeline and change requests"],
    icon: FolderKanban,
  },
  {
    eyebrow: "Payments",
    title: "Late-payment invoice terms",
    description: "Set payment expectations before chasing money becomes part of the job.",
    file: "parlo-late-payment-invoice-template.docx",
    sections: ["Itemized charges", "Late payment policy", "Reminder and notice steps"],
    icon: Receipt,
  },
];

function TemplateCard({ resource }: { resource: (typeof TEMPLATE_RESOURCES)[number] }) {
  const Icon = resource.icon;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e4d7cc] bg-[#fffdfa] p-6 shadow-[0_12px_32px_rgba(68,42,25,0.06)] transition-transform hover:-translate-y-1 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0e9] text-[#d4521a]"><Icon className="h-5 w-5" /></div>
        <span className="rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b776a]">{resource.eyebrow}</span>
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-[#2c211b]">{resource.title}</h3>
      <p className="mt-3 min-h-[3.5rem] text-sm leading-6 text-[#75665d]">{resource.description}</p>
      <div className="mt-6 flex-1 border-t border-[#eee4da] pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a39287]">Inside the template</p>
        <ul className="mt-3 space-y-2.5 text-sm text-[#5f5148]">
          {resource.sections.map((section) => (
            <li key={section} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#d4521a]" />{section}</li>
          ))}
        </ul>
      </div>
      <a href={`/templates/${resource.file}`} download className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d8c5b8] px-4 text-sm font-semibold text-[#b44819] transition-colors hover:bg-[#fff0e9]">Download .DOCX <Download className="h-4 w-4" /></a>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f0e8] text-[#2c211b]">
      <PublicHeader />
      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="pointer-events-none absolute -right-32 -top-28 h-[480px] w-[480px] rounded-full bg-[#e8c3ae]/35 blur-3xl" />
          <div className="relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5cabb] bg-[#fbebe3] px-3 py-1.5 text-xs font-semibold text-[#b44819]"><Sparkles className="h-3.5 w-3.5" /> Built for the way freelancers actually work</div>
              <h1 className="max-w-xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-[#2c211b] sm:text-6xl lg:text-[4.5rem]">Stop chasing clients.<br /><span className="text-[#d4521a]">Start delivering.</span></h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-[#6f6259] sm:text-xl">Parlo gives solo freelancers a simple home for projects, client reviews, approvals, and invoices—so your work feels as professional as the work itself.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"><Button asChild size="lg" className="h-14 rounded-xl bg-[#d4521a] px-7 text-base font-semibold text-white shadow-[0_10px_24px_rgba(212,82,26,0.25)] hover:bg-[#b94615]"><a href="/signup">Get Started — It's Free <ArrowRight className="ml-2 h-4 w-4" /></a></Button><Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-[#cdbbae] bg-transparent px-7 text-base font-semibold text-[#4f4038] hover:bg-[#fffaf5]"><a href="/pricing">See Pricing <ArrowUpRight className="ml-2 h-4 w-4" /></a></Button></div>
              <div className="mt-5 flex items-center gap-4 text-xs text-[#8e7e73]"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#d4521a]" /> No credit card required</span><span className="h-1 w-1 rounded-full bg-[#c3b1a4]" /><span>Set up in 2 minutes</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-2xl lg:mr-0"><div className="absolute -inset-4 rounded-[2rem] bg-[#e4b59f]/25 blur-2xl" /><div className="relative rotate-[1.2deg]"><DashboardMockup /></div><div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-[#e3d2c5] bg-[#fffdfa] p-3 shadow-[0_16px_40px_rgba(68,42,25,0.12)] sm:block"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f0e5] text-[#5c895f]"><CheckCircle2 className="h-4 w-4" /></div><div><div className="text-[10px] font-semibold text-[#2c211b]">Client approved</div><div className="text-[9px] text-[#94847a]">Brand-guidelines.pdf</div></div></div></div></div>
          </div>
        </section>

        <section className="border-y border-[#e2d5c9] bg-[#faf5ef] px-5 py-7 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 sm:flex-row"><p className="text-center text-sm font-medium text-[#806f63] sm:text-left">Trusted by freelancers across 3+ countries</p><div className="flex items-center gap-5 text-[#8d7c70] sm:gap-8"><span className="flex items-center gap-2 text-xs font-semibold"><Camera className="h-4 w-4 text-[#d4521a]" /> Photographers</span><span className="flex items-center gap-2 text-xs font-semibold"><Palette className="h-4 w-4 text-[#d4521a]" /> Designers</span><span className="flex items-center gap-2 text-xs font-semibold"><Video className="h-4 w-4 text-[#d4521a]" /> Videographers</span></div></div></section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d4521a]">Less admin, more making</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#2c211b] sm:text-5xl">Everything your client needs.<br />Nothing they don't.</h2><p className="mt-5 text-lg leading-8 text-[#75675e]">A polished workflow for the parts of freelance work that usually get messy.</p></div><div className="mt-14 grid gap-6 lg:grid-cols-3">{features.map(({ icon, title, description, mockup }) => <article key={title} className="group rounded-2xl border border-[#e3d5c9] bg-[#fbf7f1] p-4 transition-transform hover:-translate-y-1 sm:p-5"><div className="mb-5 px-1"><FeatureIcon icon={icon} /><h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#2c211b]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#78695f]">{description}</p></div><div className="overflow-hidden rounded-xl">{mockup}</div></article>)}</div></section>

        
         <section id="templates" className="border-y border-[#e2d5c9] bg-[#faf5ef] px-5 py-24 sm:px-8 lg:px-10 lg:py-28">
           <div className="mx-auto max-w-7xl">
             <div className="max-w-2xl">
               <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d4521a]">Free resources</p>
               <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#2c211b] sm:text-5xl">The paperwork that makes you look established.</h2>
               <p className="mt-5 max-w-xl text-lg leading-8 text-[#75665d]">Start with the same documents we built for freelancers who want clearer projects, firmer boundaries, and fewer awkward follow-ups. No account required.</p>
             </div>
             <div className="mt-12 grid gap-5 lg:grid-cols-3">
               {TEMPLATE_RESOURCES.map((resource) => <TemplateCard key={resource.file} resource={resource} />)}
             </div>
             <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#e4d7cc] bg-[#fffdfa] px-5 py-4 text-sm sm:flex-row sm:items-center sm:px-6">
               <p className="text-[#75665d]">Download the templates free. Use Parlo when you’re ready to keep the whole project in one place.</p>
               <a href="/signup" className="inline-flex flex-shrink-0 items-center gap-2 font-semibold text-[#b44819] hover:text-[#8f3714]">Try Parlo free <ArrowRight className="h-4 w-4" /></a>
             </div>
           </div>
         </section>
         <section id="comparison" className="bg-[#2c211b] px-5 py-24 text-white sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ed9a70]">Built for solo work</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">The professional client experience—without the enterprise bill.</h2><p className="mt-5 max-w-md text-base leading-7 text-white/60">Parlo gives you the pieces that matter when you work alone, without making you spend hours learning a system built for a 50-person agency.</p><Button asChild className="mt-8 bg-[#d4521a] text-white hover:bg-[#b94615]"><a href="/signup">Try Parlo free <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-white/10"><th className="px-4 py-4 font-medium text-white/50 sm:px-6"> </th><th className="bg-[#d4521a] px-4 py-4 font-semibold text-white sm:px-6">Parlo</th><th className="px-4 py-4 font-medium text-white/50 sm:px-6">Kitchen.co</th></tr></thead><tbody>{[["Price", "$9/month", "$29/month"],["Client login needed", "No", "Yes"],["Setup time", "2 minutes", "Hours"],["Built for solo freelancers", "Yes", "No"]].map(([label, parlo, kitchen]) => <tr key={label} className="border-b border-white/10 last:border-0"><th className="px-4 py-5 font-medium text-white/70 sm:px-6">{label}</th><td className="bg-[#d4521a]/10 px-4 py-5 font-semibold text-white sm:px-6">{parlo === "Yes" ? <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#ed9a70]" /> Yes</span> : parlo}</td><td className="px-4 py-5 text-white/55 sm:px-6">{kitchen === "No" ? <span className="text-white/35">✕ No</span> : kitchen}</td></tr>)}</tbody></table></div></div></section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32"><div className="relative overflow-hidden rounded-[2rem] bg-[#d4521a] px-7 py-16 text-center text-white shadow-[0_24px_70px_rgba(212,82,26,0.22)] sm:px-12"><div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/10" /><div className="pointer-events-none absolute -bottom-40 -right-10 h-80 w-80 rounded-full border-[40px] border-white/10" /><div className="relative"><Zap className="mx-auto h-7 w-7 text-[#ffd1bc]" /><h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Ready to stop chasing clients?</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">Give your work a home that makes clients feel looked after—and gives you your time back.</p><Button asChild size="lg" className="mt-8 h-13 bg-white px-7 text-base font-semibold text-[#b94615] shadow-none hover:bg-[#fff4ed]"><a href="/signup">Start Free Today <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div></div></section>
      </main>
      <footer className="border-t border-[#e2d5c9] px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><Logo /><div className="flex items-center gap-5 text-sm text-[#88786d]"><a href="/pricing" className="hover:text-[#2c211b]">Pricing</a><a href="/login" className="hover:text-[#2c211b]">Log in</a><a href="/signup" className="font-semibold text-[#d4521a] hover:text-[#b94615]">Get started</a></div><p className="text-xs text-[#a39287]">© {new Date().getFullYear()} Parlo</p></div></footer>
    </div>
  );
}
