import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes a user account entirely. Only callable by an Admin: the caller's
// role is re-verified server-side through has_role before any privileged
// operation runs, and the service-role client is loaded only inside the
// handler so it never enters the browser bundle.
export const deleteUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as { supabase: any; userId: string };
    const { supabase, userId: callerId } = ctx;

    if (data.userId === callerId) {
      throw new Error("You cannot delete your own account.");
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify your role. Try again.");
    if (!isAdmin) throw new Error("Only Admins can delete user accounts.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Detach evaluations the user conducted so the account delete is not
    // blocked by foreign keys, then remove their profile and role rows.
    await supabaseAdmin
      .from("evaluations")
      .update({ evaluator_id: null })
      .eq("evaluator_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
