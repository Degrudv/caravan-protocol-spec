> EXPERIMENTAL — TEST NETWORK ONLY — NOT A FINANCIAL PRODUCT OR SERVICE — NO REAL FUNDS — AS IS, NO WARRANTY, NO LIABILITY — USE AT YOUR OWN RISK

# caravan-protocol-spec

caravan-protocol-spec is the canonical specification repository for the Caravan protocol. It defines the JSON Schemas for intents, mandates, offers, and settlement messages exchanged between agents. It hosts the Value-for-Money (VFM) predicate definitions used by the matcher and verifier components to evaluate offers. It also maintains the protocol parameter manifest — the single source of truth for tunable protocol constants referenced by every other Caravan repository. All other Caravan repositories treat this spec as authoritative and should track it as their upstream reference.

**Status:** pre-alpha scaffold

## What this repo is

This repository is the wire-format and parameter contract for the Caravan A2A group-buying
protocol. Concretely, it holds:

- **JSON Schemas** (`schemas/`) for the ten core §5.1 data-model entities — `Principal`,
  `AgentRegistration`, `CanonicalSKU`, `StandingOffer`, `PurchaseIntent`, `Pool`,
  `Settlement`, `FulfillmentAttestation`, `Dispute`, `ReputationAttestation` — plus a shared
  `OrderLine` sub-schema referenced from `Pool.members` and `Settlement.per_unit`.
- **Fixtures** (`fixtures/`) — one valid, cross-referentially coherent example instance per
  schema, used as the ground truth for the test suite.
- **The canonical parameter manifest** (`params/`) — a byte-verbatim copy of
  `caravan.params.json`, the single source of truth for every tunable protocol constant.
- **VFM predicate definitions** (`vfm/`) — the value-for-money release-predicate classes and
  their mapping to settlement modes.
- **An A2A Agent Card template** (`well-known/`) — the deployment-time skeleton for
  Caravan's discoverable agent identity.

It contains no executable protocol logic, no contracts, and no matcher/settlement code —
those live in their own repositories (`caravan-contracts-core`, `caravan-matcher`,
`caravan-sdk`, etc.) and depend on this repo as their upstream reference.

## Schemas index

Draft 2020-12 JSON Schema, `$id` under
`https://raw.githubusercontent.com/Degrudv/caravan-protocol-spec/main/schemas/`. Every
schema sets `additionalProperties: false` except three deliberately open-ended fields
called out in-schema (`StandingOffer.vfm_params`, `PurchaseIntent.delivery_constraints`,
`ReputationAttestation.data`), which mirror the plan's own `{...}` notation for those fields.

| Entity | Schema file | Fixture |
|---|---|---|
| Principal | [`schemas/principal.schema.json`](./schemas/principal.schema.json) | [`fixtures/principal.json`](./fixtures/principal.json) |
| AgentRegistration | [`schemas/agent-registration.schema.json`](./schemas/agent-registration.schema.json) | [`fixtures/agent-registration.json`](./fixtures/agent-registration.json) |
| CanonicalSKU | [`schemas/canonical-sku.schema.json`](./schemas/canonical-sku.schema.json) | [`fixtures/canonical-sku.json`](./fixtures/canonical-sku.json) |
| StandingOffer | [`schemas/standing-offer.schema.json`](./schemas/standing-offer.schema.json) | [`fixtures/standing-offer.json`](./fixtures/standing-offer.json) |
| PurchaseIntent | [`schemas/purchase-intent.schema.json`](./schemas/purchase-intent.schema.json) | [`fixtures/purchase-intent.json`](./fixtures/purchase-intent.json) |
| OrderLine *(shared `$defs`, referenced by Pool and Settlement)* | [`schemas/order-line.schema.json`](./schemas/order-line.schema.json) | [`fixtures/order-line.json`](./fixtures/order-line.json) |
| Pool | [`schemas/pool.schema.json`](./schemas/pool.schema.json) | [`fixtures/pool.json`](./fixtures/pool.json) |
| Settlement | [`schemas/settlement.schema.json`](./schemas/settlement.schema.json) | [`fixtures/settlement.json`](./fixtures/settlement.json) |
| FulfillmentAttestation | [`schemas/fulfillment-attestation.schema.json`](./schemas/fulfillment-attestation.schema.json) | [`fixtures/fulfillment-attestation.json`](./fixtures/fulfillment-attestation.json) |
| Dispute | [`schemas/dispute.schema.json`](./schemas/dispute.schema.json) | [`fixtures/dispute.json`](./fixtures/dispute.json) |
| ReputationAttestation | [`schemas/reputation-attestation.schema.json`](./schemas/reputation-attestation.schema.json) | [`fixtures/reputation-attestation.json`](./fixtures/reputation-attestation.json) |

TypeScript interfaces mirroring every schema are exported from [`src/index.ts`](./src/index.ts),
alongside `SCHEMA_FILES`, the canonical list of schema file paths. `tests/schemas.test.ts`
compiles every schema with Ajv (draft 2020-12 + `ajv-formats`), asserts its fixture validates,
and asserts validation fails when a required field is removed.

## Params

[`params/caravan.params.json`](./params/caravan.params.json) is a **byte-verbatim** copy of
the authoritative `caravan.params.json` parameter manifest. It is the single source of truth
for every tunable protocol constant — fees, fee split, tiers, invariant `k`, window/dispute
timing, VFM launch classes, licensing, and gates. **If any prose in this repository (or any
other Caravan repository) disagrees with this file, this file wins.** Do not hand-edit it;
regenerate it from the canonical source and re-verify the hash if it ever needs to change.

## VFM

[`vfm/predicates.md`](./vfm/predicates.md) defines VFM classes A–D verbatim-faithful to
`params.vfm`, and maps them to the two non-atomic settlement modes described in §6.1 of the
plan — streaming settlement for termed entitlements and usage-metered settlement for
consumption products. **Only classes A and B are enabled at launch**
(`params.vfm.launchClasses`).

## Agent card template

[`well-known/agent-card.template.json`](./well-known/agent-card.template.json) is a minimal
A2A-style Agent Card **template** — every deployment-specific value (`url`, `provider`,
`version`, authentication schemes) is a literal `"TEMPLATE"` placeholder filled in at deploy
time, not a live card. It enumerates Caravan's six buyer-facing MCP tools
(`check_group_price`, `create_standing_intent`, `commit_to_pool`, `cancel_before_lock`,
`get_pool_status`, `get_settlement_status`) and carries an `aiDisclosure` field for EU AI Act
Article 50-style automated-agent disclosure, consistent with `AgentRegistration.ai_disclosure`
in the data model.

## Package

This package is published to **GitHub Packages** as **`@degrudv/caravan-spec`**
(`publishConfig.registry: https://npm.pkg.github.com`) — GitHub Packages requires the package
scope to match the owning GitHub org/user, so it cannot publish under the protocol's own
`@caravan` scope. The canonical protocol package name **`@caravan/spec`** is recorded in
`package.json` as `caravanCanonicalName` and is reserved for a future registry/scope where an
unscoped-to-owner name is possible (per decision D-009). Consumers pinning a dependency today
should depend on `@degrudv/caravan-spec`; the `caravanCanonicalName` field exists so tooling
can detect and later migrate to the canonical name without a breaking change to this repo's
identity in the interim.

## License

This repository is licensed under the **Apache License, Version 2.0**. See [LICENSE](./LICENSE) for the full text.

---

Part of the Caravan protocol — see `caravan-protocol-spec` for the canonical spec.
