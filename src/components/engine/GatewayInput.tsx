import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PREDICATES } from "@/lib/gallows-engine";

interface GatewayInputProps {
  onExecute: (action: string, predicateId: string) => void;
  isProcessing: boolean;
}

const GatewayInput = ({ onExecute, isProcessing }: GatewayInputProps) => {
  const [action, setAction] = useState("");
  const [predicateId, setPredicateId] = useState("EU_ART_50");

  const handleExecute = () => {
    if (!action.trim()) return;
    onExecute(action.trim(), predicateId);
  };

  return (
    <Card className="bg-gallows-surface border-gallows-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest">
          Gateway Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-mono text-gallows-muted mb-1.5 block">AI ACTION</label>
          <Textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Generate a transparent AI summary with full source attribution and disclosure that this content is AI-generated"
            className="bg-gallows-bg border-gallows-border text-gallows-text font-mono text-sm min-h-[120px] placeholder:text-gallows-muted/50 focus-visible:ring-gallows-approved/50"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-gallows-muted mb-1.5 block">EU AI ACT PREDICATE</label>
          <Select value={predicateId} onValueChange={setPredicateId}>
            <SelectTrigger className="bg-gallows-bg border-gallows-border text-gallows-text font-mono text-sm focus:ring-gallows-approved/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gallows-surface border-gallows-border">
              {PREDICATES.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="font-mono text-sm text-gallows-text focus:bg-gallows-border focus:text-gallows-text"
                >
                  {p.id}: {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleExecute}
          disabled={isProcessing || !action.trim()}
          className="w-full bg-gallows-bg border border-gallows-blocked/60 text-gallows-blocked font-mono font-bold tracking-wider hover:bg-gallows-blocked/10 hover:shadow-gallows-blocked transition-all duration-200 disabled:opacity-40"
        >
          {isProcessing ? "PROCESSING..." : "EXECUTE VERIFICATION"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GatewayInput;
