import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { TemplateCard, TemplateSiteHeader, templatePages, usePageMetadata } from "@/pages/template-pages";

const templates = [templatePages.scopeOfWork, templatePages.latePayment, templatePages.clientBrief];

export default function TemplatesPage() {
  usePageMetadata(
    "Free Templates for Freelance Designers & Photographers | Parlo",
    "Free, editable templates for freelance designers and photographers: scope of work, late payment invoice, and client brief proposals. Download instantly as Word docs.",
  );

  return (
    <div className="min-h-screen bg-[#F0EBE3] text-[#1C1814]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <TemplateSiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C84A1A]">Free resources from Parlo</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-[#1C1814] sm:text-7xl" style={{ fontFamily: "Georgia, serif" }}>Free templates for freelance designers & photographers</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5B5149]">Practical, polished documents for the moments that can make or break a client project. Download them free, customize them for your business, and send them with confidence.</p>
          <a href="#template-list" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#C84A1A] hover:underline">Browse the templates <ArrowRight className="h-4 w-4" /></a>
        </section>

        <section id="template-list" className="border-y border-[#D8CEC2] bg-white/45 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C84A1A]">The library</p><h2 className="mt-3 text-3xl font-bold text-[#1C1814]" style={{ fontFamily: "Georgia, serif" }}>Start with the document you need.</h2></div><span className="text-sm text-[#6E6258]">3 free Word templates · no login required</span></div>
            <div className="grid gap-6 lg:grid-cols-3">{templates.map((template) => <TemplateCard key={template.slug} template={template} />)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"><div className="rounded-2xl bg-[#1C1814] px-7 py-10 text-[#F0EBE3] sm:px-12"><p className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>Less admin. Better client work.</p><p className="mt-4 max-w-xl text-base leading-7 text-[#D8CEC2]">Parlo brings scope, feedback, files, and invoices together in one shareable client link — no client login required.</p><a href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#C84A1A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#A83D15]">Try Parlo for free <ArrowRight className="h-4 w-4" /></a></div></section>
      </main>
      <footer className="border-t border-[#D8CEC2] px-5 py-8 sm:px-8"><div className="mx-auto max-w-6xl text-sm text-[#6E6258]">© Parlo · Free resources for better client work.</div></footer>
    </div>
  );
}
