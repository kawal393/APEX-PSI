import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  psiConsistencyPath,
  psiTreeHead,
  psiVerifyConsistency,
  type PsiConsistencyProof,
} from "../src/index.ts";

const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
const leafNode = (leafHex: string): string =>
  sha(Buffer.concat([Buffer.from([0x00]), Buffer.from(leafHex, "hex")]));
const parentNode = (l: string, r: string): string =>
  sha(Buffer.concat([Buffer.from([0x01]), Buffer.from(l, "hex"), Buffer.from(r, "hex")]));

// A reference implementation of the RFC 9162 tree, written here independently
// of the library under test.
const referenceMth = (hashed: string[]): string => {
  if (hashed.length === 0) return "";
  if (hashed.length === 1) return hashed[0];
  let k = 1;
  while (k * 2 < hashed.length) k *= 2;
  return parentNode(referenceMth(hashed.slice(0, k)), referenceMth(hashed.slice(k)));
};

const leaves = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => sha(Buffer.from([i])));

const allLeaves = leaves(64);
const hashed = allLeaves.map(leafNode);

test("the tree head matches an independent reference implementation", async () => {
  for (let n = 1; n <= 16; n += 1) {
    assert.equal(await psiTreeHead(allLeaves.slice(0, n)), referenceMth(hashed.slice(0, n)));
  }
});

test("every size pair verifies", async () => {
  for (let second = 1; second <= 32; second += 1) {
    for (let first = 1; first <= second; first += 1) {
      const proof: PsiConsistencyProof = {
        first_size: first,
        second_size: second,
        first_root: await psiTreeHead(allLeaves.slice(0, first)),
        second_root: await psiTreeHead(allLeaves.slice(0, second)),
        consistency_path:
          first === second ? [] : await psiConsistencyPath(allLeaves.slice(0, first), allLeaves.slice(0, second)),
      };
      const result = await psiVerifyConsistency(proof);
      assert.equal(result.status, "consistent", `(${first},${second}): ${result.detail}`);
      assert.equal(result.consistent, true);
    }
  }
});

test("a proof with one altered node is refused", async () => {
  let refused = 0;
  for (let second = 2; second <= 24; second += 1) {
    for (let first = 1; first < second; first += 1) {
      const path = await psiConsistencyPath(allLeaves.slice(0, first), allLeaves.slice(0, second));
      for (let index = 0; index < path.length; index += 1) {
        const broken = [...path];
        const node = Buffer.from(broken[index], "hex");
        node[0] ^= 0x01;
        broken[index] = node.toString("hex");
        const result = await psiVerifyConsistency({
          first_size: first,
          second_size: second,
          first_root: await psiTreeHead(allLeaves.slice(0, first)),
          second_root: await psiTreeHead(allLeaves.slice(0, second)),
          consistency_path: broken,
        });
        assert.notEqual(result.status, "consistent", `(${first},${second}) accepted an altered proof`);
        refused += 1;
      }
    }
  }
  assert.ok(refused > 500, `expected many refusals, got ${refused}`);
});

test("the split view is refused: two different trees at the same size", async () => {
  const forked = [...allLeaves.slice(0, 32)];
  forked[7] = sha(Buffer.from("fork"));
  const result = await psiVerifyConsistency({
    first_size: 8,
    second_size: 8,
    first_root: await psiTreeHead(allLeaves.slice(0, 8)),
    second_root: await psiTreeHead(forked.slice(0, 8)),
    consistency_path: [],
  });
  assert.equal(result.status, "mismatch");
});

test("a proof for one pair of trees does not verify against another", async () => {
  const honest = await psiConsistencyPath(allLeaves.slice(0, 5), allLeaves.slice(0, 9));
  const result = await psiVerifyConsistency({
    first_size: 5,
    second_size: 9,
    first_root: await psiTreeHead(allLeaves.slice(0, 5)),
    second_root: await psiTreeHead(allLeaves.slice(0, 6)),
    consistency_path: honest,
  });
  assert.equal(result.status, "mismatch");
});

test("malformed proofs are refused, not guessed", async () => {
  const heads = {
    first_root: "00".repeat(32),
    second_root: "11".repeat(32),
  };
  const cases: [PsiConsistencyProof, string][] = [
    [{ first_size: 0, second_size: 4, ...heads, consistency_path: [] }, "zero size"],
    [{ first_size: 9, second_size: 4, ...heads, consistency_path: [] }, "second smaller than first"],
    [{ first_size: "4" as unknown as number, second_size: 8, ...heads, consistency_path: [] }, "size as a string"],
    [{ first_size: 4, second_size: 8, first_root: "zz".repeat(32), second_root: "11".repeat(32), consistency_path: [] }, "root is not hex"],
    [{ first_size: 4, second_size: 8, ...heads, consistency_path: ["nothex"] }, "path node is not hex"],
    [{ first_size: 4, second_size: 8, ...heads, consistency_path: [] }, "empty path between different trees"],
  ];
  for (const [proof, why] of cases) {
    const result = await psiVerifyConsistency(proof);
    assert.equal(result.status, "malformed", `${why} was not refused: ${result.detail}`);
  }
});

test("the generator refuses to invent a proof for a tree that is not a prefix", async () => {
  const forked = [...allLeaves.slice(0, 4)];
  forked[2] = sha(Buffer.from("fork"));
  await assert.rejects(() => psiConsistencyPath(forked, allLeaves.slice(0, 8)));
  await assert.rejects(() => psiConsistencyPath(allLeaves.slice(0, 8), allLeaves.slice(0, 4)));
});
