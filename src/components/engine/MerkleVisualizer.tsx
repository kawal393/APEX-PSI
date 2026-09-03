import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MerkleTreeState } from "@/lib/gallows-engine";
import { GitBranch, Layers, TreeDeciduous } from "lucide-react";
import { motion } from "framer-motion";

interface MerkleVisualizerProps {
  treeState: (MerkleTreeState & { layers: string[][] }) | null;
}

const MerkleVisualizer = ({ treeState }: MerkleVisualizerProps) => {
  if (!treeState || treeState.leaves.length === 0) {
    return (
      <Card className="bg-gallows-surface border-gallows-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4" />
            Merkle Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gallows-border flex items-center justify-center">
              <GitBranch className="h-8 w-8 text-gallows-muted/50" />
            </div>
            <p className="text-gallows-muted font-mono text-sm text-center">
              Tree empty — commit actions to build the hash tree
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reversedLayers = [...treeState.layers].reverse();

  return (
    <Card className="bg-gallows-surface border-gallows-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4 text-gallows-approved" />
            Merkle Tree — Live State
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-xs gap-1">
              <Layers className="h-3 w-3" />
              {treeState.depth} layers
            </Badge>
            <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-xs">
              {treeState.leaves.length} leaves
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Merkle Root Highlight */}
        <motion.div 
          className="mb-4 p-3 rounded border border-amber-400/30 bg-amber-400/5 relative overflow-hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-transparent to-amber-400/5 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <span className="text-[10px] font-mono text-amber-400 block mb-1 relative">MERKLE ROOT — CRYPTOGRAPHIC ANCHOR</span>
          <span className="font-mono text-xs text-amber-400 break-all font-bold relative">
            {treeState.root}
          </span>
        </motion.div>

        {/* Tree Visualization */}
        <div className="space-y-3 overflow-x-auto max-h-[300px] overflow-y-auto">
          {reversedLayers.map((layer, layerIdx) => {
            const isRoot = layerIdx === 0;
            const isLeaf = layerIdx === reversedLayers.length - 1;
            const label = isRoot ? 'ROOT' : isLeaf ? 'LEAVES' : `L${reversedLayers.length - 1 - layerIdx}`;

            return (
              <motion.div 
                key={layerIdx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: layerIdx * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-mono w-12 shrink-0 ${
                    isRoot ? 'text-amber-400 font-bold' : isLeaf ? 'text-gallows-approved' : 'text-gallows-muted'
                  }`}>{label}</span>
                  <div className="h-px flex-1 bg-gallows-border" />
                  <span className="text-[9px] font-mono text-gallows-muted/50">{layer.length} node{layer.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-14">
                  {layer.map((hash, nodeIdx) => (
                    <motion.div
                      key={nodeIdx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: layerIdx * 0.1 + nodeIdx * 0.05 }}
                      className={`px-2 py-1 rounded border font-mono text-[10px] break-all max-w-[200px] truncate cursor-default transition-all hover:scale-105 ${
                        isRoot
                          ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 shadow-lg shadow-amber-400/10'
                          : isLeaf
                          ? 'border-gallows-approved/30 bg-gallows-approved/5 text-gallows-approved/80'
                          : 'border-gallows-border bg-gallows-bg text-gallows-muted'
                      }`}
                      title={hash}
                    >
                      {hash.substring(0, 16)}…
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-3 border-t border-gallows-border flex gap-4 text-xs font-mono text-gallows-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gallows-approved/50" />
            Nodes: {treeState.nodeCount}
          </span>
          <span>Algorithm: SHA-256</span>
          <span>Ordering: Canonical</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerkleVisualizer;
