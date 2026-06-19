## Objective
Replace the arrogant Sovereign Seal headline with a humble, inevitable tone, and fix the critical runtime error breaking the preview.

## Changes

### 1. SovereignSealStrip Headline
**File:** `src/components/SovereignSealStrip.tsx`

Replace the current headline:
```
The world will not be
asked. It will be sealed.
```

With the chosen text:
```
The world will now watch
the truth being sealed.
```

This removes the confrontational tone while keeping the inevitability framing. It positions APEX PSI as observable infrastructure rather than an aggressive actor.

### 2. React Runtime Error Fix
**Issue:** Preview shows `TypeError: Cannot read properties of null (reading 'useEffect')` originating from `@tanstack/react-query`'s `QueryClientProvider`.

**Root cause:** This typically indicates duplicate React instances or a version mismatch between React and `@tanstack/react-query`.

**Fix approach:**
- Inspect `package.json` for React version conflicts
- Check `bun.lock` / `node_modules` for duplicate React entries
- If duplicates exist, deduplicate via `bun install` or resolution overrides
- Verify `@tanstack/react-query` version compatibility with React 18
- If necessary, clear Vite cache and restart dev server

## Acceptance Criteria
- [ ] SovereignSealStrip renders the new headline correctly
- [ ] Preview loads without `useEffect` null errors
- [ ] Build completes successfully