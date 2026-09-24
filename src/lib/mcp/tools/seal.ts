import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "seal",
  title: "Seal a decision to the APEX PSI ledger",
  description:
    "Mint a post-quantum verifiable receipt for a machine action or decision. Canonicalises the payload, signs it (SHA-256 + Ed25519 + LMS-W4-SHA256), records it in the append-only ledger, and returns a receipt id that any agent can later re-check with verify_hash. This is the write half of the trust handshake.",
  inputSchema: {
    decision: z
      .string()
      .trim()
      .min(1)
      .max(10000)
      .describe("The action or decision text to seal — what the machine did."),
    model_id: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe("Optional identifier of the model or agent that produced the decision."),
    context: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .describe("Optional description of the decision environment."),
    predicate: z
      .string()
      .trim()
      .max(100)
      .optional()
      .describe("Optional predicate id, e.g. EU_ART_50. Defaults to EU_ART_12."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ decision, model_id, context, predicate }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("notarize", {
      body: { decision, model_id, context, predicate },
    });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const receipt = data as Record<string, unknown> | null;
    if (!receipt || typeof receipt.receipt_id !== "string") {
      return {
        content: [{ type: "text", text: JSON.stringify(receipt ?? {}, null, 2) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(receipt, null, 2) }],
      structuredContent: { sealed: true, receipt },
    };
  },
});
