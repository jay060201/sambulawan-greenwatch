import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (role !== "admin" && profile && profile.status !== "active") {
    const suspended = profile.status === "suspended";
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">
            {suspended ? "Access suspended" : "Awaiting Admin approval"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {suspended
              ? "Your access to BSHCES has been suspended. Please contact the barangay administrator."
              : `Your ${role === "bhw" ? "BHW" : "Viewer"} account has been created. An administrator must approve your access before you can view the system's records.`}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}