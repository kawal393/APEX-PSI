/** Required honesty statement. Rendered small and grey wherever the standard is claimed. */
export const HONESTY_TEXT =
  "PSI-SEAL is a proposed open standard under active development. IETF documents referenced are individual submissions and carry no endorsement or standing. Conformant seals are deterministic statements about byte state and time — never a certification of content quality.";

const HonestyLine = ({ className = "" }: { className?: string }) => (
  <p className={`text-[11px] leading-relaxed text-muted-foreground/70 ${className}`}>
    {HONESTY_TEXT}
  </p>
);

export default HonestyLine;
