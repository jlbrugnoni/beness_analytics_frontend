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

Current stage: Phase 2.2 accepted; Phase 2.3 mapping discovery in progress.
See backend PHASE_2_3_DISCOVERY.md / Q-009 for pending payment-label reliability
questions. No mapping code or new source imports are implemented yet. Q-008 is resolved (D-032–035). Financial configuration
supports audited company/account/terminal/category edits and shared starting
catalogs maintained independently by company. See backend
PHASE_2_2_DELIVERY.md for inherited privacy, boundaries and client tests.
Source/payment mappings, fee/tax rules, imports, calculated balances and results
remain later work. Current branch in both repositories: feature/finance-phase-2.

Use the same phase branch name in both repositories. Delivery handoffs contain
What I did and What you should test, with client acceptance recorded separately
from implementation and automated checks. New financial UI must enforce display
scopes while relying on authoritative backend authorization.
