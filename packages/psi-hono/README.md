# @apex/psi-hono

```ts
import { Hono } from "hono";
import { psi } from "@apex/psi-hono";

const app = new Hono();
app.use("/ai/*", psi({ predicates: ["eu-ai-act/art-6"] }));

app.post("/ai/chat", async (c) => {
  const text = await runModel(await c.req.json());
  return c.json({ text });
});
```

Every response under `/ai/*` ships with a `Compliance-Receipt` header.

Spec: https://ai-governance-standard.com/standard · MIT
