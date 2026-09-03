import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommitRecord } from "@/lib/engine-core";
import { FileText, AlertTriangle } from "lucide-react";

interface AuditTrailLogProps {
  entries: CommitRecord[];
}

const phaseStyle: Record<string, string> = {
  COMMITTED: 'bg-amber-400/15 text-amber-400',
  CHALLENGED: 'bg-engine-blocked/15 text-engine-blocked',
  VERIFIED: 'bg-engine-approved/15 text-engine-approved',
  PAUSED: 'bg-engine-blocked/15 text-engine-blocked',
};

const AuditTrailLog = ({ entries }: AuditTrailLogProps) => {
  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      engine: 'APEX PSI Protocol v1.0',
      algorithm: 'SHA-256',
      canonicalization: 'RFC-8785-JCS',
      signatures: 'Ed25519',
      merkleOrdering: 'canonical',
      totalEntries: entries.length,
      entries: entries.map(e => ({
        id: e.id,
        action: e.action,
        predicateId: e.predicateId,
        phase: e.phase,
        status: e.status,
        sequenceNumber: e.sequenceNumber,
        commitHash: e.commitHash,
        merkleLeafHash: e.merkleLeafHash,
        challengeHash: e.challengeHash,
        proofHash: e.proofHash,
        merkleRoot: e.merkleRoot,
        merkleProof: e.merkleProof,
        ed25519Signature: e.ed25519Signature,
        timestamp: e.timestamp,
        challengedAt: e.challengedAt,
        provenAt: e.provenAt,
        verificationTimeMs: e.verificationTimeMs,
        violationFound: e.violationFound,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-psi-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detect sequence gaps (entries are newest-first, so reverse for gap detection)
  const detectGaps = (): Set<number> => {
    const gaps = new Set<number>();
    const sorted = [...entries].filter(e => e.sequenceNumber != null).sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].sequenceNumber || 0;
      const curr = sorted[i].sequenceNumber || 0;
      if (curr - prev > 1) {
        gaps.add(curr);
      }
    }
    return gaps;
  };

  const sequenceGaps = detectGaps();

  return (
    <Card className="bg-engine-surface border-engine-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-engine-muted uppercase tracking-widest">
            Immutable Audit Trail ({entries.length} entries)
          </CardTitle>
          <div className="flex items-center gap-2">
            {sequenceGaps.size > 0 && (
              <Badge className="bg-engine-blocked/15 text-engine-blocked border-0 font-mono text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {sequenceGaps.size} SEQUENCE BREAK{sequenceGaps.size > 1 ? 'S' : ''}
              </Badge>
            )}
            {entries.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs font-mono text-engine-muted hover:text-engine-approved transition-colors bg-transparent border border-engine-border rounded px-2 py-1 cursor-pointer"
              >
                <FileText className="h-3 w-3" />
                EXPORT JSON
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-engine-muted font-mono text-sm text-center py-6">
            No entries yet. Commit an action to begin building the immutable ledger.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-engine-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs text-engine-muted">Seq #</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Commit ID</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Timestamp</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Action</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Predicate</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Phase</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Status</TableHead>
                  <TableHead className="font-mono text-xs text-engine-muted">Commit Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const hasGap = sequenceGaps.has(entry.sequenceNumber || 0);
                  return (
                    <Fragment key={entry.id}>
                      {hasGap && (
                        <TableRow key={`gap-${entry.id}`} className="border-engine-blocked/30">
                          <TableCell colSpan={8} className="py-1 px-3">
                            <div className="flex items-center gap-2 text-engine-blocked font-mono text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              SEQUENCE BREAK DETECTED — Missing entries between seq #{(entry.sequenceNumber || 0) - 1} and #{entry.sequenceNumber}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className={`border-engine-border hover:bg-engine-bg/50 ${hasGap ? 'bg-engine-blocked/5' : ''}`}>
                        <TableCell className="font-mono text-xs text-engine-muted whitespace-nowrap">
                          {entry.sequenceNumber != null ? `#${entry.sequenceNumber}` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-engine-approved whitespace-nowrap font-bold">
                          {entry.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-engine-text whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-engine-text max-w-[180px] truncate">
                          {entry.action}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-engine-muted whitespace-nowrap">
                          {entry.predicateId}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-mono text-xs border-0 ${phaseStyle[entry.phase] || phaseStyle.COMMITTED}`}>
                            {entry.phase}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.status ? (
                            <Badge className={`font-mono text-xs border-0 ${
                              entry.status === 'APPROVED'
                                ? 'bg-engine-approved/15 text-engine-approved'
                                : 'bg-engine-blocked/15 text-engine-blocked'
                            }`}>
                              {entry.status}
                            </Badge>
                          ) : (
                            <span className="text-xs font-mono text-engine-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-engine-muted max-w-[140px] truncate" title={entry.commitHash}>
                          {entry.commitHash.substring(0, 20)}…
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditTrailLog;
