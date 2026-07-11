import { describe, expect, it } from 'vitest';
import { REPO, scaffoldGreeting } from '../src/index.js';

describe('scaffold', () => {
  it('exposes the repo identifier', () => {
    expect(REPO).toBe('caravan-protocol-spec');
  });

  it('scaffoldGreeting returns a deterministic greeting', () => {
    expect(scaffoldGreeting('world')).toBe('Hello from caravan-protocol-spec, world');
  });
});
