import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const defaultPayload = JSON.stringify({
  decision: "Model approved loan application #4521 based on credit score 742",
  model_id: "gpt-4-turbo",
  context: { applicant_risk: "low", amount: 50000 },
  predicate: "EU_ART_12"
}, null, 2);

interface Receipt {
  receipt_id: string;
  timestamp: string;
  decision_hash: string;
  merkle_leaf: string;
  merkle_root: string;
  ed25519_signature: string;
  predicate_applied: string;
  receipt_version: string;
}

const NotaryDemo = () => {
  const [payload, setPayload] = useState(defaultPayload);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleNotarize = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(payload);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "qhtntebpcribjiwrdtdd";
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/notarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (data.receipt_id) {
        setReceipt(data);
        toast.success("Decision notarized — receipt generated");
      } else {
        toast.error(data.error || "Notarization failed");
      }
    } catch {
      toast.error("Invalid JSON payload");
    } finally {
      setLoading(false);
    }
  };

  const copyReceipt = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Receipt copied");
  };

  return (
    <section className="px-4 py-16 sm:py-24" id="demo">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            <span className="text-chrome-gradient">Live Demo</span>{" "}
            <span className="text-gold-gradient">— Try It Now</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Paste any AI decision payload. Get a real, cryptographically signed receipt in under 200ms.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Input Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="font-mono text-xs min-h-[260px] bg-muted/30 border-border"
              />
              <Button onClick={handleNotarize} disabled={loading} className="w-full" variant="hero" size="lg">
                {loading ? "NOTARIZING..." : <>NOTARIZE <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card className={`bg-card border ${receipt ? "border-primary/30" : "border-border"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                  Signed Receipt
                </CardTitle>
                {receipt && (
                  <button onClick={copyReceipt} className="p-1.5 rounded hover:bg-muted transition-colors">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {receipt ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-primary/10 text-primary border-primary/20">NOTARIZED</Badge>
                    <Badge variant="outline" className="text-[10px]">{receipt.receipt_version}</Badge>
                  </div>
                  {[
                    { label: "Receipt ID", value: receipt.receipt_id },
                    { label: "Timestamp", value: receipt.timestamp },
                    { label: "Decision Hash", value: receipt.decision_hash },
                    { label: "Merkle Leaf", value: receipt.merkle_leaf },
                    { label: "Merkle Root", value: receipt.merkle_root },
                    { label: "Ed25519 Sig", value: receipt.ed25519_signature?.slice(0, 48) + "..." },
                    { label: "Predicate", value: receipt.predicate_applied },
                  ].map((row) => (
                    <div key={row.label}>
                      <span className="text-muted-foreground">{row.label}: </span>
                      <span className="text-foreground break-all">{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[260px]">
                  <p className="text-muted-foreground text-sm">Submit a payload to generate a receipt...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default NotaryDemo;
