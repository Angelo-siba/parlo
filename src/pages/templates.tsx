import { ArrowRight, Check, Download, FileText, Sparkles } from "lucide-react";
import { Link } from "wouter";

type Template = {
  title: string;
  category: string;
  description: string;
  filename: string;
  href: string;
  accent: string;
  pageCount: string;
};

const templates: Template[] = [
  {
    title: "Client Brief & Proposal",
    category: "Proposals",
    description:
      "Turn a discovery call into a clear, confident proposal that sets the project up for a great start.",
    filename: "parlo-client-brief-proposal-template.docx",
    href: "/templates/parlo-client-brief-proposal-template.docx",
    accent: "bg-[#f3ede5]",
    pageCount: "2 pages",
  },
  {
    title: "Scope of Work",
    category: "Projects",
    description:
      "Make deliverables, revisions, timelines, and out-of-scope requests impossible to misremember.",
    filename: "parlo-scope-of-work-template.docx",
    href: "/templates/parlo-scope-of-work-template.docx",
    accent: "bg-[#e8efea]",
    pageCount: "2 pages",
  },
  {
    title: "Payment Terms & Late Invoice",
    category: "Payments",
    description:
      "Set payment expectations before the awkward follow-up, with a clear process for overdue invoices.",
    filename: "parlo-late-payment-terms-template.docx",
    href: "/templates/parlo-late-payment-terms-template.docx",
    accent: "bg-[#eee9f2]",
    pageCount: "2 pages",
  },
];

