import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  companyName: string;
  score: number;
  status: string;
  date: string;
  merkleHash?: string | null;
}

const statusLabels: Record<string, string> = {
  compliant: "COMPLIANT",
  mostly_compliant: "MOSTLY COMPLIANT",
  partially_compliant: "PARTIALLY COMPLIANT",
  non_compliant: "NON-COMPLIANT",
};

const statusColors: Record<string, string> = {
  compliant: "bg-compliant text-background",
  mostly_compliant: "bg-warning text-background",
  partially_compliant: "bg-orange-500 text-background",
  non_compliant: "bg-destructive text-destructive-foreground",
};

const ComplianceCertificate = ({ companyName, score, status, date, merkleHash }: Props) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTxt = () => {
    const certContent = `
═══════════════════════════════════════════════════════
              APEX PSI
         EU AI ACT ARTICLE 50 TRANSPARENCY RECORD
═══════════════════════════════════════════════════════

Company:        ${companyName || "N/A"}
Score:          ${score}%
Status:         ${statusLabels[status] || "N/A"}
Assessment Date: ${new Date(date).toLocaleDateString()}
${merkleHash ? `Merkle Hash:    ${merkleHash}` : ""}

This certificate confirms that the above company has
undergone an EU AI Act compliance assessment via the
APEX PSI verification platform.

Deadline: August 2, 2026

═══════════════════════════════════════════════════════
         Issued by APEX Infrastructure Pty Ltd
         ABN: [Registration Number]
         Melbourne, Australia
═══════════════════════════════════════════════════════
`.trim();

    const blob = new Blob([certContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `APEX-Certificate-${companyName || "company"}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificate-pdf");
      if (error) throw error;
      // data is HTML string, open in new window for print/save
      const blob = new Blob([data], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.onload = () => {
          URL.revokeObjectURL(url);
        };
      }
      toast.success("Certificate opened — use Print > Save as PDF");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate certificate");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-glow bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Compliance Record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{companyName || "Your Company"}</p>
            <p className="text-xs text-muted-foreground">Assessed: {new Date(date).toLocaleDateString()}</p>
          </div>
          <Badge className={statusColors[status] || statusColors.non_compliant}>
            {statusLabels[status] || "N/A"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="heroOutline" size="sm" className="flex-1" onClick={handleDownloadTxt}>
            <Download className="h-4 w-4 mr-1" /> TXT
          </Button>
          <Button variant="hero" size="sm" className="flex-1" onClick={handleDownloadPdf} disabled={downloading}>
            <FileText className="h-4 w-4 mr-1" /> {downloading ? "Generating…" : "PDF Certificate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceCertificate;
