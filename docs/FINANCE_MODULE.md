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

Current stage: Phase 2.3 accepted (D-039); Phase 2.4 accepted (D-042); Phase 3 import discovery underway. Q-009 is answered (D-037–038). Financial configuration
supports source aliases and a test area for studio/channel interpretation and
manual precedence. See backend PHASE_2_3_DELIVERY.md for client steps/boundaries.
No finance reports are imported and no actual corrections saved by this preview.
Spain exact method aliases remain unguessed. Fee/date/tax configuration and a read-only calculation preview are implemented.
Financial imports, reconciliation, calculated balances and results remain later work.
Q-010 is answered (D-040–041). See backend PHASE_2_4_DELIVERY.md for checks,
client steps and exact boundaries. Approximate Caixa fee/offer terms stay notes.
See backend PHASE_3_DISCOVERY.md and Q-011 for the next delivery sequence and
pending business answers. No finance import functionality exists yet.
Current branch in both repositories: feature/finance-phase-2.

Use the same phase branch name in both repositories. Delivery handoffs contain
What I did and What you should test, with client acceptance recorded separately
from implementation and automated checks. New financial UI must enforce display
scopes while relying on authoritative backend authorization.
