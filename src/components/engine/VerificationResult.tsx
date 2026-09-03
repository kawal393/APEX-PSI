import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GallowsResult } from "@/lib/gallows-engine";

interface VerificationResultProps {
  result: GallowsResult | null;
}

const VerificationResult = ({ result }: VerificationResultProps) => {
  if (!result) {
    return (
      <Card className="bg-gallows-surface border-gallows-border flex items-center justify-center min-h-[280px]">
        <p className="text-gallows-muted font-mono text-sm">AWAITING INPUT...</p>
      </Card>
    );
  }

  const isApproved = result.status === 'APPROVED';

  return (
    <Card className={`bg-gallows-surface border min-h-[280px] ${isApproved ? 'border-gallows-approved/30' : 'border-gallows-blocked/30'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest">
          Verification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Badge
            className={`text-lg px-6 py-2 font-mono font-bold tracking-wider border-0 ${
              isApproved
                ? 'bg-gallows-approved/15 text-gallows-approved shadow-gallows-approved'
                : 'bg-gallows-blocked/15 text-gallows-blocked shadow-gallows-blocked'
            }`}
          >
            {isApproved ? '✓ APPROVED AND VERIFIED' : '✗ STRUCTURALLY BLOCKED'}
          </Badge>
        </div>

        <div className="space-y-3 text-sm font-mono">
          <div>
            <span className="text-gallows-muted">Verification Time: </span>
            <span className="text-gallows-text">{result.verificationTimeMs}ms</span>
          </div>

          <div>
            <span className="text-gallows-muted">SHA-256 Audit Hash:</span>
            <p className="text-gallows-text text-xs break-all mt-1 bg-gallows-bg p-2 rounded border border-gallows-border">
              {result.auditHash}
            </p>
          </div>


          <div className={`p-3 rounded border ${isApproved ? 'border-gallows-approved/20 bg-gallows-approved/5' : 'border-gallows-blocked/20 bg-gallows-blocked/5'}`}>
            <p className={`text-xs ${isApproved ? 'text-gallows-approved' : 'text-gallows-blocked'}`}>
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
