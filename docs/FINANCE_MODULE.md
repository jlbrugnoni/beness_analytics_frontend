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

Current stage: Phase 1 accepted; Phase 2.1 accounts/terminals implemented and
validated, client review pending. Financial configuration UI supports audited
company/account/terminal edits, reference opening balance and statement expectation.
See backend docs/finance/PHASE_2_1_DELIVERY.md for scope and client tests, and
INITIAL_CONFIGURATION.md for the supplied DR terminal/rate/savings definitions.
Categories, fee/tax rules, imports, calculated balances and results are later work.
Current branch in both repositories: feature/finance-phase-2.

Use the same phase branch name in both repositories. Delivery handoffs contain
What I did and What you should test, with client acceptance recorded separately
from implementation and automated checks. New financial UI must enforce display
scopes while relying on authoritative backend authorization.
