import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Leaf, ShieldCheck, BarChart3, Recycle, Sprout, ScrollText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BSHCES — Barangay Sambulawan Household Compliance" },
      { name: "description", content: "Digital household compliance evaluation system for Barangay Sambulawan: waste, sanitation, gardening, and ordinance monitoring." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">BSHCES</p>
              <p className="text-xs text-muted-foreground leading-tight">Barangay Sambulawan</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Official Barangay Compliance Platform
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Household Compliance,
            <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              Digitally Evaluated.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            BSHCES replaces paper checklists with a centralized portal for evaluating, monitoring,
            and analyzing waste segregation, sanitation, gardening, and ordinance compliance.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">BHW & Admin Login</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-4">
        {[
          { icon: Recycle, label: "Waste Segregation", desc: "Bins, composting, recycling, no burning." },
          { icon: ShieldCheck, label: "Sanitation", desc: "Toilets, drainage, wastewater." },
          { icon: Sprout, label: "Gardening", desc: "Vegetable gardens, organic practices." },
          { icon: ScrollText, label: "Ordinances", desc: "Regulations, clean-ups, no violations." },
        ].map((f) => (
          <div key={f.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <f.icon className="h-6 w-6 text-primary" />
            <p className="mt-3 font-semibold">{f.label}</p>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Barangay Sambulawan — BSHCES
      </footer>
    </div>
  );
}
