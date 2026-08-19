import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "ledger_stats",
  title: "APEX PSI ledger statistics",
  description:
    "Return counts of ledger attestations, non-approved exceptions and public attestations for a quick integrity snapshot.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [total, exceptions, publicAttestations, latest] = await Promise.all([
      supabase.from("gallows_public_ledger").select("id", { count: "exact", head: true }),
      supabase
        .from("gallows_public_ledger")
        .select("id", { count: "exact", head: true })
        .neq("status", "APPROVED"),
      supabase.from("public_attestations").select("id", { count: "exact", head: true }),
      supabase
        .from("gallows_public_ledger")
        .select("commit_id,created_at,merkle_root")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError = total.error ?? exceptions.error ?? publicAttestations.error ?? latest.error;
    if (firstError) {
      return { content: [{ type: "text", text: firstError.message }], isError: true };
    }

    const stats = {
      attestations_visible: total.count ?? 0,
      exceptions: exceptions.count ?? 0,
      public_attestations: publicAttestations.count ?? 0,
      latest_commit: latest.data ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
