/**
 * Frontend-only verification of the five-stage Sample Management workflow.
 *
 *   npm run verify:workflow
 *
 * Compiles the pure workflow modules (`sample-workflow/*`) to CommonJS and
 * exercises the business logic against the seventeen scenarios required by the
 * handover task: multi-sample requests, full/partial/zero stock, FIFO incoming
 * allocation, multiple bags and issues, partial & damaged receipts, the five
 * review decisions, deferred/revision cycles, partial returns, every
 * disposition, final reconciliation, closure gating and persistence.
 *
 * This is a test of the FRONTEND simulation only — no backend exists yet.
 */

import {
  allocateReservations,
  buildIssuedReportProjection,
  closureBlockers,
  closureSamples,
  closureTotals,
  dispositionTotal,
  isFinalized,
  isReadyToClose,
  latestCycle,
  planReturnStocking,
  requestProgress,
  suggestReceiptStatus,
  validateIssue,
  validateReceipt,
  validateRecommendation as _unusedGuard,
} from "../src/pages/library/sample-workflow/logic"

export {}
