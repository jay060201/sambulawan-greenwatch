import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — BSHCES" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Verify approval status
        const { data: prof } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", data.user!.id)
          .maybeSingle();
        if (prof && prof.status !== "approved") {
          await supabase.auth.signOut();
          toast.error("Your account is still awaiting admin approval.");
          return;
        }
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, username },
          },
        });
        if (error) throw error;
        toast.success("Access request submitted. An administrator must approve your account before you can sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block" style={{ background: "var(--gradient-primary)" }}>
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6" />
            <span className="text-lg font-semibold">BSHCES</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold leading-tight">A greener, cleaner Sambulawan.</h2>
            <p className="mt-3 max-w-md text-primary-foreground/90">
              Track every household's compliance with sanitation, waste segregation, gardening, and barangay ordinances.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/80">© {new Date().getFullYear()} Barangay Sambulawan</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access your BSHCES dashboard."
              : "New accounts require admin approval before sign-in. The first account created becomes the system administrator."}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TabsContent value="signup" className="space-y-4 m-0">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" required={mode === "signup"} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" required={mode === "signup"} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="juandc" />
                </div>
              </TabsContent>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@barangay.gov" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}