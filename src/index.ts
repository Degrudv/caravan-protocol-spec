/**
 * Repository identifier for this Caravan package.
 */
export const REPO = 'caravan-protocol-spec';

/**
 * Placeholder scaffold function.
 *
 * @remarks
 * This function exists only so the package has a real, testable export while
 * the actual `caravan-protocol-spec` implementation is designed and built. It performs no
 * protocol logic and MUST NOT be relied upon for anything beyond confirming
 * that the build, type-check, lint, and test pipeline works end to end.
 *
 * @param who - An arbitrary name to greet.
 * @returns A deterministic scaffold greeting string.
 */
export function scaffoldGreeting(who: string): string {
  return `Hello from ${REPO}, ${who}`;
}

/* -------------------------------------------------------------------------
 * Canonical data model (§5.1)
 *
 * TypeScript interfaces mirroring schemas/*.schema.json. These are hand
 * authored to stay structurally identical to the JSON Schemas (draft
 * 2020-12) in this repository; the JSON Schemas remain the source of truth
 * for runtime validation (see tests/schemas.test.ts). If the two ever
 * diverge, the JSON Schema wins.
 * ---------------------------------------------------------------------- */

/** Ethereum address, `0x` + 40 hex chars. */
export type Address = string;

/** 32-byte hash (e.g. keccak256), `0x` + 64 hex chars. */
export type Bytes32 = string;

/** Arbitrary-length hex-encoded bytes (signatures, attestation blobs), `0x` + hex chars. */
export type HexBytes = string;

/** USDC amount in 6-decimal base units, string-encoded integer (e.g. "1000000" = 1.000000 USDC). */
export type UsdBaseUnits = string;

/** RFC3339 / ISO-8601 date-time string. */
export type Iso8601DateTime = string;

/** ISO-8601 duration string (e.g. "P7D", "PT720H"). */
export type Iso8601Duration = string;

/** RFC4122 UUID string. */
export type Uuid = string;

/** W3C Decentralized Identifier string. */
export type Did = string;

/** ISO 3166-1 alpha-2 country code. */
export type Iso3166Alpha2 = string;

/** Shared EIP-712 signature envelope used by delegation_sig, supplier_sig, agent_sig. */
export interface Eip712Signature {
  signature: HexBytes;
  signer_address: Address;
  domain_hash?: Bytes32;
}

/* --- Principal ----------------------------------------------------------- */

export type PrincipalType = 'individual' | 'business';
export type VerificationTier = 0 | 1 | 2 | 3;
export type PrincipalStanding = 'good' | 'suspended' | 'banned';

export interface Principal {
  principal_id: Uuid;
  type: PrincipalType;
  verification_tier: VerificationTier;
  /** Beneficial-owner cluster identifier (private). */
  ubo_cluster_id: Bytes32;
  kyb_providers: string[];
  jurisdiction: Iso3166Alpha2;
  sanctions_status: {
    screened_at: Iso8601DateTime;
    result: string;
  };
  caps: {
    per_pool: UsdBaseUnits;
    monthly: UsdBaseUnits;
  };
  standing: PrincipalStanding;
}

/* --- AgentRegistration ---------------------------------------------------- */

export interface AgentPubkeyEntry {
  public_key: HexBytes;
  added_at: Iso8601DateTime;
  status: 'active' | 'revoked';
}

export interface AgentRegistration {
  agent_did: Did;
  /** Rotatable; history preserved. */
  pubkeys: AgentPubkeyEntry[];
  /** The binding that matters. */
  principal_id: Uuid;
  delegation_sig: Eip712Signature;
  a2a_card_url: string;
  /** Interop only. */
  erc8004_ref?: string;
  /** EU AI Act Art. 50 field; always true for a registered agent. */
  ai_disclosure: true;
}

/* --- CanonicalSKU ---------------------------------------------------------- */

/** Launch-scope categories (params.launchScope.categories); expands post-launch. */
export type SkuCategory = 'committed-GPU/compute' | 'inference-credits' | 'SaaS-via-authorized-distributors';

export type VfmClass = 'A' | 'B' | 'C' | 'D';

export interface CanonicalSkuAttestationEndpoint {
  vendor_domain: string;
  api_schema: string[];
  zktls_provider_ids: string[];
}

export interface CanonicalSKU {
  sku_id: string;
  /** keccak256(spec_doc). Disputes are decided against this hash, not prose. */
  spec_hash: Bytes32;
  category: SkuCategory;
  unit: string;
  term_length: Iso8601Duration | null;
  vfm_class: VfmClass;
  attestation_endpoint: CanonicalSkuAttestationEndpoint;
  tax_class: string;
  jurisdictions_allowed: Iso3166Alpha2[];
}

/* --- StandingOffer ----------------------------------------------------------- */

export interface StandingOfferTier {
  min_qty: number;
  unit_price: UsdBaseUnits;
}

