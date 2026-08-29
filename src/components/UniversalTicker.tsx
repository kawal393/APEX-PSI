import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UNIVERSAL_LEDGER,
  readStoredReceipts,
  type StoredReceipt,
} from "@/data/universalLedger";

/**
 * Auto-scrolling strip of the Universal Ledger records. Pauses on hover.
 * On mobile it degrades to a single static, horizontally scrollable row.
 */
const UniversalTicker = () => {
  const [receipts, setReceipts] = useState<Record<string, StoredReceipt>>({});

  useEffect(() => {
    setReceipts(readStoredReceipts());
  }, []);

  // Honesty rule: only sealed records appear in the public strip. Unsealed rows
  // are not rendered at all, so the front page never advertises pending work.
  const items = useMemo(
    () =>
      UNIVERSAL_LEDGER.map((row) => {
        const digest = receipts[row.id]?.decision_digest || row.decision_digest;
        return {
          id: row.id,
          label: `${row.title} · ${row.era} · sealed`,
          digest,
        };
      }).filter((item) => Boolean(item.digest)),
    [receipts],
  );

  const Item = ({ item }: { item: (typeof items)[number] }) => {
    const content = (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
        {item.label}
      </span>
    );
    return (
      <span className="mx-5 shrink-0">
        {item.digest ? (
          <Link to={`/verify?hash=${item.digest}`}>{content}</Link>
        ) : (
          content
        )}
      </span>
    );
  };

  return (
    <div className="w-full border-b border-border/60 bg-card/30">
      {/* Desktop / tablet: animated marquee */}
      <div className="group hidden overflow-hidden py-2 sm:block">
        <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused]">
          {items.map((item) => (
            <Item key={`a-${item.id}`} item={item} />
          ))}
          {items.map((item) => (
            <Item key={`b-${item.id}`} item={item} />
          ))}
        </div>
      </div>
      {/* Mobile: static scrollable row */}
      <div className="flex overflow-x-auto py-2 sm:hidden scrollbar-hide">
        {items.map((item) => (
          <Item key={`m-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
};

export default UniversalTicker;
