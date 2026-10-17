import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const curlExample = `curl -X POST \\
  ${BASE_URL}/notarize \\
  -H "Content-Type: application/json" \\
  -d '{
    "decision": "Model approved loan #4521",
    "model_id": "gpt-4-turbo",
    "context": {"risk": "low", "amount": 50000},
    "predicate": "EU_ART_12"
  }'`;

const pythonExample = `import requests

response = requests.post(
    "${BASE_URL}/notarize",
    json={
        "decision": "Model approved loan #4521",
        "model_id": "gpt-4-turbo",
        "context": {"risk": "low", "amount": 50000},
        "predicate": "EU_ART_12"
    }
)

receipt = response.json()
print(f"Receipt: {receipt['receipt_id']}")
print(f"Signature: {receipt['ed25519_signature'][:32]}...")`;

const nodeExample = `const response = await fetch(
  "${BASE_URL}/notarize",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Model approved loan #4521",
      model_id: "gpt-4-turbo",
      context: { risk: "low", amount: 50000 },
      predicate: "EU_ART_12"
    })
  }
);

const receipt = await response.json();
console.log("Receipt ID:", receipt.receipt_id);
console.log("Merkle Root:", receipt.merkle_root);`;

const goExample = `package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "net/http"
)

func main() {
  payload, _ := json.Marshal(map[string]interface{}{
    "decision":  "Model approved loan #4521",
    "model_id":  "gpt-4-turbo",
    "predicate": "EU_ART_12",
  })
  
  resp, _ := http.Post(
    "${BASE_URL}/notarize",
    "application/json",
    bytes.NewBuffer(payload),
  )
  
  var receipt map[string]interface{}
  json.NewDecoder(resp.Body).Decode(&receipt)
  fmt.Println("Receipt:", receipt["receipt_id"])
}`;

const NotaryDocs = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <Button size="icon" variant="ghost" aria-label={t("notary.copyExample", "Copy code example")} onClick={() => copy(text, id)} className="absolute top-3 right-3 h-8 w-8 bg-muted/50 hover:bg-muted">
      {copied === id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );

  return (
    <section className="px-4 py-16 sm:py-24 bg-card/30" id="docs">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            <span className="text-chrome-gradient">API</span>{" "}
            <span className="text-gold-gradient">Documentation</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Single endpoint. No SDK required. Works with any language that speaks HTTP.
          </p>
        </motion.div>

        {/* Endpoint spec */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/10 text-primary border-primary/20 font-mono">POST</Badge>
              <code className="text-sm font-mono text-foreground">/notarize</code>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Request Body</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-mono">Field</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-mono">Type</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-mono">Required</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { field: "decision", type: "string", required: "Yes", desc: "The AI decision to notarize (max 10,000 chars)" },
                      { field: "model_id", type: "string", required: "No", desc: "Identifier for the model that made the decision" },
                      { field: "context", type: "object", required: "No", desc: "Arbitrary context metadata for the decision" },
                      { field: "predicate", type: "string", required: "No", desc: "EU AI Act predicate (default: EU_ART_12)" },
                    ].map((row) => (
                      <tr key={row.field} className="border-b border-border/50">
                        <td className="py-2 px-3 font-mono text-primary text-xs">{row.field}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground text-xs">{row.type}</td>
                        <td className="py-2 px-3 text-xs">{row.required}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Headers</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><code className="text-primary">Content-Type: application/json</code> — Required</p>
                <p><code className="text-primary">x-apex-api-key: your-key</code> — Optional. For higher daily limits.</p>
                <p><code className="text-primary">Authorization: Bearer token</code> — Optional. Links receipt to user account.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code examples */}
        <Tabs defaultValue="curl" className="mb-8">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="curl" className="font-mono text-xs">cURL</TabsTrigger>
            <TabsTrigger value="python" className="font-mono text-xs">Python</TabsTrigger>
            <TabsTrigger value="node" className="font-mono text-xs">Node.js</TabsTrigger>
            <TabsTrigger value="go" className="font-mono text-xs">Go</TabsTrigger>
          </TabsList>

          {[
            { val: "curl", code: curlExample },
            { val: "python", code: pythonExample },
            { val: "node", code: nodeExample },
            { val: "go", code: goExample },
          ].map((tab) => (
            <TabsContent key={tab.val} value={tab.val} className="mt-4">
              <div className="relative rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
                  <Terminal className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{tab.val}</span>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground/80">
                  <code>{tab.code}</code>
                </pre>
                <CopyBtn text={tab.code} id={tab.val} />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Seed Your Ledger */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              <span className="text-gold-gradient">Seed Your Compliance Ledger</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Start building your audit trail immediately by notarizing real compliance events:
            </p>
            <ul className="space-y-2">
              {[
                "Notarize your AI risk assessment results",
                "Notarize your data protection impact assessment (DPIA)",
                "Notarize your model deployment decisions",
                "Notarize your human oversight review outcomes",
                "Notarize your patent filings and regulatory submissions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground/70 pt-2">
              {t("notary.portableEvidence", "Keep your receipts and public keys for independent verification. A Merkle root is not itself a confirmed Bitcoin anchor. Decision text and context submitted to this endpoint are stored; do not submit personal or confidential information.")}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default NotaryDocs;
