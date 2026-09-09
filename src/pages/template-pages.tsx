import { useEffect } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Download, FileText } from "lucide-react";
import { Link } from "wouter";

export type TemplatePageData = {
  slug: string;
  title: string;
  category: string;
  oneLine: string;
  intro: string;
  secondParagraph: string;
  metaTitle: string;
  metaDescription: string;
  filename: string;
  downloadHref: string;
  preview: string[];
  accent: string;
};

export const templatePages = {
  scopeOfWork: {
    slug: "scope-of-work",
    title: "Scope of Work Template",
    category: "Project boundaries",
    oneLine: "Stop scope creep before it starts with a clear, client-ready scope of work.",
    intro: "A vague brief creates room for endless revisions, surprise deliverables, and the dreaded “just one more thing.” This free scope of work template makes the agreement concrete before any work begins.",
    secondParagraph: "Fill in the deliverables, revision limit, timeline, payment terms, and change-request process, then send it alongside your proposal. Your client knows what is included, and you have something clear to point back to when the project changes.",
    metaTitle: "Free Scope of Work Template for Freelance Designers | Parlo",
    metaDescription: "A free, editable scope-of-work template that stops clients from adding “just one more thing” after you have started. Download as a Word doc.",
    filename: "parlo-scope-of-work-template.docx",
    downloadHref: "/templates/parlo-scope-of-work-template.docx",
    preview: [
      "Specific deliverables and exclusions",
      "Revision limits that clients can understand",
      "Milestones, due dates, and payment terms",
      "A written change-request process",
    ],
    accent: "#E6EFE8",
  },
  latePayment: {
    slug: "late-payment-invoice",
    title: "Late Payment Invoice Template",
    category: "Getting paid",
    oneLine: "Set the payment terms before you have to chase the invoice.",
    intro: "Late payments are harder to handle when the rules were never written down. This free late-payment invoice template helps you make due dates, accepted methods, late fees, and next steps clear from the beginning.",
    secondParagraph: "Use it with every invoice or proposal so a reminder feels like a process, not a personal confrontation. Customize the timing and percentages to match your own terms, then get the client’s acknowledgement before work starts.",
    metaTitle: "Free Late Payment Invoice Template for Freelancers | Parlo",
    metaDescription: "A free late-payment invoice template for freelancers. Set due dates, late fees, reminders, and next steps clearly. Download the editable Word doc.",
    filename: "parlo-late-payment-invoice-template.docx",
    downloadHref: "/templates/parlo-late-payment-invoice-template.docx",
    preview: [
      "Invoice details and itemized charges",
      "Payment methods and due-date language",
      "A customizable late-payment policy",
      "A clear reminder and escalation timeline",
    ],
    accent: "#F3E6DF",
  },
  clientBrief: {
    slug: "client-brief-proposal",
    title: "Client Brief & Proposal Template",
    category: "Winning the work",
    oneLine: "Look as professional as the work you are about to deliver.",
    intro: "A scattered email recap can make a great freelancer look unprepared. This free client brief and proposal template turns the discovery call into a polished document that shows you listened and know how to lead the project.",
    secondParagraph: "Capture the client’s goals in their own words, outline what is included, set the timeline and investment, and give them a confident next step. It is the kind of first impression that makes saying yes feel easy.",
    metaTitle: "Free Client Brief & Proposal Template for Freelancers | Parlo",
    metaDescription: "A free client brief and proposal template for freelance designers and photographers who want to look professional, clarify the project, and win trust. Download as a Word doc.",
    filename: "parlo-client-brief-proposal-template.docx",
    downloadHref: "/templates/parlo-client-brief-proposal-template.docx",
    preview: [
      "Project goals written in the client’s words",
      "Deliverables, timeline, and investment",
      "A short section for why you are the right fit",
      "Next steps and signature lines",
    ],
    accent: "#E9E5F0",
  },
} satisfies Record<string, TemplatePageData>;

export function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;
    const previousOgTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
    const previousOgDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;

    document.title = title;

    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);

    return () => {
      document.title = previousTitle;
      const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      const ogTitleMeta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
      const ogDescriptionMeta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      if (descriptionMeta && previousDescription !== undefined) descriptionMeta.content = previousDescription;
      if (ogTitleMeta && previousOgTitle !== undefined) ogTitleMeta.content = previousOgTitle;
      if (ogDescriptionMeta && previousOgDescription !== undefined) ogDescriptionMeta.content = previousOgDescription;
    };
  }, [title, description]);
}

export function TemplateSiteHeader() {
  return (
    <header className="border-b border-[#D8CEC2] bg-[#F0EBE3]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/templates" className="flex items-center gap-3" aria-label="Parlo free templates">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1814] text-sm font-bold text-[#F0EBE3]">P</span>
          <span className="text-lg font-semibold tracking-[-0.03em] text-[#1C1814]">Parlo</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm" aria-label="Templates navigation">
          <Link href="/templates" className="hidden text-[#5B5149] transition hover:text-[#C84A1A] sm:block">Free templates</Link>
          <a href="/" className="inline-flex items-center gap-2 rounded-full bg-[#C84A1A] px-4 py-2.5 font-semibold text-white transition hover:bg-[#A83D15]">Try Parlo for free <ArrowRight className="h-4 w-4" /></a>
        </nav>
      </div>
    </header>
  );
}

