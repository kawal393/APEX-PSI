import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, Shield, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  tier: string;
  daily_limit: number;
  daily_used: number;
  last_reset: string;
  created_at: string;
  api_key_hash: string;
}

async function hashSHA256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `apex_ntry_${hex}`;
}

const TIER_CONFIG: Record<string, { label: string; color: string; limit: number }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground", limit: 100 },
  pro: { label: "Pro", color: "bg-primary/10 text-primary border-primary/20", limit: 10000 },
  enterprise: { label: "Enterprise", color: "bg-gold/10 text-gold border-gold/20", limit: -1 },
};

const NotaryApiKeys = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Production");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notary_api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setKeys(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, [user]);

  const handleCreateKey = async () => {
    if (!user || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const rawKey = generateApiKey();
      const keyHash = await hashSHA256(rawKey);

      const { error } = await supabase.from("notary_api_keys").insert({
        user_id: user.id,
        api_key_hash: keyHash,
        name: newKeyName.trim(),
        tier: "free",
        daily_limit: 100,
      });

      if (error) throw error;

      setShowNewKey(rawKey);
      setShowForm(false);
      setNewKeyName("Production");
      toast.success("API key created — copy it now, it won't be shown again");
      await fetchKeys();
    } catch (e: any) {
      toast.error(e.message || "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase.from("notary_api_keys").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete key");
      return;
    }
    toast.success("API key revoked");
    setKeys(keys.filter(k => k.id !== id));
  };

  const handleCopyKey = () => {
    if (!showNewKey) return;
    navigator.clipboard.writeText(showNewKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API key copied to clipboard");
  };

  const usagePercent = (used: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  return (
    <div className="space-y-6">
      {/* New Key Alert */}
      {showNewKey && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Your new API key — copy it now</p>
                  <p className="text-xs text-muted-foreground">This key will not be displayed again. Store it securely.</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono text-foreground break-all select-all">
                    {showNewKey}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowNewKey(null)} className="text-xs text-muted-foreground">
                  I've saved it — dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Start */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">
{`curl -X POST \\
  https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "qhtntebpcribjiwrdtdd"}.supabase.co/functions/v1/notarize \\
  -H "Content-Type: application/json" \\
  -H "x-apex-api-key: YOUR_API_KEY" \\
  -d '{"decision": "Model approved loan #4521", "predicate": "EU_ART_12"}'`}
          </pre>
        </CardContent>
      </Card>

      {/* Keys List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> API Keys
            </CardTitle>
            <Button variant="hero" size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Form */}
          {showForm && (
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Production, Staging)"
                className="flex-1 text-sm"
              />
              <Button variant="hero" size="sm" onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground">Generate a key to authenticate your NOTARY API calls and increase your daily limit.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => {
                const tierCfg = TIER_CONFIG[key.tier] || TIER_CONFIG.free;
                const isUnlimited = key.daily_limit <= 0;
                return (
                  <div key={key.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/20 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{key.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${tierCfg.color}`}>{tierCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">****{key.api_key_hash.slice(-8)}</span>
                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      </div>
                      {/* Usage bar */}
                      {!isUnlimited && (
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                key.daily_used >= key.daily_limit ? "bg-destructive" : "bg-primary"
                              }`}
                              style={{ width: `${usagePercent(key.daily_used, key.daily_limit)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {key.daily_used}/{key.daily_limit} today
                          </span>
                        </div>
                      )}
                      {isUnlimited && (
                        <span className="text-[10px] text-primary font-mono">No daily cap set</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotaryApiKeys;
