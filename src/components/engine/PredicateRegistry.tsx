import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PREDICATES, hashSHA256 } from "@/lib/gallows-engine";
import { Lock, ScrollText } from "lucide-react";

const riskColors: Record<string, string> = {
  UNACCEPTABLE: 'bg-gallows-blocked/15 text-gallows-blocked border-gallows-blocked/30',
  HIGH: 'bg-amber-500/15 text-amber-400 border-amber-400/30',
  LIMITED: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  MINIMAL: 'bg-gallows-approved/15 text-gallows-approved border-gallows-approved/30',
};

const PredicateRegistry = () => {
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    const computeHashes = async () => {
      const result: Record<string, string> = {};
      for (const p of PREDICATES) {
        result[p.id] = await hashSHA256(
          `${p.id}|${p.article}|${p.description}|${p.violationPatterns.join(',')}|${p.riskLevel}|${p.enforcementDate}`
        );
      }
      setHashes(result);
    };
    computeHashes();
  }, []);

  return (
    <Card className="bg-gallows-surface border-gallows-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest flex items-center gap-2">
          <ScrollText className="h-4 w-4" />
          Predicate Registry ({PREDICATES.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {PREDICATES.map((p) => (
          <div key={p.id} className="border border-gallows-border rounded p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gallows-approved font-bold">{p.id}</span>
              <div className="flex items-center gap-1.5">
                <Badge className={`font-mono text-[10px] border ${riskColors[p.riskLevel] || riskColors.MINIMAL} px-1.5 py-0`}>
                  {p.riskLevel}
                </Badge>
                <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-[10px] gap-0.5 px-1.5 py-0">
                  <Lock className="h-2 w-2" />
                  LOCKED
                </Badge>
              </div>
            </div>
            <p className="font-mono text-[11px] text-gallows-text">{p.article}: {p.name}</p>
            <p className="font-mono text-[10px] text-gallows-muted break-all">
              {hashes[p.id] ? `sha256:${hashes[p.id].substring(0, 24)}…` : 'computing…'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PredicateRegistry;
