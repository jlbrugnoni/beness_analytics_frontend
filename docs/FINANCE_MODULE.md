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

Current stage: Phases 0–2 and Phases 3.1–3.2 accepted (D-051, 2026-10-25).
Phase 3.3.1 Alegra source previews accepted (D-056). Phase 3.3.2 sales posting,
cancellation/replacement review, manual assignments and undo are implemented;
client acceptance pending. See backend PHASE_3_3_2_DELIVERY.md.
Q-014 answered (D-057–058): Anulada confirmed; cancellation may keep payment.
Q-013 answered (D-052–055). See backend
PHASE_3_3_1_DELIVERY.md for implementation, limits and client test steps.
See backend PHASE_3_2_DELIVERY.md for current behavior, tests and client steps.
Q-012 yes/yes is recorded in D-049–050. Source corrections require approval;
undo authority and all protected-record/account/privacy safeguards are enforced.

Configuration includes companies/accounts/terminals/categories, exact source
aliases and fee/timing/tax settings. Mapping and policy previews alone create no
financial records. Bank previews retain original sources; separate posting/review
and undo actions now create or reverse financial bank movements with history.
Alegra sales previews group invoices/items; separate posting actions record sales
and reviewed cancellations. Manual studio/channel decisions and no-refund or
replacement treatment preserve source facts and history. Expense classification,
reconciliation, calculated balances and monthly results remain future work. Spain aliases and exact Caixa commercial
terms remain unguessed. Completed-month pilot approach is accepted; exact month
will be chosen during migration preparation.

Dedicated synthetic Posting QA account supports review tests. Existing uploaded
QA previews are retained. Current branch in both repositories:
feature/finance-phase-2. No finance push, merge or production deployment.

Use the same phase branch name in both repositories. Delivery handoffs contain
What I did and What you should test, with client acceptance recorded separately
from implementation and automated checks. New financial UI must enforce display
scopes while relying on authoritative backend authorization.