export type TierFallbackRule = 'next_valid_tier' | 'replacement_window' | 'cancel_refund';

/** Deliberately open-ended beyond `class`; shape differs per VFM class (see vfm/predicates.md). */
export interface VfmParams {
  class: VfmClass;
  [key: string]: unknown;
}

export interface StandingOffer {
  offer_id: Uuid;
  supplier_principal_id: Uuid;
  sku_id: string;
  spec_hash: Bytes32;
  /** Monotonically non-increasing unit_price as min_qty increases. */
  tier_curve: StandingOfferTier[];
  /** BONDED qty-1 reference price (§6.3). */
  reference_price_qty1: UsdBaseUnits;
  reference_bond: UsdBaseUnits;
  /** Pre-committed at signing; immutable after pool formation. */
  tier_fallback_rule: TierFallbackRule;
  capacity: { min: number; max: number };
  expiry: Iso8601DateTime;
  delivery_deadline: Iso8601Duration;
  vfm_params: VfmParams;
  supplier_sig: Eip712Signature;
}

/* --- PurchaseIntent ------------------------------------------------------------ */

export type SubstitutionPolicy = 'none' | Bytes32[];
export type IntentDuration = 'window' | 'standing_7d' | 'standing_30d' | 'recurring_monthly';

/** Deliberately open-ended (per §5.1 `{...}`). */
export interface DeliveryConstraints {
  jurisdiction?: Iso3166Alpha2;
  latest_delivery?: Iso8601DateTime;
  notes?: string;
  [key: string]: unknown;
}

export interface EscrowPermitSignature {
  signature: HexBytes;
  signer_address: Address;
  nonce?: string;
  deadline?: Iso8601DateTime;
}

export interface FundsPreauth {
  /** Settlement asset contract address (USDC). */
  token: Address;
  amount: UsdBaseUnits;
  escrow_permit_sig: EscrowPermitSignature;
}

export interface PurchaseIntent {
  intent_id: Uuid;
  agent_did: Did;
  /** keccak256 hash of principal_id — sealed, matcher-visible only. */
  principal_id: Bytes32;
  sku_id: string;
  qty: { min: number; max: number };
  price_ceiling: UsdBaseUnits;
  /** Silent substitution is impossible by construction. */
  substitution_policy: SubstitutionPolicy;
  duration: IntentDuration;
  expiry: Iso8601DateTime;
  window_id: string;
  delivery_constraints: DeliveryConstraints;
  funds_preauth: FundsPreauth;
  agent_sig: Eip712Signature;
}

/* --- OrderLine (shared $defs sub-schema; see schemas/order-line.schema.json) ---- */

export type SettlementMode = 'atomic' | 'stream' | 'usage_epoch' | 'optimistic';
export type OrderLineState = 'PENDING' | 'ATTESTED' | 'RELEASED' | 'CHALLENGED' | 'REFUNDED';

export interface OrderLineStream {
  rate: UsdBaseUnits;
  verified_through_ts: Iso8601DateTime;
}

export interface OrderLineUsageReceipt {
  meter_sig: HexBytes;
  gateway_sig: HexBytes;
}

export interface OrderLineUsage {
  funded_max: UsdBaseUnits;
  epoch_length: Iso8601Duration;
  receipts: OrderLineUsageReceipt[];
  released_to_date: UsdBaseUnits;
  unused_auto_refund_at: Iso8601DateTime;
}

/**
 * Shared per-buyer order-line shape. Referenced by Pool.members (intent_id/qty/join_ts
 * populated) and Settlement.per_unit (buyer_principal_hash/qty/mode/stream/usage/state
 * populated). Only `qty` is universal; §6.8 — one disputed order line never affects
 * another, and one entitlement ID never satisfies two order lines.
 */
export interface OrderLine {
  intent_id?: Uuid;
  buyer_principal_hash?: Bytes32;
  qty: number;
  join_ts?: Iso8601DateTime;
  mode?: SettlementMode;
  /** Populated only when mode = "stream"; null otherwise. */
  stream?: OrderLineStream | null;
  /** Populated only when mode = "usage_epoch"; null otherwise. */
  usage?: OrderLineUsage | null;
  state?: OrderLineState;
}

/* --- Pool ------------------------------------------------------------------------ */

export type PoolState =
  | 'FORMING'
  | 'SOFT_LOCK'
  | 'HARD_LOCK'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'STREAMING'
  | 'SETTLED'
  | 'PARTIAL'
  | 'FAILED'
  | 'DISPUTED';

export interface PoolClearing {
  tier_reached: number;
  uniform_price: UsdBaseUnits;
  cleared_qty: number;
}

export interface PoolMatchProof {
  intents_root: Bytes32;
  transcript_commit: Bytes32;
  tee_attestation: HexBytes;
}

