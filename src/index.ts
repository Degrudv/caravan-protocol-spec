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
