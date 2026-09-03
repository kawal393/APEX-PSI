import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EngineResult } from "@/lib/engine-core";

interface VerificationResultProps {
  result: EngineResult | null;
}

const VerificationResult = ({ result }: VerificationResultProps) => {
  if (!result) {
    return (
      <Card className="bg-engine-surface border-engine-border flex items-center justify-center min-h-[280px]">
        <p className="text-engine-muted font-mono text-sm">AWAITING INPUT...</p>
      </Card>
    );
  }

  const isApproved = result.status === 'APPROVED';

  return (
    <Card className={`bg-engine-surface border min-h-[280px] ${isApproved ? 'border-engine-approved/30' : 'border-engine-blocked/30'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-engine-muted uppercase tracking-widest">
          Verification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Badge
            className={`text-lg px-6 py-2 font-mono font-bold tracking-wider border-0 ${
              isApproved
                ? 'bg-engine-approved/15 text-engine-approved shadow-engine-approved'
                : 'bg-engine-blocked/15 text-engine-blocked shadow-engine-blocked'
            }`}
          >
            {isApproved ? '✓ APPROVED AND VERIFIED' : '✗ STRUCTURALLY BLOCKED'}
          </Badge>
        </div>

        <div className="space-y-3 text-sm font-mono">
          <div>
            <span className="text-engine-muted">Verification Time: </span>
            <span className="text-engine-text">{result.verificationTimeMs}ms</span>
          </div>

          <div>
            <span className="text-engine-muted">SHA-256 Audit Hash:</span>
            <p className="text-engine-text text-xs break-all mt-1 bg-engine-bg p-2 rounded border border-engine-border">
              {result.auditHash}
            </p>
          </div>


          <div className={`p-3 rounded border ${isApproved ? 'border-engine-approved/20 bg-engine-approved/5' : 'border-engine-blocked/20 bg-engine-blocked/5'}`}>
            <p className={`text-xs ${isApproved ? 'text-engine-approved' : 'text-engine-blocked'}`}>
              {isApproved
                ? `Output mathematically verified against EU AI Act Predicate [${result.predicateId}]`
                : `Semantic Gap Failure: Action violates locked legal predicate [${result.predicateId}] — pattern matched: "${result.violationFound}"`
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationResult;
