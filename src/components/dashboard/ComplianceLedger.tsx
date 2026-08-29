import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Verification {
  id: string;
  article_number: string;
  article_title: string;
  status: string;
  verified_at: string | null;
  merkle_proof_hash: string | null;
}

interface Props {
  verifications: Verification[];
}

const statusBadge: Record<string, string> = {
  verified: "bg-compliant text-background",
  pending: "bg-warning text-background",
  failed: "bg-destructive text-destructive-foreground",
};

const legalMathMap: Record<string, string> = {
  "Article 12": "Immutable event stream active. RFC 8785 Canonicalization applied.",
  "Article 14": "Protocol Intervention Layer (PIL) — 5s oversight pause enabled.",
  "Article 15": "Groth16-compatible ZK Integrity Proof generated for session.",
};

const ComplianceLedger = ({ verifications }: Props) => {
  const { toast } = useToast();

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Copied", description: "Merkle proof hash copied." });
  };

  const getTechMapping = (articleNumber: string) => {
    for (const [key, value] of Object.entries(legalMathMap)) {
      if (articleNumber.includes(key.replace("Article ", ""))) return value;
    }
    return null;
  };

  return (
    <Card className="border-glow bg-card/80 col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Compliance Ledger
          <span className="text-[10px] text-muted-foreground font-normal ml-auto">Legal-to-Math Mapping</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Verified</TableHead>
                <TableHead className="hidden md:table-cell">Merkle Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((v) => {
                const techDesc = getTechMapping(v.article_number);
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            <span className="font-medium">{v.article_number}</span>
                            <span className="text-xs text-muted-foreground ml-2">{v.article_title}</span>
                            {techDesc && (
                              <span className="block text-[10px] text-primary/70 font-mono mt-0.5">{techDesc}</span>
                            )}
                          </span>
                        </TooltipTrigger>
                        {techDesc && (
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs font-mono">{techDesc}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge[v.status] || statusBadge.pending}>
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {v.verified_at ? new Date(v.verified_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {v.merkle_proof_hash ? (
                        <button
                          onClick={() => copyHash(v.merkle_proof_hash!)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono"
                        >
                          {v.merkle_proof_hash.slice(0, 12)}…
                          <Copy className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default ComplianceLedger;
