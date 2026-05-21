/**
 * Composition root — the ONLY module that constructs concrete adapters
 * (src/adapters/*) and wires them into the contexts. Everything else depends on
 * interfaces in src/contracts and receives its dependencies by injection. This
 * boundary is enforced by .dependency-cruiser.cjs (see docs/architecture.md §5).
 *
 * Stub until build step 2 (the Postgres storage adapter) lands — see
 * docs/architecture.md §9.
 */
export {};
