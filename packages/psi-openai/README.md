# @apex/psi-openai

One line. Every OpenAI response carries a `Compliance-Receipt` (draft-singh-psi-http-01).

```ts
import OpenAI from "openai";
import { withPSI } from "@apex/psi-openai";

const openai = withPSI(new OpenAI(), {
  predicates: ["eu-ai-act/art-6", "nist-ai-rmf/govern-1.1"],
  mode: "optimistic", // or "blocking"
});

const res = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});

console.log(res.compliance_receipt);
// v=1; rid=psi_...; pred=eu-ai-act/art-6,...; status=compliant;
// sig=ed25519:...; verify=https://digital-gallows.apex-infrastructure.com/verify/psi_...
```

## Why

Every AI response on the internet should carry a publicly verifiable proof
of regulatory compliance, the way every HTTPS response carries a TLS
certificate. This package gives you that with a single function call.

See [the spec](https://digital-gallows.apex-infrastructure.com/standard) and
[the live inspector](https://digital-gallows.apex-infrastructure.com/header).

MIT · APEX PSI Foundation (in formation)
