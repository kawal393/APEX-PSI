import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, ShieldCheck } from "lucide-react";
import { ENGINE_LICENCE_KEY, ENGINE_LICENCE_TERMS, PSI_SCHEMA_ID } from "@/lib/psi-schema";

export interface LicenceAcceptance {
  tier: "personal" | "commercial";
  accepted_at: string;
  terms: string;
  schema: string;
}

export function readAcceptance(): LicenceAcceptance | null {
  try {
    const raw = localStorage.getItem(ENGINE_LICENCE_KEY);
    return raw ? (JSON.parse(raw) as LicenceAcceptance) : null;
  } catch {
    return null;
  }
}

/** Click-through licence gate. Nothing is sealed until the terms are accepted. */
export function useEngineLicence() {
  const [acceptance, setAcceptance] = useState<LicenceAcceptance | null>(null);

  useEffect(() => setAcceptance(readAcceptance()), []);

  const accept = useCallback((tier: "personal" | "commercial") => {
    const next: LicenceAcceptance = {
      tier,
      accepted_at: new Date().toISOString(),
      terms: ENGINE_LICENCE_TERMS,
      schema: PSI_SCHEMA_ID,
    };
    try {
      localStorage.setItem(ENGINE_LICENCE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — acceptance still applies for this session */
    }
    setAcceptance(next);
    return next;
  }, []);

  return { acceptance, accept, accepted: !!acceptance };
}

interface Props {
  onAccept: (tier: "personal" | "commercial") => void;
  className?: string;
}

const EngineLicenseGate = ({ onAccept, className }: Props) => (
  <Card className={`p-6 border-gold/30 bg-gold/5 ${className ?? ""}`}>
    <div className="flex items-start gap-3 mb-4">
      <Lock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-gold">
          Sealing Engine Licence
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Verification is MIT and free forever. Generating a seal uses the licensed{" "}
          <span className="text-foreground font-mono">{PSI_SCHEMA_ID}</span> engine.
        </p>
      </div>
    </div>

    <p className="text-xs leading-relaxed text-muted-foreground mb-4">{ENGINE_LICENCE_TERMS}</p>

    <div className="flex flex-col sm:flex-row gap-2">
      <Button size="sm" variant="hero" onClick={() => onAccept("personal")}>
        <ShieldCheck className="h-4 w-4 mr-1" /> Accept — personal / non-commercial
      </Button>
      <Button size="sm" variant="heroOutline" onClick={() => onAccept("commercial")}>
        Accept — commercial (PSI-05 royalty)
      </Button>
    </div>

    <p className="text-[11px] text-muted-foreground mt-3">
      Clicking accept records the terms and timestamp inside every seal you generate.{" "}
      <Link to="/license" className="text-gold hover:underline">
        Read the full dual licence
      </Link>
      .
    </p>
  </Card>
);

export default EngineLicenseGate;