function DocumentPreview({ template }: { template: Template }) {
  return (
    <div className={`relative aspect-[1.46/1] overflow-hidden rounded-2xl p-5 sm:p-7 ${template.accent}`}>
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
      <div className="relative mx-auto h-full max-w-[245px] rounded-sm bg-white px-5 py-5 shadow-[0_12px_28px_rgba(44,38,32,0.12)] sm:px-6 sm:py-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-2 w-12 rounded-full bg-[#24211f]" />
          <span className="text-[7px] font-semibold tracking-[0.18em] text-[#9a9289]">PARLO</span>
        </div>
        <div className="mb-5 h-10 w-4/5 rounded-sm bg-[#f2f0ed]" />
        <div className="space-y-2.5">
          <div className="h-1.5 w-full rounded-full bg-[#e9e5df]" />
          <div className="h-1.5 w-11/12 rounded-full bg-[#e9e5df]" />
          <div className="h-1.5 w-3/4 rounded-full bg-[#e9e5df]" />
        </div>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <div className="h-12 rounded-sm bg-[#faf9f7]" />
          <div className="h-12 rounded-sm bg-[#faf9f7]" />
        </div>
        <div className="mt-6 h-1.5 w-1/2 rounded-full bg-[#c6beb5]" />
      </div>
      <div className="absolute bottom-4 left-5 flex items-center gap-1.5 text-[10px] font-medium text-[#655d55] sm:left-7">
        <FileText className="h-3 w-3" />
        {template.pageCount}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#292522]">
      <header className="sticky top-0 z-20 border-b border-[#e8e3dc]/80 bg-[#faf9f7]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/templates" className="flex items-center gap-2.5" aria-label="Parlo templates home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#292522] text-sm font-semibold text-white shadow-sm">
              P
            </div>
            <span className="text-[17px] font-semibold tracking-[-0.03em]">Parlo</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-[#716961] md:flex" aria-label="Main navigation">
            <a href="#templates" className="transition-colors hover:text-[#292522]">Templates</a>
            <a href="#why-parlo" className="transition-colors hover:text-[#292522]">Why Parlo</a>
          </nav>

          <a
            href="/?mode=signup"
            className="inline-flex items-center gap-2 rounded-full bg-[#292522] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#49413b]"
          >
            Try Parlo for free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28 lg:px-10">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#eee9e1] opacity-70 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ded7ce] bg-white/70 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d736b]">
              <Sparkles className="h-3.5 w-3.5 text-[#b66a4b]" />
              Free resources for freelancers
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#292522] sm:text-6xl lg:text-7xl">
              The templates that make your work look as good as it is.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#716961] sm:text-lg">
              Polished, practical documents for the moments that shape a client project — from the first proposal to the final payment.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#templates"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#b66a4b] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(182,106,75,0.2)] transition hover:bg-[#9f593d] sm:w-auto"
              >
                Browse templates
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/?mode=signup"
                className="inline-flex w-full items-center justify-center rounded-full border border-[#d9d1c8] bg-white/70 px-6 py-3.5 text-sm font-semibold text-[#403a35] transition hover:border-[#bdb2a7] hover:bg-white sm:w-auto"
              >
                Try Parlo for free
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-[#e8e3dc] bg-white/60 px-5 py-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-[#716961]">No login. No email gate. Just useful documents you can use today.</p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#8d837a]">
              <Check className="h-4 w-4 text-[#6d927b]" />
              Made for independent creatives
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b66a4b]">The template library</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#292522] sm:text-4xl">Start with a stronger document.</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-[#716961]">Download, customize, and send. Each template is written to help you look professional and keep projects moving.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-[#292522] px-4 py-2 font-medium text-white">All templates</span>
                <span className="rounded-full border border-[#e1d9d0] bg-white px-4 py-2 text-[#716961]">Proposals</span>
                <span className="rounded-full border border-[#e1d9d0] bg-white px-4 py-2 text-[#716961]">Projects</span>
                <span className="rounded-full border border-[#e1d9d0] bg-white px-4 py-2 text-[#716961]">Payments</span>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {templates.map((template) => (
                <article key={template.title} className="group rounded-[1.35rem] border border-[#e5ded5] bg-white p-3 shadow-[0_8px_30px_rgba(43,35,28,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(43,35,28,0.10)]">
                  <DocumentPreview template={template} />
                  <div className="px-3 pb-3 pt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#b66a4b]">{template.category}</span>
                      <span className="rounded-full bg-[#f7f3ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d837a]">Free docx</span>
                    </div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#292522]">{template.title}</h3>
                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#716961]">{template.description}</p>
                    <a
                      href={template.href}
                      download={template.filename}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9d1c8] px-4 py-3 text-sm font-semibold text-[#403a35] transition hover:border-[#292522] hover:bg-[#292522] hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                      Download template
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why-parlo" className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[#292522] text-white lg:grid-cols-[1.2fr_0.8fr]">
            <div className="px-7 py-12 sm:px-12 sm:py-16">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#d79879]">More than templates</p>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Keep every client project moving from one shareable link.</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#c9c0b8]">Parlo brings scope, feedback, files, and invoices together, so you can spend less time chasing the work and more time doing it.</p>
              <a href="/?mode=signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#292522] transition hover:bg-[#f1ebe4]">
                Try Parlo for free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="relative hidden min-h-[280px] overflow-hidden bg-[#39322d] lg:block">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-[#6e6258]" />
              <div className="absolute -right-5 top-8 h-52 w-52 rounded-full border border-[#6e6258]" />
              <div className="absolute bottom-10 left-12 h-32 w-48 rotate-[-7deg] rounded-xl border border-[#776b61] bg-[#49403a] p-4 shadow-2xl">
                <div className="h-2 w-16 rounded bg-[#d79879]" />
                <div className="mt-5 space-y-2"><div className="h-1.5 w-full rounded bg-[#776b61]" /><div className="h-1.5 w-4/5 rounded bg-[#776b61]" /><div className="h-1.5 w-3/5 rounded bg-[#776b61]" /></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e8e3dc] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#8d837a] sm:flex-row sm:items-center sm:justify-between">
          <span>© Parlo. Built for better client work.</span>
          <span>Free templates, no account required.</span>
        </div>
      </footer>
    </div>
  );
}
