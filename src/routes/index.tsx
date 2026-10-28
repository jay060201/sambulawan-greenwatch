import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/barangay_sambulawan_logo.png";
import hallBg from "@/assets/barangay_sambulawan_hall.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BSHCES — Barangay Sambulawan Household Compliance" },
      { name: "description", content: "Official household compliance evaluation system of Barangay Sambulawan." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <img src={hallBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/45" />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <img
          src={logo}
          alt="Barangay Sambulawan logo"
          className="h-28 w-28 rounded-full border border-border object-cover shadow-[var(--shadow-card)]"
        />
        <div>
          <h1 className="max-w-md text-2xl font-bold leading-snug tracking-tight sm:text-3xl sm:leading-snug">
            Barangay Sambulawan Household Compliance Evaluation System
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Barangay Sambulawan</p>
        </div>
        <Button asChild size="lg">
          <Link to="/auth">Sign in</Link>
        </Button>
      </main>
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Barangay Sambulawan
      </footer>
    </div>
  );
}
