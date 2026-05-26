import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, Trash2, Plus, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface SyncKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  tier: string;
  daily_limit: number;
  daily_used: number;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
}

const ALL_SCOPES = [
  { id: "notarize:write", label: "Notarize (write)" },
  { id: "verify:read", label: "Verify (read)" },
] as const;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateSyncKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `apex_sk_${hex}`;
}

const SyncApiKeys = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<SyncKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("Production sync");
  const [scopes, setScopes] = useState<string[]>(["notarize:write", "verify:read"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("apex_api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setKeys(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, [user]);

  const create = async () => {
    if (!user || !name.trim() || scopes.length === 0) {
      toast.error("Name and at least one scope required");
      return;
    }
    const raw = generateSyncKey();
    const hash = await sha256Hex(raw);
    const { error } = await (supabase as any).from("apex_api_keys").insert({
      user_id: user.id,
      name: name.trim(),
      prefix: raw.slice(0, 14),
      key_hash: hash,
      scopes,
      tier: "free",
      daily_limit: 1000,
    });
    if (error) { toast.error(error.message); return; }
    setNewKey(raw);
    setShowForm(false);
    fetchKeys();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Apps using it will lose access immediately.")) return;
    await (supabase as any).from("apex_api_keys").update({ revoked: true }).eq("id", id);
    toast.success("Key revoked");
    fetchKeys();
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copied");
  };

  if (loading) return <div className="text-muted-foreground text-sm">Loading sync keys…</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Sync API keys
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Scoped <code>apex_sk_*</code> keys for the unified <code>/v1</code> API. Use these to connect external apps.
          </p>
        </div>
        {!showForm && !newKey && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New key
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <div className="border border-primary/30 bg-primary/5 rounded p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" /> Copy your key now — it will not be shown again
            </div>
            <div className="flex items-center gap-2 bg-background border rounded px-2 py-1">
              <code className="text-xs break-all flex-1">{newKey}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(newKey)}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setNewKey(null)}>Done</Button>
          </div>
        )}

        {showForm && (
          <div className="border rounded p-4 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Scopes</div>
              {ALL_SCOPES.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={scopes.includes(s.id)}
                    onCheckedChange={(c) =>
                      setScopes(c ? [...scopes, s.id] : scopes.filter(x => x !== s.id))
                    }
                  />
                  <code>{s.id}</code> — {s.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={create}>Generate key</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {keys.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No sync keys yet. Generate one to connect an external app.</p>
        )}

        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{k.name}</span>
                  {k.revoked && <Badge variant="destructive">revoked</Badge>}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  <code>{k.prefix}…</code>
                  <span>{k.daily_used}/{k.daily_limit === -1 ? "∞" : k.daily_limit} today</span>
                  <span>{k.scopes.join(", ")}</span>
                </div>
              </div>
              {!k.revoked && (
                <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncApiKeys;