export function TemplateCard({ template }: { template: TemplatePageData }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#D8CEC2] bg-white p-3 shadow-[0_8px_24px_rgba(28,24,20,0.05)]">
      <div className="flex min-h-44 flex-col justify-between rounded-xl p-6" style={{ backgroundColor: template.accent }}>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6258]"><span>{template.category}</span><FileText className="h-4 w-4" /></div>
        <div>
          <div className="mb-3 h-2 w-16 rounded-full bg-[#C84A1A]" />
          <div className="h-3 w-4/5 rounded bg-[#1C1814]/80" />
          <div className="mt-2 h-2 w-3/5 rounded bg-[#1C1814]/25" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-6">
        <h2 className="text-xl font-bold leading-tight text-[#1C1814]" style={{ fontFamily: "Georgia, serif" }}>{template.title}</h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-[#5B5149]">{template.oneLine}</p>
        <div className="mt-6 flex items-center gap-4 text-sm font-semibold">
          <a href={template.downloadHref} download={template.filename} className="inline-flex items-center gap-2 text-[#C84A1A] hover:underline">Download <Download className="h-4 w-4" /></a>
          <Link href={`/templates/${template.slug}`} className="inline-flex items-center gap-1 text-[#1C1814] hover:text-[#C84A1A]">View details <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  );
}

export function TemplateDetailPage({ template }: { template: TemplatePageData }) {
  usePageMetadata(template.metaTitle, template.metaDescription);

  return (
    <div className="min-h-screen bg-[#F0EBE3] text-[#1C1814]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <TemplateSiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
          <Link href="/templates" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6E6258] hover:text-[#C84A1A]"><ChevronRight className="h-4 w-4 rotate-180" /> All free templates</Link>
          <section className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C84A1A]">{template.category}</p>
              <h1 className="mt-4 max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-0.04em] text-[#1C1814] sm:text-6xl" style={{ fontFamily: "Georgia, serif" }}>{template.title}</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#5B5149]">{template.intro}</p>
              <a href={template.downloadHref} download={template.filename} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#C84A1A] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(200,74,26,0.22)] transition hover:bg-[#A83D15]"><Download className="h-4 w-4" /> Download free template (.docx)</a>
              <p className="mt-3 text-xs text-[#6E6258]">Free Word document · No login or email required</p>
            </div>
            <div className="rounded-3xl border border-[#D8CEC2] p-4 shadow-[0_18px_42px_rgba(28,24,20,0.08)]" style={{ backgroundColor: template.accent }}>
              <div className="mx-auto max-w-sm rounded-sm bg-white p-7 shadow-[0_12px_28px_rgba(28,24,20,0.12)] sm:p-10">
                <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.16em] text-[#C84A1A]">PARLO</span><span className="text-xs text-[#9A8F84]">FREE TEMPLATE</span></div>
                <div className="mt-12 h-3 w-4/5 rounded bg-[#1C1814]" />
                <div className="mt-3 h-2 w-3/5 rounded bg-[#D8CEC2]" />
                <div className="mt-12 space-y-3"><div className="h-2 rounded bg-[#E9E3DB]" /><div className="h-2 w-11/12 rounded bg-[#E9E3DB]" /><div className="h-2 w-4/5 rounded bg-[#E9E3DB]" /></div>
                <div className="mt-12 grid grid-cols-2 gap-3"><div className="h-16 rounded bg-[#F7F4F0]" /><div className="h-16 rounded bg-[#F7F4F0]" /></div>
              </div>
            </div>
          </section>

          <section className="mt-20 grid gap-8 border-t border-[#D8CEC2] pt-12 md:grid-cols-[0.9fr_1.1fr]">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C84A1A]">What is inside</p><h2 className="mt-3 text-3xl font-bold leading-tight text-[#1C1814]" style={{ fontFamily: "Georgia, serif" }}>A better starting point for the project.</h2></div>
            <div><p className="text-base leading-7 text-[#5B5149]">{template.secondParagraph}</p><ul className="mt-7 space-y-4">{template.preview.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#1C1814]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C84A1A]" />{item}</li>)}</ul></div>
          </section>

          <section className="mt-20 rounded-2xl border border-[#C84A1A]/35 bg-white/65 p-7 sm:p-10">
            <p className="max-w-2xl text-xl font-bold leading-tight text-[#1C1814] sm:text-2xl" style={{ fontFamily: "Georgia, serif" }}>Prefer to skip the paperwork?</p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5B5149]">Parlo keeps scope, feedback, files, and invoices in one shareable client link.</p>
            <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[#C84A1A] px-5 py-3 text-sm font-bold text-[#C84A1A] transition hover:bg-[#C84A1A] hover:text-white">Try Parlo for free <ArrowRight className="h-4 w-4" /></a>
          </section>
        </div>
      </main>
      <footer className="border-t border-[#D8CEC2] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-[#6E6258] sm:flex-row sm:items-center sm:justify-between"><span>© Parlo · Free resources for better client work.</span><Link href="/templates" className="font-semibold hover:text-[#C84A1A]">Browse all templates</Link></div></footer>
    </div>
  );
}

export function ScopeOfWorkTemplatePage() { return <TemplateDetailPage template={templatePages.scopeOfWork} />; }
export function LatePaymentTemplatePage() { return <TemplateDetailPage template={templatePages.latePayment} />; }
export function ClientBriefTemplatePage() { return <TemplateDetailPage template={templatePages.clientBrief} />; }
