# Finance module documentation

The canonical finance specification and progress are maintained in the backend
repository at `docs/finance/README.md`.

In the standard side-by-side workspace, open
[the finance handover](../../beness-analytics-backend/docs/finance/README.md).
If this frontend repository is checked out alone, open that path in the backend
repository instead.

Read the business rules, architecture, roadmap, decisions, discovery questions,
and current progress before implementing finance screens. Maintain business
definitions in the canonical folder rather than duplicating them here.

Current stage: Phase 0 accepted; Phase 1 implemented, client validation pending.
Finance landing, Settings group capability editing, user finance switches, and
effective-access explanations exist. See backend docs/finance/PHASE_1_DELIVERY.md
for setup/tests. Imports, transaction details, category CRUD and results are later
work. Current branch in both repositories: feature/finance-phase-1.

Use the same phase branch name in both repositories. Delivery handoffs contain
What I did and What you should test, with client acceptance recorded separately
from implementation and automated checks. New financial UI must enforce display
scopes while relying on authoritative backend authorization.
