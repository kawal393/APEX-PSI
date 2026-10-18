# `c2pa-toolkit_bg.wasm` — what this file is, and how to check it yourself

This directory contains one binary, and it is not ours.

| | |
|---|---|
| File | `c2pa-toolkit_bg.wasm` |
| Comes from | npm package **`c2pa`**, version **0.30.17**, path `c2pa/dist/assets/wasm/toolkit_bg.wasm` |
| Licence | MIT (the package's own `package.json`) |
| Size | 6,259,517 bytes |
| SHA-256 | `605e14156c754d21a5bd66e1a5d0d85861f99ac6009d44234398b5b29cc812d9` |
| Vendored | `19b2e07`, 18 Oct 2026, so the C2PA reader can fetch the WASM from a stable URL at runtime instead of having it routed through the JavaScript bundle |

Machine-readable copy of the same facts: [`PROVENANCE.json`](./PROVENANCE.json).

## Reproduce the check in one command

With the dependencies installed:

```
node scripts/wasm-provenance.mjs
```

It hashes the committed file, compares it to `PROVENANCE.json`, and compares it to the WASM inside the
installed `c2pa` package. On a clean checkout it prints the digests and exits 0. It is a CI job
(`wasm-provenance` in `.github/workflows/ci.yml`), so a silent swap of this binary cannot merge.

Or by hand, with no tooling:

```
sha256sum public/wasm/c2pa-toolkit_bg.wasm
sha256sum node_modules/c2pa/dist/assets/wasm/toolkit_bg.wasm
```

Two equal digests, matching the value above, means the browser is running the same bytes the C2PA project
publishes under MIT. Different digests mean someone shipped a modified build, and that is a question to
ask before trusting anything the file-verification page prints.

## What this binary does and does not prove

It lets the page read a C2PA manifest inside a file, locally, without uploading the file. A manifest
proves that *someone attached a statement* to that content at some time. It does not prove the statement
is true, and the page reports `present` rather than `verified` unless the toolkit returns an affirmative
validation success.
