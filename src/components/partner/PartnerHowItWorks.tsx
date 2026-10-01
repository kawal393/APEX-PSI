import { UserPlus, FileCheck2, Gauge } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Take a reference",
    desc: "Create a free account and activate an operator reference in one click. No application, no sales call, no agreement to sign first.",
  },
  {
    icon: FileCheck2,
    title: "Seal and publish",
    desc: "Seal your own records and embed the one-line badge. Every record you publish gets a permanent public receipt page that anyone can recompute.",
  },
  {
    icon: Gauge,
    title: "Raise the cap, not the stakes",
    desc: "The commons is free at 100 seals a day. A paid key raises that daily cap and nothing else - no result, no priority, no finding is for sale.",
  },
];

const PartnerHowItWorks = () => (
  <section className="py-20 px-4">
    <div className="container mx-auto max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
        How It <span className="text-gold-gradient">Works</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((s, i) => (
          <div key={i} className="text-center p-6 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <s.icon className="h-7 w-7 text-primary" />
            </div>
            <div className="text-xs font-bold text-primary mb-2">STEP {i + 1}</div>
            <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PartnerHowItWorks;
