import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/barangay_sambulawan_logo.png.asset.json";
import bgAsset from "@/assets/barangay_sambulawan_hall.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — BSHCES" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [signupRole, setSignupRole] = useState<"bhw" | "viewer">("bhw");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && pathname === "/auth") navigate({ to: "/dashboard", replace: true });
  }, [session, navigate, pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Please check your email inbox.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, username, role: signupRole },
          },
        });
        if (error) throw error;
        toast.success("Account created! An administrator must approve your access before you can view records.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <img
        src={bgAsset.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg"
      />

      <div className="absolute inset-0 bg-background/20" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            aria-label="Close"
            className="absolute right-4 top-4 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>

          {mode === "forgot" ? (
            <div>
              <div className="flex flex-col items-center text-center">
                <img src={logoAsset.url} alt="Barangay Sambulawan" className="h-20 w-20 rounded-full object-cover" />
                <h1 className="mt-4 text-2xl font-bold tracking-wide uppercase">Reset Password</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@barangay.gov"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex flex-col items-center text-center">
                <img src={logoAsset.url} alt="Barangay Sambulawan" className="h-20 w-20 rounded-full object-cover" />
                <h1 className="mt-4 text-2xl font-bold tracking-wide uppercase">
                  {mode === "signin" ? "Sign In" : "Sign Up"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Barangay Sambulawan household compliance system
                </p>
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-6">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1">
                  <TabsTrigger
                    value="signin"
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <TabsContent value="signup" className="m-0 space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        className="mt-1"
                        required={mode === "signup"}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        className="mt-1"
                        required={mode === "signup"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="juandc"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={signupRole} onValueChange={(v) => setSignupRole(v as "bhw" | "viewer")}>
                        <SelectTrigger id="role" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                          <SelectItem value="viewer">Barangay Official (Viewer)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        BHW and Viewer accounts require Admin approval before the system can be accessed.
                      </p>
                    </div>
                  </TabsContent>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-1"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@barangay.gov"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>

                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}

                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "signin" ? (
                      "Sign in"
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </Tabs>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="mx-auto mt-4 block text-sm font-medium text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Official Barangay Sambulawan system
          </div>
        </div>
      </div>
    </div>
  );
}
