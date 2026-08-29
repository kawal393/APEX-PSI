import { motion } from "framer-motion";
import { Shield, Server, Zap, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LatticeNode {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "degraded";
  timestamp?: string;
  isSelf?: boolean;
}

const ICONS: Record<string, typeof Shield> = {
  "apex-review": Zap,
  "apex-infrastructure": Server,
  "apex-psi": Shield,
};

const STATUS_COLORS: Record<string, string> = {
  online: "bg-[hsl(var(--compliant))]",
  offline: "bg-destructive",
  degraded: "bg-[hsl(var(--warning))]",
};

export default function LatticeNodeCard({ node, index, loading }: { node: LatticeNode; index: number; loading: boolean }) {
  const Icon = ICONS[node.id] || Activity;

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-20" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`p-6 relative overflow-hidden border-border/50 ${
        node.status === "online"
          ? "bg-card shadow-[0_0_30px_-10px_hsl(var(--compliant)/0.15)]"
          : "bg-card opacity-70"
      }`}>
        {/* Pulse indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[node.status]} ${
            node.status === "online" ? "animate-pulse" : ""
          }`} />
          <span className="text-xs uppercase font-mono text-muted-foreground">{node.status}</span>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            node.status === "online" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm tracking-wide">{node.name}</h3>
            <p className="text-xs text-muted-foreground">{node.role}</p>
          </div>
        </div>

        {node.isSelf && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary mb-3">
            THIS NODE
          </Badge>
        )}

        <div className="mt-2 pt-3 border-t border-border/30 flex justify-between items-center">
          <span className="text-[10px] font-mono text-muted-foreground">
            {node.id}
          </span>
          {node.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(node.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
