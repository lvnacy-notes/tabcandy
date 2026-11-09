# Tab Candy — Advanced Roadmap

Features deliberately deferred during v2.0 (Tab Identity & Grouping) spec work: real build cost, no evidenced demand at time of writing. Not rejected — offloaded. Revisit only if real user demand shows up; until then, building either of these is pure speculative cost with no return.

## Custom Mapping Logic

Explicit, per-file correspondence between two paired Clusters' members, replacing v2.0's index-based positional pairing (member *N* ↔ member *N*).

- [ ] Needs its own data structure — a per-file mapping, not just a Cluster-to-Cluster relationship (`pairedWith`).
- [ ] Needs its own creation/management UI — nothing in v2.0 builds a correspondence-picking interface.
- [ ] Needs its own lifecycle — what happens to a mapping entry when a member is removed, added, or resolved (v2.0's missing-member modal) has to be answered fresh; v2.0's `members`-level handling doesn't cover it.

Extension path already open: `pairedWith` doesn't need to change if this gets built later. An explicit mapping structure would sit alongside it, used instead of positional logic when present — additive, not a redesign.

## Multiple Cluster Pairings

Allowing a Cluster to be paired with more than one Cluster at once, rather than v2.0's strict 1:1 (`pairedWith: string | null`).

- [ ] Schema change itself is trivial — `pairedWith: string | null` → `string[]`, same pattern `members` already uses.
- [ ] The real cost is sync propagation, not the schema. Two paired Clusters are an isolated pair; more than two makes them a graph, where mirroring an operation (reorder/open/close/remove) risks cascading through cycles or chains unless propagation is bounded — graph-traversal-safe cascade prevention, not a loop over an array.
- [ ] No evidenced demand at time of writing — the forum request driving Cluster-to-Cluster Pairing describes syncing with "the related group" (singular), and the request driving the reading-view companion wants one companion, not several. Nothing in the original request log asks for a Cluster linked to more than one thing.

Extension path already open: v2.0's sync-propagation guard is deliberately written as "don't cascade past whatever's directly paired," not relying on there being exactly two nodes — upgrading to `string[]` later needs no rework of that safety logic.