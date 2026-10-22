import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/barangay_sambulawan_logo.png.asset.json";
import bgAsset from "@/assets/barangay_sambulawan_hall.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — BSHCES" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      if (isRecovery && data.session) setReady(true);
      else setInvalid(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! You can now sign in with your new password.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
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
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <img src={logoAsset.url} alt="Barangay Sambulawan" className="h-20 w-20 rounded-full object-cover" />
            <h1 className="mt-4 text-2xl font-bold tracking-wide uppercase">Set New Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a new password for your BSHCES account.
            </p>
          </div>

          {invalid ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one from the sign-in page.
              </p>
              <Button className="mt-4 w-full" onClick={() => navigate({ to: "/auth", replace: true })}>
                Back to sign in
              </Button>
            </div>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
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
              <div>
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          ) : (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
