> EXPERIMENTAL — TEST NETWORK ONLY — NOT A FINANCIAL PRODUCT OR SERVICE — NO REAL FUNDS — AS IS, NO WARRANTY, NO LIABILITY — USE AT YOUR OWN RISK

# VFM Predicates

Value-for-Money (VFM) classes are the release-predicate library the matcher and verifier
use to decide when a settlement leg is allowed to pay out (§6.2 of the plan). This document
is verbatim-faithful to `params/caravan.params.json` → `vfm` — **if this document and the
params file ever disagree, the params file wins** (per its own `_comment`).

## Canonical definitions (verbatim from `params.vfm`)

```json
"vfm": {
  "A": "atomic-onchain",
  "B": "vendor-of-record API (zkTLS AND 2-of-3 pull-quorum) + functional-activation-test + unique-entitlement-id",
  "C": "carrier-POD + authenticity (Phase 3, capped, 25% seller bond, 7d)",
  "D": "licensed-title/escrow oracle (Phase 4)",
  "launchClasses": [ "A", "B" ]
}
```

## Launch classes

**Only VFM-A and VFM-B are enabled at launch** (`params.vfm.launchClasses = ["A", "B"]`).
VFM-C and VFM-D are defined here for forward compatibility with the canonical schemas
(`CanonicalSKU.vfm_class` accepts `"A" | "B" | "C" | "D"`) but MUST NOT be assigned to any
SKU, offer, or pool before their respective phase gates open. `caravan.params.json` remains
the single source of truth for which classes are actually live in a given environment.

## Class definitions and predicates (§6.2)

| Class | Categories | Release predicate | Evidence integrity | Residual risk |
|---|---|---|---|---|
| **A — atomic on-chain** | Tokenized compute credits, on-chain licenses/domains | Asset transfer ∧ payment in one transaction | The chain itself | ~zero (Akash's metered on-chain leases are the production precedent) |
| **B — API-attested provisioning** | SaaS seats, API credits, license keys, cloud commitments — provisioned into each principal's own vendor account | Entitlement active for principal P per vendor-of-record API, domain-pinned to the SKU ∧ functional activation test passes (a scripted, SKU-defined call actually succeeds using the new entitlement) ∧ entitlement ID globally unique (one entitlement can never satisfy two order lines) — attested by zkTLS transcript **AND** 2-of-3 independent oracle operators pulling from the authenticated API (never relaying pushed webhooks) | Seller ≠ attestation source unless seller *is* the vendor (§6.4); quorum diversity requirements (different orgs, different infra) | Vendor API outage (auto-extend); collusion of vendor+seller when identical (bounded by streaming + bonds) |
| **C — carrier + authenticity (Phase 3)** | Standardized physical goods, value-capped | Carrier POD (oracle pull from carrier API) ∧ authenticity/serial check via manufacturer API where available | POD is necessary, not sufficient — it proves arrival, not correctness; hence caps, 25% seller bonds, 7-day challenge, insurance | Not-as-described residue — the one category where bonded challenge + panel does real work |
| **D — title/licensed-escrow (Phase 4)** | Vehicles, titled equipment | Title-transfer event attested by licensed title clearinghouse / licensed escrow partner API | Regulated partner is the oracle of record (no US state exposes an open title API) | Partner risk; jurisdictional coverage |

"Silence is consent": every buyer agent runs Caravan's open-source verifier module, which
checks the entitlement in its principal's own vendor account automatically. If it finds a
problem it files a machine-evidence challenge; if it says nothing through the challenge
window (72h digital / 7d physical), release proceeds.

## Mapping to settlement modes (§6.1)

`Settlement.per_unit[].mode` (see `schemas/order-line.schema.json` and `schemas/settlement.schema.json`)
carries four values: `atomic`, `stream`, `usage_epoch`, `optimistic`. §6.1 names the two
non-atomic release mechanisms **streaming settlement** ("StreamSettle") and **usage-metered
settlement** ("UsageSettle"). Neither mechanism is itself a VFM class — they are the *release
schedule* layered on top of a class's predicate, chosen per SKU by whether the entitlement is
termed or consumption-based:

| VFM class | Typical settlement mode(s) | Why |
|---|---|---|
| **A — atomic-onchain** | `atomic` | "There is nothing to dispute — no evidence, no window, no arbitration." Delivery and payment are one transaction; StreamSettle/UsageSettle do not apply. |
| **B — vendor-of-record API** | `stream` (StreamSettle) for **termed** entitlements (SaaS seats, cloud commitments with a term) — payment releases continuously against the term, gated by periodic automated re-verification (weekly for months 1-2, then monthly per `params.invariant.streamRecheck`), so a revoking seller automatically stops being paid; `usage_epoch` (UsageSettle) for **consumption** products (API credits, inference tokens, GPU-hours) — funds the maximum authorized usage, releases per metering epoch against signed gateway **and** independent-meter receipts, with unused escrow auto-refunded at expiration | VFM-B's release predicate (entitlement active ∧ functional activation test ∧ unique entitlement ID) is re-run on the StreamSettle/UsageSettle schedule rather than checked once, which is what makes post-tail revocation and "credits that stop working" self-limiting instead of a full-loss event. |
| **C — carrier + authenticity** *(Phase 3, not launched)* | `atomic` after POD + authenticity clears, or `optimistic` pending the 7-day physical challenge window | Physical delivery has no natural streaming/usage shape; risk is instead bounded by seller bonds and the challenge window. |
| **D — title/licensed-escrow** *(Phase 4, not launched)* | `atomic` after the licensed partner attests title transfer | Title transfer is a single discrete legal event, not a term or a metered consumption stream. |

At launch (`launchClasses = ["A", "B"]`), the only settlement modes a pool should ever need
are `atomic` (VFM-A) and `stream` / `usage_epoch` (VFM-B, split by whether the underlying SKU
is termed or consumption-based). `optimistic` exists in the schema for completeness and for
VFM-C/D's future physical-goods challenge window, but is bounded at every instant by the §6.6
security invariant regardless of which VFM class produced it.
