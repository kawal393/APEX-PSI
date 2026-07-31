import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCheck, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Enter your email address" })
    .email({ message: "That does not look like a valid email address" })
    .max(255, { message: "Email must be under 255 characters" }),
  company: z.string().trim().max(160).optional(),
});

export type CaptureIntent =
  | "compliance_pack"
  | "exit_intent"
  | "sealed_artifact";

interface Props {
  intent?: CaptureIntent;
  variant?: "band" | "inline";
  title?: string;
  subtitle?: string;
  onDone?: () => void;
}

export default function LeadCaptureOffer({
  intent = "compliance_pack",
  variant = "band",
  title = "Get the EU AI Act Article 50 Compliance Pack",
  subtitle = "The full technical specification, the Article 50 clause-by-clause mapping, and a sealed sample receipt you can verify yourself. No sales call.",
  onDone,
}: Props) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, company });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSending(true);
    try {
      const attribution = getAttribution();
      const { error } = await supabase.functions.invoke("capture-lead", {
        body: {
          email: parsed.data.email,
          company: parsed.data.company || null,
          intent,
          source_page: window.location.pathname,
          visitor_id: localStorage.getItem("apex_visitor_id"),
          referrer: document.referrer || null,
          utm: attribution,
        },
      });
      if (error) throw error;
      setDone(true);
      toast.success("Sent — check your inbox for the pack.");
      onDone?.();
    } catch {
      toast.error("Could not send the pack. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
        <Check className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          Pack sent to <span className="font-semibold">{email}</span>. Everything in it is publicly
          verifiable — nothing is gated.
        </p>
      </div>
    );
  }

  const form = (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 w-full">
      <Input
        type="email"
        required
        maxLength={255}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@organisation.eu"
        aria-label="Email address"
        className="flex-1"
      />
      <Input
        type="text"
        maxLength={160}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Organisation (optional)"
        aria-label="Organisation"
        className="flex-1"
      />
      <Button type="submit" variant="hero" disabled={sending} className="shrink-0">
        {sending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 mr-1" />
        )}
        {sending ? "Sending…" : "Send the pack"}
      </Button>
    </form>
  );

  if (variant === "inline") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        {form}
        <p className="text-[11px] text-muted-foreground">
          One email with the pack. No tracking pixels, no third-party sharing.
        </p>
      </div>
    );
  }

  return (
    <section className="py-14 px-4 border-y border-border/60 bg-card/40">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-start gap-4 mb-5">
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
          </div>
        </div>
        {form}
        <p className="text-[11px] text-muted-foreground mt-3">
          One email with the pack. No tracking pixels, no third-party sharing. Everything linked in it
          is public.
        </p>
      </div>
    </section>
  );
}