export interface Pool {
  pool_id: Uuid;
  window_id: string;
  sku_id: string;
  offer_id: Uuid;
  state: PoolState;
  /** Revealed only at HARD_LOCK, only in-contract. */
  members: OrderLine[];
  clearing: PoolClearing;
  /** Pool keeps its original fee schedule forever. */
  fee_schedule_pinned: string;
  /** Upgrades never touch existing pools. */
  policy_version_pinned: string;
  escrow_addr: Address;
  match_proof: PoolMatchProof;
}

/* --- FulfillmentAttestation -------------------------------------------------------- */

export type FulfillmentAttestationType =
  | 'onchain_transfer'
  | 'vendor_api_zktls'
  | 'oracle_pull_quorum'
  | 'carrier_pod'
  | 'authenticity_check'
  | 'title_registry';

export interface FulfillmentAttestation {
  type: FulfillmentAttestationType;
  evidence_hash: Bytes32;
  signer_set: string[];
  /** When the attestation was made. */
  created_at: Iso8601DateTime;
  /** What point in time the attestation observed. */
  observed_at: Iso8601DateTime;
  predicate_result: boolean;
}

/* --- Settlement --------------------------------------------------------------------- */

export interface SettlementFees {
  supplier_bps_paid: number;
  buyer_bps_paid: number;
  verification_flat: UsdBaseUnits;
}

export interface Settlement {
  settlement_id: Uuid;
  pool_id: Uuid;
  per_unit: OrderLine[];
  fees: SettlementFees;
  attestations: FulfillmentAttestation[];
}

/* --- Dispute ------------------------------------------------------------------------- */

/**
 * Enumerated codes only; free-text is inadmissible by contract (§6.4). This closed set is
 * an implementation-level enumeration of failure modes named across §6.2-6.4; the plan
 * mandates enumeration but does not itself spell out literal code strings.
 */
export type DisputeReasonCode =
  | 'NON_DELIVERY'
  | 'LATE_DELIVERY'
  | 'NOT_AS_DESCRIBED'
  | 'ENTITLEMENT_INACTIVE'
  | 'FUNCTIONAL_TEST_FAILED'
  | 'DUPLICATE_ENTITLEMENT'
  | 'REFERENCE_PRICE_FALSIFIED'
  | 'AUTHENTICITY_FAILURE'
  | 'TITLE_TRANSFER_FAILURE'
  | 'OTHER_MACHINE_EVIDENCE';

export type DisputeOutcome = 'UPHELD' | 'REJECTED';

export interface DisputeUnitRef {
  buyer_principal_hash: Bytes32;
}

export interface DisputePanel {
  /** 3 independent, staked, KYB'd operators from different organizations. */
  members: string[];
  ruling: DisputeOutcome;
  ruling_predicate_trace: string;
}

export interface DisputeAppeal {
  /** 5-of-7 fresh operators. */
  members: string[];
  bond_2x: boolean;
  final: true;
}

export interface DisputeSlash {
  target_principal_id: Uuid;
  amount: UsdBaseUnits;
  reason?: string;
}

export interface Dispute {
  dispute_id: Uuid;
  settlement_id: Uuid;
  unit_refs: DisputeUnitRef[];
  /** Revealed only post-ruling (§6.7). */
  challenger_principal_id: Uuid;
  bond: UsdBaseUnits;
  reason_code: DisputeReasonCode;
  evidence: Bytes32[];
  encrypted_evidence_ref: string;
  panel: DisputePanel | null;
  appeal: DisputeAppeal | null;
  outcome: DisputeOutcome;
  slashes: DisputeSlash[];
}

/* --- ReputationAttestation -------------------------------------------------------------- */

export type ReputationSchema =
  | 'settled_volume'
  | 'counterparty_count'
  | 'dispute_outcome'
  | 'slash_event'
  | 'offer_integrity';

export interface ReputationAttestation {
  subject: Uuid;
  schema: ReputationSchema;
  /** Reputation attestations may only be minted by the canonical SettlementContract. */
  minted_by: 'SettlementContract';
  uid?: Bytes32;
  chain?: 'base-sepolia' | 'base';
  attested_at?: Iso8601DateTime;
  data?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------
 * Schema file index
 * ---------------------------------------------------------------------- */

/**
 * Paths (relative to the package root) of every JSON Schema in this repository,
 * in §5.1 entity order plus the shared OrderLine sub-schema.
 */
export const SCHEMA_FILES = [
  'schemas/principal.schema.json',
  'schemas/agent-registration.schema.json',
  'schemas/canonical-sku.schema.json',
  'schemas/standing-offer.schema.json',
  'schemas/purchase-intent.schema.json',
  'schemas/order-line.schema.json',
  'schemas/pool.schema.json',
  'schemas/settlement.schema.json',
  'schemas/fulfillment-attestation.schema.json',
  'schemas/dispute.schema.json',
  'schemas/reputation-attestation.schema.json',
] as const;

export type SchemaFile = (typeof SCHEMA_FILES)[number];
