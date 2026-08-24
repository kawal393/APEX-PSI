import { TOTAL_SEATS } from "@/config/founding";

export type WallMember = {
  seat_number: number;
  display_name: string;
  receipt_id: string;
  leaf_hash: string;
  sealed_at: string;
};

const pad = (n: number) => String(n).padStart(3, "0");
const short = (h: string) => `${h.slice(0, 10)}\u2026${h.slice(-6)}`;

const GenesisWall = ({
  members,
  reservedSeats,
}: {
  members: WallMember[];
  reservedSeats: number[];
}) => {
  const bySeat = new Map(members.map((m) => [m.seat_number, m]));
  const reserved = new Set(reservedSeats);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map((seat) => {
        const member = bySeat.get(seat);
        if (member) {
          return (
            <div
              key={seat}
              data-seat-state="INSCRIBED"
              className="border border-gold/50 bg-gold/[0.04] p-3 flex flex-col gap-1"
            >
              <span className="font-mono text-[10px] tracking-[0.25em] text-gold">#{pad(seat)}</span>
              <span className="text-sm font-semibold leading-tight break-words">{member.display_name}</span>
              <span className="font-mono text-[9px] text-muted-foreground break-all">{member.receipt_id}</span>
              <span className="font-mono text-[9px] text-muted-foreground break-all">{short(member.leaf_hash)}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {new Date(member.sealed_at).toISOString().replace(".000", "")}
              </span>
              <a
                href={`/verify?hash=${member.leaf_hash}`}
                className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold hover:underline mt-1"
              >
                Verify
              </a>
            </div>
          );
        }
        if (reserved.has(seat)) {
          return (
            <div
              key={seat}
              data-seat-state="RESERVED"
              className="border border-border bg-card/40 p-3 flex flex-col gap-1"
            >
              <span className="font-mono text-[10px] tracking-[0.25em] text-foreground/70">#{pad(seat)}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                first witness pending
              </span>
            </div>
          );
        }
        return (
          <div
            key={seat}
            data-seat-state="UNCLAIMED"
            className="border border-border/40 p-3 text-muted-foreground/60"
          >
            <span className="font-mono text-[10px] tracking-[0.25em]">#{pad(seat)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default GenesisWall;
