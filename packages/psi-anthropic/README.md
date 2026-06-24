# @apex/psi-anthropic

```ts
import Anthropic from "@anthropic-ai/sdk";
import { withPSI } from "@apex/psi-anthropic";

const anthropic = withPSI(new Anthropic(), {
  predicates: ["eu-ai-act/art-6"],
});

const msg = await anthropic.messages.create({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 200,
  messages: [{ role: "user", content: "Hello" }],
});

console.log(msg.compliance_receipt);
```

Spec: https://apex-psi.lovable.app/standard · MIT
