import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { psiVerifyInclusion, type PsiInclusionProof } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
const leafNode = (leafHex: string): string => sha(Buffer.concat([Buffer.from([0x00]), Buffer.from(leafHex, "hex")]));
const parentNode = (l: string, r: string): string =>
  sha(Buffer.concat([Buffer.from([0x01]), Buffer.from(l, "hex"), Buffer.from(r, "hex")]));

// A reference implementation of the RFC 9162 sec 2.1.3.2 tree, written here
// independently of the library under test.
const referenceHead = (leaves: string[]): string => {
  let level = leaves.map(leafNode);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? parentNode(level[i], level[i + 1]) : level[i]);
    }
    level = next;
  }
  return level[0];
};
const referenceMth = (hashed: string[]): string => {
  if (hashed.length === 1) return hashed[0];
  let k = 1;
  while (k * 2 < hashed.length) k *= 2;
  return parentNode(referenceMth(hashed.slice(0, k)), referenceMth(hashed.slice(k)));
};
const referencePath = (m: number, hashed: string[]): string[] => {
  if (hashed.length <= 1) return [];
  let k = 1;
  while (k * 2 < hashed.length) k *= 2;
  return m < k
    ? [...referencePath(m, hashed.slice(0, k)), referenceMth(hashed.slice(k))]
    : [...referencePath(m - k, hashed.slice(k)), referenceMth(hashed.slice(0, k))];
};

// The shortcut a third party is most likely to write: take the parity of the
// leaf index to decide which side the running node is on.
const parityReplay = (leaf: string, index: number, path: string[]): string => {
  let cur = leafNode(leaf);
  let i = index;
  for (const sibling of path) {
    cur = i % 2 === 0 ? parentNode(cur, sibling) : parentNode(sibling, cur);
    i = Math.floor(i / 2);
  }
  return cur;
};

const fakeLeaves = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => sha(Buffer.from(`leaf ${i}`)));

const LIVE_PROOF: PsiInclusionProof = {
  leaf: "e804673732f57558f6d933af58c94d6c18af1ea9df4cd09e05637332ffdddf75",
  leaf_index: 255,
  tree_size: 256,
  audit_path: [
    "fd10ac1532b06a2ee2d5b9be84dc39295e1c39c3a6e2dac934ddeb8984b97bdc",
    "0998fb306217e9d518817734691149d5ce8b2a7d3146e2b5390957866099aded",
    "97ec21d6f0084a68a99d7bab66d0aa80ac9aead2d5762ff3ac9dfd3a653ca089",
    "df9417324a7022517bad055d5ab132352981c0e3c30c515570b79a469a0b95d7",
    "7aa4e2251be48dfcd9f71f6fe19de97d6b751d0914fbf10d66c3bca5d3629838",
    "a249f6d1002b07a33ef06f63448a9bc49587465533ca1c21ee21e99f45107d36",
    "3105929e7577eeaf6535db3c840603ee25626350680e52ac8bcbaf5fda06c1bb",
    "c3776fcf03a223ce115723f28336be33af5b057495f359c2abb643168fe8db1c",
  ],
  root: "187e00f3b8891fc2f94b6a5ecd3f3878deb1db1d513a6a1646859494e937ca53",
};

test("a live inclusion proof from the public endpoint verifies", async () => {
  const result = await psiVerifyInclusion(LIVE_PROOF);
  assert.equal(result.status, "included");
  assert.equal(result.included, true);
  assert.equal(result.recomputed_root, LIVE_PROOF.root);
  assert.equal(result.rule, "13.3");
});

test("a proof whose head was altered is a mismatch, never a pass", async () => {
  const result = await psiVerifyInclusion({ ...LIVE_PROOF, root: "0".repeat(64) });
  assert.equal(result.status, "mismatch");
  assert.equal(result.included, false);
  assert.equal(result.recomputed_root, LIVE_PROOF.root);
  assert.equal(result.rule, "13.2");
});

test("the leaf-index parity shortcut only works for power-of-two trees", async () => {
  const powerOfTwo = [1, 2, 4, 8, 16, 128, 256];
  const other = [3, 5, 6, 7, 9, 11, 31, 100, 127, 200, 255, 257, 300];

  for (const n of powerOfTwo) {
    const leaves = fakeLeaves(n);
    const path = referencePath(n - 1, leaves.map(leafNode));
    const root = referenceHead(leaves);
    assert.equal(parityReplay(leaves[n - 1], n - 1, path), root, `parity shortcut at n=${n}`);
    const result = await psiVerifyInclusion({
      leaf: leaves[n - 1],
      leaf_index: n - 1,
      tree_size: n,
      audit_path: path,
      root,
    });
    assert.equal(result.included, true, `split walk at n=${n}`);
  }

  for (const n of other) {
    const leaves = fakeLeaves(n);
    const path = referencePath(n - 1, leaves.map(leafNode));
    const root = referenceHead(leaves);
    assert.notEqual(parityReplay(leaves[n - 1], n - 1, path), root, `parity shortcut at n=${n}`);
    const result = await psiVerifyInclusion({
      leaf: leaves[n - 1],
      leaf_index: n - 1,
      tree_size: n,
      audit_path: path,
      root,
    });
    assert.equal(result.included, true, `split walk at n=${n}`);
  }
});

test("a proof that cannot describe its tree is malformed, not a pass", async () => {
  const outside = await psiVerifyInclusion({ ...LIVE_PROOF, leaf_index: 256 });
  assert.equal(outside.status, "malformed");
  assert.equal(outside.included, false);

  const shortPath = await psiVerifyInclusion({ ...LIVE_PROOF, audit_path: LIVE_PROOF.audit_path.slice(0, 3) });
  assert.equal(shortPath.status, "malformed");

  const badLeaf = await psiVerifyInclusion({ ...LIVE_PROOF, leaf: "not-a-leaf" });
  assert.equal(badLeaf.status, "malformed");
});

test("the published surface states the split rule and the parity limitation", () => {
  const doc = JSON.parse(
    readFileSync(join(repoRoot, "public", ".well-known", "apex-protocol.json"), "utf8"),
  ) as Record<string, any>;

  const inclusion = doc.inclusion_proof ?? {};
  assert.equal(inclusion.rule, "R13.1");
  assert.match(String(inclusion.recompute), /largest power of two smaller than the remaining tree size/);
  assert.match(String(inclusion.parity_shortcut), /only when tree_size is a power of two/);

  // The endpoint must publish the tree size and the split rule, or a third
  // party has no way to know which walk to use.
  const endpoint = readFileSync(
    join(repoRoot, "supabase", "functions", "merkle-proof", "index.ts"),
    "utf8",
  );
  assert.match(endpoint, /tree_size/);
  assert.match(endpoint, /largest power of two smaller than the remaining tree size/);
  assert.match(endpoint, /R13\.1/);
});
