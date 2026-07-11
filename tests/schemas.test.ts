import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'schemas');
const FIXTURE_DIR = path.join(ROOT, 'fixtures');

interface SchemaCase {
  /** Human-readable entity name (§5.1), also the shared basename of the schema/fixture files. */
  entity: string;
  schemaFile: string;
  fixtureFile: string;
  /** A top-level required property whose removal must fail validation (negative test). */
  requiredFieldToDrop: string;
}

// One case per file in schemas/*.schema.json: the ten §5.1 entities plus the shared
// OrderLine $defs sub-schema (order-line.schema.json), which is independently
// instantiable and therefore gets the same positive/negative treatment as every
// other schema in this repository.
const CASES: SchemaCase[] = [
  { entity: 'principal', schemaFile: 'principal.schema.json', fixtureFile: 'principal.json', requiredFieldToDrop: 'standing' },
  {
    entity: 'agent-registration',
    schemaFile: 'agent-registration.schema.json',
    fixtureFile: 'agent-registration.json',
    requiredFieldToDrop: 'principal_id',
  },
  {
    entity: 'canonical-sku',
    schemaFile: 'canonical-sku.schema.json',
    fixtureFile: 'canonical-sku.json',
    requiredFieldToDrop: 'vfm_class',
  },
  {
    entity: 'standing-offer',
    schemaFile: 'standing-offer.schema.json',
    fixtureFile: 'standing-offer.json',
    requiredFieldToDrop: 'tier_curve',
  },
  {
    entity: 'purchase-intent',
    schemaFile: 'purchase-intent.schema.json',
    fixtureFile: 'purchase-intent.json',
    requiredFieldToDrop: 'price_ceiling',
  },
  { entity: 'order-line', schemaFile: 'order-line.schema.json', fixtureFile: 'order-line.json', requiredFieldToDrop: 'qty' },
  { entity: 'pool', schemaFile: 'pool.schema.json', fixtureFile: 'pool.json', requiredFieldToDrop: 'escrow_addr' },
  { entity: 'settlement', schemaFile: 'settlement.schema.json', fixtureFile: 'settlement.json', requiredFieldToDrop: 'fees' },
  {
    entity: 'fulfillment-attestation',
    schemaFile: 'fulfillment-attestation.schema.json',
    fixtureFile: 'fulfillment-attestation.json',
    requiredFieldToDrop: 'predicate_result',
  },
  { entity: 'dispute', schemaFile: 'dispute.schema.json', fixtureFile: 'dispute.json', requiredFieldToDrop: 'outcome' },
  {
    entity: 'reputation-attestation',
    schemaFile: 'reputation-attestation.schema.json',
    fixtureFile: 'reputation-attestation.json',
    requiredFieldToDrop: 'minted_by',
  },
];

function loadJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

const schemaFileNames = readdirSync(SCHEMA_DIR)
  .filter((fileName) => fileName.endsWith('.schema.json'))
  .sort();

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// Register every schema by its $id up front so cross-file $ref (Pool.members and
// Settlement.per_unit -> order-line.schema.json#/$defs/OrderLine; Settlement.attestations
// -> fulfillment-attestation.schema.json) resolves correctly.
for (const fileName of schemaFileNames) {
  const schema = loadJson(path.join(SCHEMA_DIR, fileName));
  ajv.addSchema(schema, schema.$id as string);
}

function getValidator(schemaId: string): ValidateFunction {
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    throw new Error(`No compiled validator registered for schema $id "${schemaId}"`);
  }
  return validate;
}

describe('schemas/*.schema.json (JSON Schema draft 2020-12, Ajv2020)', () => {
  it('the schemas/ directory contains exactly the expected schema files', () => {
    expect(schemaFileNames).toEqual([...CASES.map((c) => c.schemaFile)].sort());
  });

  for (const testCase of CASES) {
    describe(testCase.entity, () => {
      const schema = loadJson(path.join(SCHEMA_DIR, testCase.schemaFile));
      const schemaId = schema.$id as string;

      it('compiles under Ajv2020', () => {
        expect(() => getValidator(schemaId)).not.toThrow();
      });

      it('its fixture validates', () => {
        const validate = getValidator(schemaId);
        const fixture = loadJson(path.join(FIXTURE_DIR, testCase.fixtureFile));

        const valid = validate(fixture);

        expect(valid, `${testCase.entity} fixture errors: ${JSON.stringify(validate.errors, null, 2)}`).toBe(true);
      });

      it(`fails when required field "${testCase.requiredFieldToDrop}" is removed`, () => {
        const validate = getValidator(schemaId);
        const fixture = loadJson(path.join(FIXTURE_DIR, testCase.fixtureFile));
        expect(testCase.requiredFieldToDrop in fixture).toBe(true);
        delete fixture[testCase.requiredFieldToDrop];

        const valid = validate(fixture);

        expect(valid).toBe(false);
      });
    });
  }
});
