import { Card } from "@/components/ui/card";
import { Megaphone, Users, Mail, Target } from "lucide-react";

interface Campaign {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  views: number;
  visitors: number;
  leads: number;
  conversion_rate: number;
  top_landing: string;
}

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  intent: string | null;
  score: number | null;
  status: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  source_page: string | null;
  created_at: string;
}

interface Props {
  campaigns: Campaign[];
  leads: Lead[];
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) => (
  <Card className="p-4 bg-card/60 border-border">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </Card>
);

export default function CampaignPanel({ campaigns, leads }: Props) {
  const totalVisitors = campaigns.reduce((s, c) => s + c.visitors, 0);
  const totalLeads = leads.length;
  const highIntent = leads.filter((l) => (l.score ?? 0) >= 60).length;
  const rate = totalVisitors > 0 ? ((totalLeads / totalVisitors) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Attributed visitors (30d)" value={totalVisitors} />
        <Stat icon={Mail} label="Leads captured" value={totalLeads} />
        <Stat icon={Target} label="High-intent leads" value={highIntent} />
        <Stat icon={Megaphone} label="Visitor → lead" value={`${rate}%`} />
      </div>

      <Card className="p-5 bg-card/60 border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Campaign performance (last 30 days)</h3>
        {campaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No attributed traffic yet. Append UTM parameters to your ad links, e.g.{" "}
            <code className="text-primary">?utm_source=youtube&amp;utm_medium=paid&amp;utm_campaign=eu_ai_act</code>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Medium</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Ad / content</th>
                  <th className="py-2 pr-3 text-right">Views</th>
                  <th className="py-2 pr-3 text-right">Visitors</th>
                  <th className="py-2 pr-3 text-right">Leads</th>
                  <th className="py-2 pr-3 text-right">CVR</th>
                  <th className="py-2">Top landing</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-semibold text-foreground">{c.source}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.medium}</td>
                    <td className="py-2 pr-3">{c.campaign}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.content}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.views}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.visitors}</td>
                    <td className="py-2 pr-3 text-right font-mono text-primary">{c.leads}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.conversion_rate}%</td>
                    <td className="py-2 font-mono text-muted-foreground">{c.top_landing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 bg-card/60 border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Recent leads</h3>
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground">No leads captured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Organisation</th>
                  <th className="py-2 pr-3">Intent</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Page</th>
                  <th className="py-2 pr-3 text-right">Score</th>
                  <th className="py-2">Captured</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 50).map((l) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-mono text-foreground">{l.email}</td>
                    <td className="py-2 pr-3">{l.company || "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{l.intent || "—"}</td>
                    <td className="py-2 pr-3">{l.utm_source || "direct"}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground">{l.source_page || "—"}</td>
                    <td
                      className={`py-2 pr-3 text-right font-mono ${
                        (l.score ?? 0) >= 60 ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {l.score ?? 0}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
