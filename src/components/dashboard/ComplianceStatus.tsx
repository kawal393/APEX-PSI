import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Shield } from "lucide-react";

interface Props {
  score: number;
  status: string;
}

const statusColors: Record<string, string> = {
  compliant: "bg-compliant text-background",
  partially_compliant: "bg-warning text-background",
  non_compliant: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  compliant: "Compliant",
  partially_compliant: "Partially Compliant",
  non_compliant: "Non-Compliant",
};

const ComplianceStatus = ({ score, status }: Props) => {
  const inForce = new Date("2026-08-02T00:00:00Z");
  const now = new Date();
  const daysInForce = Math.max(0, Math.floor((now.getTime() - inForce.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Card className="border-glow bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-gold-gradient">{score}%</p>
            <Badge className={`mt-1 ${statusColors[status] || statusColors.non_compliant}`}>
              {statusLabels[status] || "Non-Compliant"}
            </Badge>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              In force since Aug 2, 2026
            </div>
            <p className="text-2xl font-bold text-foreground">{daysInForce}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days In Force</p>
          </div>
        </div>
        <Progress value={score} className="h-2" />
      </CardContent>
    </Card>
  );
};

export default ComplianceStatus;
