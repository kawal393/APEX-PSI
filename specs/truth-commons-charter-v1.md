# Truth Commons Charter — v1

- spec id: `PSI-TRUTHCOMMONS-1`
- published: **2026-09-28**
- purpose: define how the *meanings* used by PSI verification (predicates)
  are proposed, reviewed, published, and changed — without a hidden
  authority and without any party, including APEX Infrastructure, editing
  them silently
- status: this charter binds APEX Infrastructure as the initial mark issuer.
  It is designed to outlive that role.

## 1. What a predicate is

A seal proves one thing on its own: *these bytes existed at this time and
have not changed.* Every richer statement — "this receipt satisfies EU AI
Act Article 50 marking", "this envelope counts as fulfilled", "this score is
MATERIAL" — depends on a **predicate**: a published, versioned definition
mapping sealed facts to a claimed meaning.

Predicates are the only editable part of the system. Everything below
governs them.

## 2. Governance principles

1. **Versioned or void.** Every predicate carries an id and version
   (e.g. `EU_ART_50_MARKING/1`). Meanings are never edited in place; a
   change means a new version, and every seal's conformance statement names
   the version it was checked against.
2. **Public proposal.** Anyone may propose a predicate or a new version.
   Proposals are published in the open with their full text.
3. **Review period.** A proposal is public for a fixed review period
   (default 30 days) before it may be adopted. Comments and the disposition
   of each substantive objection are published.
4. **No silent edits.** The mark issuer may not change any predicate,
   band, or mapping without a published new version and the review period.
   The charter's own amendments follow the same rule (section 5).
5. **Divergence is allowed.** Multiple predicate versions may coexist.
   A verifier reports which version it evaluated against; two verifiers
   disagreeing is a visible, sealed fact — never smoothed over.
6. **Neutrality of arithmetic.** The seal-formation rules (PSI-SEAL/1,
   R1–R12) are not predicates and are not governed by this charter. They
   are frozen per the shelf stability rule. This charter governs only
   *meaning*, never *digest*.

## 3. Roles

- **Mark issuer** (initially APEX Infrastructure): publishes adopted
  predicate versions, operates the review period, and grants or refuses
  the `Apex Verified` / `PSI-SEAL COMPLIANT` marks against published
  predicates. The issuer may not refuse a mark except by reference to a
  published predicate version.
- **Implementers** (SDKs, verifiers, conforming services): evaluate
  against named predicate versions and say so in every output.
- **Any party** (deployers, auditors, regulators, the public): propose,
  comment, independently verify, and independently publish rival predicate
  sets — rivalry is explicitly permitted and is how bad definitions die.

## 4. Predicate register

Adopted predicates live in a published register, one entry per version:

```
{ id, version, status: proposed | adopted | deprecated,
  adopted_at, defines, review_summary, supersedes }
```

Each register entry is itself sealed and anchored, so the register's own
history cannot be rewritten after the fact.

## 5. Survive-you clause

This charter is assigned, on publication, as a dated anchored document.
Any successor mark issuer inherits it unchanged. An amendment requires:

1. a published proposal under section 2.3 (30-day review), and
2. the amendment itself sealed and anchored before it takes effect.

There is no mechanism, held by anyone including the current mark issuer,
to change the governance rules quietly. If APEX Infrastructure disappears,
the anchored register, the frozen schema, and this charter remain verifiable
by anyone, forever, from public bytes.

## 6. What the charter does not claim

- It does not make any predicate legally binding on any court, regulator,
  or party. It governs the meaning used inside PSI conformance statements
  and the award of APEX marks — nothing wider.
- It does not warrant that any adopted predicate is correct. It warrants
  only that the predicate's definition, history, and evaluation version are
  public, dated, and unrewritable.
- It establishes no membership, no council, and no voting body. Review is
  public comment and published disposition, not a closed committee.

## 7. Free and paid

Reading the register, proposing predicates, commenting during review
periods, and verifying any predicate's history: **free forever**, keyless,
offline-verifiable. The commercial edge remains where it has always been on
this shelf — the marks and priority services, per `/license`.
