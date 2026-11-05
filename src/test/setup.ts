import "@testing-library/jest-dom";
import * as ed from "@noble/ed25519";
import { createHash } from "node:crypto";

// @noble/ed25519's async path calls crypto.subtle.digest with `bytes.buffer`, and jsdom's
// realm rejects a Node ArrayBuffer as "not an ArrayBuffer". psi-signatures.ts swallows that
// as `return false`, so every real receipt reads as FORGED under vitest. Pin SHA-512 to
// node:crypto for the test run; browsers keep WebCrypto.
ed.hashes.sha512 = (m) => new Uint8Array(createHash("sha512").update(m).digest());
ed.hashes.sha512Async = async (m) => ed.hashes.sha512!(m);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
