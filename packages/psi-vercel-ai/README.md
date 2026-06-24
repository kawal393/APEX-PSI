# @apex/psi-vercel-ai

```ts
import { generateText } from "ai";
import { buildPSIReceiptHeader, attachPSIReceipt } from "@apex/psi-vercel-ai";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const { text } = await generateText({ model, prompt });

  const header = await buildPSIReceiptHeader({
    prompt,
    text,
    predicates: ["eu-ai-act/art-6"],
  });

  const res = Response.json({ text });
  return header ? attachPSIReceipt(res, header) : res;
}
```

Spec: https://apex-psi.lovable.app/standard · MIT
