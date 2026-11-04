/**
 * Sample Management — pure business logic.
 *
 * Everything in this file is side-effect free and DOM-free so it can be unit
 * tested under Node (see `scripts/verify-sample-workflow.ts`) and reused later
 * on top of real API responses.
 *
 * Quantity discipline (spec §07 / task §7) is enforced here:
 *   requested  → what the requester asked for          (Stage 1)
 *   reserved   → stock held for one request            (Stage 2, derived)
 *   issued     → physical stock-out                    (Stage 2)
 *   received   → confirmed receipt, ≤ issued           (Stage 3)
 *   returned   → verified inbound units                (Stage 5)
 *   accounted  → sum of final dispositions, = issued   (Stage 5 gate)
 * A quantity from a previous stage is never reused as a downstream quantity.
 */

import type { InventoryItem } from "@/pages/products/inventory-data"
import type {
  ClosureRecord,
  ClosureSample,
  ReceiptLine,
  RequestLine,
  ReviewCycle,
  ReviewDecision,
  SampleIssue,
  SampleRequest,
  WorkflowDocument,
} from "./types"
import { REQUEST_PRIORITIES, REQUEST_TYPES, SAMPLE_CONDITIONS } from "./types"

/* ------------------------------------------------------------------ helpers */

export const isWholeNumber = (value: number): boolean =>
  Number.isInteger(value) && value >= 0

export const clampInt = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)))

export function now(): string {
  return new Date().toISOString()
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/* -------------------------------------------------------------- id factories */

export function nextRequestId(requests: SampleRequest[]): string {
  const prefix = `MR-${new Date().getFullYear()}-`
  const last = requests.reduce((largest, request) => {
    if (!request.id.startsWith(prefix)) return largest
    const value = Number(request.id.slice(prefix.length))
    return Number.isInteger(value) ? Math.max(largest, value) : largest
  }, 0)
  return `${prefix}${String(last + 1).padStart(4, "0")}`
}

/** Sequential child ids: `MR-2026-0001-L2`, `BAG-0003`, `ISS-0003` … */
export function nextSequentialId(prefix: string, existing: string[]): string {
  const last = existing.reduce((largest, id) => {
    if (!id.startsWith(prefix)) return largest
    const value = Number(id.slice(prefix.length))
    return Number.isInteger(value) ? Math.max(largest, value) : largest
  }, 0)
  return `${prefix}${String(last + 1).padStart(4, "0")}`
}

export const requestLineId = (requestId: string, index: number): string =>
  `${requestId}-L${index + 1}`

export const bagLineId = (bagId: string, itemId: string): string => `${bagId}-${itemId}`

export const issueLineId = (issueId: string, itemId: string): string => `${issueId}-${itemId}`

export const receiptLineId = (receiptId: string, itemId: string): string =>
  `${receiptId}-${itemId}`

/* ---------------------------------------------------------- Stage 1: request */

/** Mandatory-field validation used by Save-as-Submit (spec §01 / gate 01→02). */
export function validateRequestForSubmit(request: SampleRequest): string | null {
  const missing: string[] = []
  const required: Array<[string, string]> = [
    ["Source", request.source],
    ["Project / client", request.project],
    ["Requester", request.requester],
    ["Organization", request.organization],
    ["Phone", request.phone],
    ["Purpose", request.purpose],
    ["Needed-by date", request.requiredDate],
    ["Delivery contact", request.deliveryContact],
    ["Delivery destination", request.deliveryAddress],
    ["Assigned coordinator", request.assignedCoordinator],
  ]
  required.forEach(([label, value]) => {
    if (!String(value ?? "").trim()) missing.push(label)
  })
  if (missing.length) return `Complete the required fields: ${missing.join(", ")}.`
  if (!REQUEST_TYPES.some((value) => value === request.requestType)) return "Select a valid request type."
  if (!REQUEST_PRIORITIES.some((value) => value === request.priority)) return "Select a valid request priority."
  if (!request.lines.length) return "Select at least one sample from the catalogue."
  const invalidLine = request.lines.find(
    (line) => !line.itemId || !Number.isInteger(line.quantity) || line.quantity < 1
  )
  if (invalidLine) {
    return `${invalidLine.name || "A sample line"} needs a whole-number quantity of at least 1.`
  }
  return null
}

/** Handover gate 01→02: only complete, submitted requests may be accepted. */
export function validateRequestForAccept(request: SampleRequest): string | null {
  if (request.status === "Draft") return "Save and submit the draft before accepting it."
  if (request.status === "Assigned" || request.status === "In Preparation")
    return "This request has already been accepted."
  if (request.status === "Closed") return "This request is closed."
  return validateRequestForSubmit({ ...request, status: "Submitted" })
}

/* ------------------------------------------------- Stage 2: stock allocation */

export type LineAllocation = {
  itemId: string
  /** Stage 1 requested quantity. */
  stage1Quantity: number
  /** Stage 2 fulfilment target (selectedQuantity). */
  requested: number
  /** Physically issued units across every issue for this request. */
  issued: number
  /** Units currently held for this request and not yet issued. */
  reserved: number
  /** requested − issued − reserved: awaiting incoming stock. */
  pending: number
  /** Stock left for this request after other requests' reservations. */
  available: number
  /** requested − issued: still to issue. */
  remaining: number
}

export type RequestAllocation = {
  requestId: string
  lines: Record<string, LineAllocation>
  totals: {
    stage1: number
    requested: number
    issued: number
    reserved: number
    pending: number
    received: number
    outstanding: number
  }
}

export type Allocation = Record<string, RequestAllocation>

const key = (requestId: string, itemId: string): string => `${requestId}::${itemId}`

/** Units physically issued for a request line across all issues. */
export function issuedQuantityFor(
  issues: SampleIssue[],
  requestId: string,
  itemId: string
): number {
  return issues.reduce(
    (sum, issue) =>
      issue.requestId === requestId
        ? sum + issue.lines.reduce(
            (lineSum, line) => (line.itemId === itemId ? lineSum + line.quantity : lineSum),
            0
          )
        : sum,
    0
  )
}

/** Demand a request still wants to fulfil. Pending-cancelled requests only re-issue what is already out. */
function demandFor(request: SampleRequest, line: RequestLine, issued: number): number {
  if (request.pendingResolved) return issued
  return Math.max(0, Math.min(line.selectedQuantity, line.quantity))
}

/**
 * FIFO allocation of available stock to accepted (Assigned / In Preparation)
 * requests. Recomputed on every read so incoming stock automatically clears
 * the oldest pending demand — no refresh, no stored reservation drift.
 */
export function allocateReservations(
  requests: SampleRequest[],
  issues: SampleIssue[],
  items: InventoryItem[]
): Allocation {
  const stock = new Map(items.map((item) => [item.id, Math.max(0, item.stock)]))
  const issuedMap = new Map<string, number>()
  requests.forEach((request) => {
    request.lines.forEach((line) => {
      issuedMap.set(key(request.id, line.itemId), issuedQuantityFor(issues, request.id, line.itemId))
    })
  })

  const reservedByRequestItem = new Map<string, number>()
  const free = new Map(stock)

  // FIFO: oldest accepted request first (spec §06 "FIFO incoming allocation policy").
  const holders = requests
    .filter((request) => request.status === "Assigned" || request.status === "In Preparation")
    .slice()
    .sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
    )

  holders.forEach((request) => {
    request.lines.forEach((line) => {
      const issued = issuedMap.get(key(request.id, line.itemId)) ?? 0
      const need = Math.max(0, demandFor(request, line, issued) - issued)
      const freeStock = free.get(line.itemId) ?? 0
      const reserved = Math.min(need, freeStock)
      reservedByRequestItem.set(key(request.id, line.itemId), reserved)
      free.set(line.itemId, Math.max(0, freeStock - reserved))
    })
  })

  const allocation: Allocation = {}
  requests.forEach((request) => {
    const lines: Record<string, LineAllocation> = {}
    const totals = { stage1: 0, requested: 0, issued: 0, reserved: 0, pending: 0, received: 0, outstanding: 0 }

    request.lines.forEach((line) => {
      const issued = issuedMap.get(key(request.id, line.itemId)) ?? 0
      const demand = demandFor(request, line, issued)
      const reserved = reservedByRequestItem.get(key(request.id, line.itemId)) ?? 0
      const remaining = Math.max(0, demand - issued)
      const pending = Math.max(0, remaining - reserved)
      const heldByOthers = holders.reduce((sum, holder) => {
        if (holder.id === request.id) return sum
        return sum + (reservedByRequestItem.get(key(holder.id, line.itemId)) ?? 0)
      }, 0)
      const available = Math.max(0, (stock.get(line.itemId) ?? 0) - heldByOthers)

      lines[line.itemId] = {
        itemId: line.itemId,
        stage1Quantity: line.quantity,
        requested: demand,
        issued,
        reserved,
        pending,
        available,
        remaining,
      }
      totals.stage1 += line.quantity
      totals.requested += demand
      totals.issued += issued
      totals.reserved += reserved
      totals.pending += pending
    })

    allocation[request.id] = { requestId: request.id, lines, totals }
  })

  return allocation
}

export function lineAllocation(
  allocation: Allocation,
  requestId: string,
  itemId: string
): LineAllocation | undefined {
  return allocation[requestId]?.lines[itemId]
}

/** Quantity of an item still available to one request (stock minus other holds). */
export function availableForItem(
  allocation: Allocation,
  requestId: string,
  itemId: string
): number {
  return allocation[requestId]?.lines[itemId]?.available ?? 0
}

/* ----------------------------------------------------------- Stage 2: bags */

export function bagTotalQuantity(bagLines: { quantity: number }[]): number {
  return bagLines.reduce((sum, line) => sum + line.quantity, 0)
}

/** Units already staged in bags for a request line (across all bags). */
export function baggedQuantity(
  document: WorkflowDocument,
  requestId: string,
  itemId: string
): number {
  return document.bags.reduce(
    (sum, bag) =>
      bag.requestId === requestId
        ? sum + bag.lines.reduce(
            (lineSum, line) => (line.itemId === itemId ? lineSum + line.quantity : lineSum),
            0
          )
        : sum,
    0
  )
}

/** Units already issued from a specific bag line. */
export function issuedFromBagLine(
  issues: SampleIssue[],
  bagLine: string,
  itemId: string
): number {
  return issues.reduce(
    (sum, issue) =>
      sum + issue.lines.reduce(
        (lineSum, line) =>
          line.bagLineId === bagLine && line.itemId === itemId ? lineSum + line.quantity : lineSum,
        0
      ),
    0
  )
}

/* ----------------------------------------------------------- Stage 2: issue */

export type IssueDraftLine = { bagLineId: string; itemId: string; name: string; quantity: number }

export type IssueDraft = {
  request: SampleRequest
  bagId: string
  bagLines: { id: string; itemId: string; name: string; quantity: number }[]
  quantities: Record<string, number>
  issuedBy: string
  issuedTo: string
  conditionAtIssue: string
  returnByDate: string
  issues: SampleIssue[]
  allocation: Allocation
}

/** Only reserved units may be issued; never more than the bag or the demand. */
export function validateIssue(draft: IssueDraft): string | null {
  const { request } = draft
  if (request.status === "Draft") return "Draft requests cannot issue samples."
  if (request.status === "Submitted")
    return "Accept this request in Stage 2 before reserving or issuing stock."
  if (request.status === "Closed") return "This request is closed and is read-only."
  if (!draft.issuedBy.trim()) return "Record who issued the samples (Issued by)."
  if (!draft.issuedTo.trim()) return "Record who received the handover (Issued to)."
  if (!draft.returnByDate) return "Enter the return-by date."
  if (!SAMPLE_CONDITIONS.some((value) => value === draft.conditionAtIssue)) {
    return "Select a valid condition at issue."
  }
  if (!draft.bagLines.length) return "This bag has no sample lines to issue."

  let total = 0
  const quantitiesByItem = new Map<string, number>()
  for (const bagLine of draft.bagLines) {
    const quantity = draft.quantities[bagLine.id] ?? 0
    if (!isWholeNumber(quantity)) return `${bagLine.name}: quantity must be a whole number.`
    if (quantity === 0) continue
    const allocationLine = draft.allocation[request.id]?.lines[bagLine.itemId]
    if (!allocationLine) return `${bagLine.name}: no allocation is available for this request.`
    if (quantity > allocationLine.reserved) {
      return `${bagLine.name}: ${quantity} requested but only ${allocationLine.reserved} unit(s) are reserved. Add stock or reserve first.`
    }
    const alreadyIssued = issuedFromBagLine(
      draft.issues,
      bagLine.id,
      bagLine.itemId
    )
    if (quantity > bagLine.quantity - alreadyIssued) {
      return `${bagLine.name}: only ${bagLine.quantity - alreadyIssued} unit(s) remain unissued in this bag line.`
    }
    if (quantity > allocationLine.remaining) {
      return `${bagLine.name}: cannot exceed the ${allocationLine.remaining} unit(s) still to issue.`
    }
    quantitiesByItem.set(bagLine.itemId, (quantitiesByItem.get(bagLine.itemId) ?? 0) + quantity)
    total += quantity
  }
  for (const [itemId, quantity] of quantitiesByItem) {
    const allocationLine = draft.allocation[request.id]?.lines[itemId]
    const bagLine = draft.bagLines.find((line) => line.itemId === itemId)
    if (allocationLine && quantity > allocationLine.reserved) {
      return `${bagLine?.name ?? itemId}: total issued quantity cannot exceed the ${allocationLine.reserved} reserved unit(s).`
    }
    if (allocationLine && quantity > allocationLine.remaining) {
      return `${bagLine?.name ?? itemId}: total issued quantity cannot exceed the ${allocationLine.remaining} unit(s) still to issue.`
    }
  }
  if (total === 0) return "Enter an issued quantity greater than zero for at least one sample."
  return null
}

/* ---------------------------------------------------------- Stage 3: receipt */

export type ReceiptDraft = {
  lines: ReceiptLine[]
  status: string
  receiver: string
  receivedDate: string
  conditionAtReceipt: string
  notes: string
}

export const receiptMissing = (line: ReceiptLine): number =>
  Math.max(0, line.issuedQuantity - line.receivedQuantity)

/** Suggested receipt status from quantities: full / partial / discrepancy. */
export function suggestReceiptStatus(lines: ReceiptLine[]): "Pending" | "Full" | "Partial" | "Discrepancy" {
  const issued = lines.reduce((sum, line) => sum + line.issuedQuantity, 0)
  const received = lines.reduce((sum, line) => sum + line.receivedQuantity, 0)
  const damaged = lines.reduce((sum, line) => sum + line.damagedQuantity, 0)
  if (received === 0) return "Pending"
  if (received >= issued) return "Full"
  if (damaged > 0) return "Discrepancy"
  return "Partial"
}

/** Per-line receipt rules: received ≤ issued, damaged ≤ received, notes for exceptions. */
export function validateReceipt(draft: ReceiptDraft): string | null {
  if (!draft.receiver.trim()) return "Enter the receiver's name."
  if (!draft.receivedDate) return "Enter the received date."
  if (!draft.conditionAtReceipt) return "Select the condition at receipt."
  if (!draft.lines.length) return "This dispatch has no issued lines to receive."

  let receivedTotal = 0
  let issuedTotal = 0
  let damagedTotal = 0

  for (const line of draft.lines) {
    if (!isWholeNumber(line.receivedQuantity)) {
      return `${line.name}: received quantity must be a whole number.`
    }
    if (line.receivedQuantity > line.issuedQuantity) {
      return `${line.name}: received quantity (${line.receivedQuantity}) cannot exceed the issued quantity (${line.issuedQuantity}).`
    }
    if (!isWholeNumber(line.damagedQuantity)) {
      return `${line.name}: damaged quantity must be a whole number.`
    }
    if (line.damagedQuantity > line.receivedQuantity) {
      return `${line.name}: damaged quantity cannot exceed the received quantity.`
    }
    if ((line.damagedQuantity > 0 || receiptMissing(line) > 0) && !line.discrepancyNotes.trim()) {
      return `${line.name}: add discrepancy notes for damaged or missing units.`
    }
    receivedTotal += line.receivedQuantity
    issuedTotal += line.issuedQuantity
    damagedTotal += line.damagedQuantity
  }

  const missingTotal = Math.max(0, issuedTotal - receivedTotal)
  if (receivedTotal > issuedTotal) return "Total received quantity cannot exceed the issued quantity."

  if (draft.status === "Pending" && receivedTotal > 0) {
    return "Pending receipt requires zero received units."
  }
  if (draft.status !== "Pending" && receivedTotal === 0) {
    return "Zero received units must be recorded as Pending."
  }
  if (draft.status === "Full" && missingTotal > 0) {
    return `Full receipt requires every issued unit. ${missingTotal} unit(s) are outstanding — choose Partial or Discrepancy.`
  }
  if (draft.status === "Partial" && missingTotal === 0) {
    return "Partial receipt requires at least one outstanding unit. Choose Full when everything arrived."
  }
  if (draft.status === "Discrepancy" && damagedTotal === 0 && missingTotal === 0) {
    return "Discrepancy requires damaged or missing units. Otherwise choose Full."
  }
  if ((damagedTotal > 0 || missingTotal > 0) && !draft.notes.trim()) {
    return "Add receipt notes describing the damaged or missing samples."
  }
  if (receivedTotal === 0 && missingTotal === 0) {
    return "Enter a received quantity greater than zero."
  }
  return null
}

/* ----------------------------------------------------------- Stage 4: review */

export const latestCycle = (review?: { cycles: ReviewCycle[] }): ReviewCycle | undefined =>
  review?.cycles.length ? review.cycles[review.cycles.length - 1] : undefined

export const isFinalized = (review?: { cycles: ReviewCycle[] }): boolean => {
  const cycle = latestCycle(review)
  return Boolean(cycle && cycle.status === "Finalized" && cycle.finalApproval !== "Pending")
}

/**
 * Units of a receipt line that are still waiting for a review decision.
 * A receipt line is covered by at most one review record (dispatch + item), so
 * the line is either fully review-ready or already under review.
 */
export function reviewReadyQuantity(
  reviews: { itemId: string; cycles: ReviewCycle[] }[],
  itemId: string,
  receivedQuantity: number
): number {
  const record = reviews.find((review) => review.itemId === itemId)
  if (record && !isFinalized(record)) return 0
  return receivedQuantity
}

export type CycleDraft = {
  reviewer: string
  reviewerRole: string
  reviewDate: string
  nextReviewDate?: string
  dueDate: string
  decision: ReviewDecision | ""
  comments: string
  feedback: string
  followUp: string
  returnInstruction: string
}

/** Stage 4 validation: decisions, deferred dates, mandatory comments. */
export function validateReviewCycle(draft: CycleDraft): string | null {
  if (!draft.reviewer.trim()) return "Select a reviewer. The requester is the default reviewer."
  if (!draft.dueDate) return "Enter the review due date."
  if (!draft.decision) return "Select a review decision."
  if (draft.decision === "Deferred" && !draft.nextReviewDate) {
    return "A deferred review requires the next review date."
  }
  if (draft.decision === "Rejected" && !draft.comments.trim()) {
    return "Add reviewer comments explaining the rejection."
  }
  if (draft.decision === "Revision Required" && !draft.feedback.trim()) {
    return "Describe the required revision in Required Changes."
  }
  if (draft.decision === "Approved with Comments" && !draft.comments.trim()) {
    return "Add the comments that accompany this approval."
  }
  return null
}

export type FinalDraft = {
  finalApproval: string
  decisionDate: string
  approvedBy: string
  coordinator: string
  finalComments: string
  decision: ReviewDecision | ""
}

/** Final approval is recorded separately from the review decision (spec §04). */
export function validateFinalApproval(draft: FinalDraft): string | null {
  if (!draft.decision) return "Record a review decision before the final approval."
  if (!draft.finalApproval) return "Select a final approval status."
  if (draft.finalApproval !== "Not Required" && !draft.decisionDate) {
    return "Enter the date for the final decision."
  }
  if (draft.finalApproval !== "Not Required" && !draft.approvedBy.trim()) {
    return "Record the authorised decision maker."
  }
  if (!draft.coordinator.trim()) return "Select the next responsible coordinator."
  if (
    (draft.finalApproval === "Rejected" || draft.finalApproval === "Changes Required") &&
    !draft.finalComments.trim()
  ) {
    return "Add comments explaining the final decision."
  }
  return null
}

/* ----------------------------------------------------------- Stage 5: closure */

export type ClosureContext = {
  request: SampleRequest
  record: ClosureRecord
  document: WorkflowDocument
  allocation: Allocation
}

/** Aggregates issued / received quantities per sample for a request. */
export function closureSamples(
  request: SampleRequest,
  document: WorkflowDocument
): ClosureSample[] {
  return request.lines.map((line) => {
    const issued = issuedQuantityFor(document.issues, request.id, line.itemId)
    const received = document.receipts
      .filter((receipt) => receipt.requestId === request.id)
      .reduce(
        (sum, receipt) =>
          sum + receipt.lines.reduce(
            (lineSum, receiptLine) =>
              receiptLine.itemId === line.itemId ? lineSum + receiptLine.receivedQuantity : lineSum,
            0
          ),
        0
      )
    const reviews = document.reviews.filter(
      (review) => review.requestId === request.id && review.itemId === line.itemId
    )
    const cycle = latestCycle(reviews[0])
    const reviewSummary = reviews.length
      ? `${cycle?.decision ?? "Awaiting decision"}${cycle?.finalApproval ? ` · ${cycle.finalApproval}` : ""}`
      : issued > 0 && received === 0
        ? "Not received — no review required"
        : "Not reviewed yet"

    return {
      itemId: line.itemId,
      name: line.name,
      code: line.code,
      issuedQuantity: issued,
      receivedQuantity: received,
      reviewSummary,
      returnRequired: true,
      expectedReturnDate: "",
      actualReturnDate: "",
      returnedQuantity: 0,
      receivedBackQuantity: 0,
      conditionAtReturn: "",
      verifiedBy: "",
      inspectionNotes: "",
      stockedQuantity: 0,
      quarantinedQuantity: 0,
      dispositions: [],
    }
  })
}

export function dispositionTotal(sample: ClosureSample): number {
  return sample.dispositions.reduce((sum, entry) => sum + (entry.quantity || 0), 0)
}

export function closureTotals(record: ClosureRecord) {
  return record.samples.reduce(
    (totals, sample) => {
      const accounted = dispositionTotal(sample)
      totals.issued += sample.issuedQuantity
      totals.received += sample.receivedQuantity
      totals.returned += sample.receivedBackQuantity
      totals.accounted += accounted
      totals.outstanding += Math.max(0, sample.issuedQuantity - accounted)
      totals.quarantined += sample.quarantinedQuantity
      return totals
    },
    { issued: 0, received: 0, returned: 0, accounted: 0, outstanding: 0, quarantined: 0 }
  )
}

export type BlockerCheck = { blockers: string[]; unissuedPending: number; cancelled: number }

/**
 * Closure gate (spec §08 "05 → Closed"):
 *  - every issued unit has exactly one final disposition
 *  - verified returns reconcile with the "Returned" disposition
 *  - damaged returns sit in quarantine, not available stock
 *  - reviews finalized where units were actually received
 *  - unissued pending demand cancelled or resolved
 */
export function closureBlockers(context: ClosureContext): BlockerCheck {
  const { request, record, document, allocation } = context
  const blockers: string[] = []

  const issuedByLine = new Map(
    request.lines.map((line) => [
      line.itemId,
      allocation[request.id]?.lines[line.itemId]?.issued ?? 0,
    ])
  )
  const unissuedPending = request.lines.reduce((sum, line) => {
    const issued = issuedByLine.get(line.itemId) ?? 0
    return sum + Math.max(0, (allocation[request.id]?.lines[line.itemId]?.requested ?? 0) - issued)
  }, 0)

  if (unissuedPending > 0 && !request.pendingResolved) {
    blockers.push(
      `${unissuedPending} requested unit(s) were never issued. Cancel the unissued pending demand before closing.`
    )
  }

  record.samples.forEach((sample) => {
    const issued = issuedByLine.get(sample.itemId) ?? sample.issuedQuantity
    const accounted = dispositionTotal(sample)

    if (issued === 0) return

    if (accounted > issued) {
      blockers.push(`${sample.name}: dispositions (${accounted}) exceed the issued quantity (${issued}).`)
      return
    }
    if (accounted < issued) {
      blockers.push(`${sample.name}: ${issued - accounted} issued unit(s) still have no final disposition.`)
    }

    const incomplete = sample.dispositions.find(
      (entry) => !entry.type || !Number.isInteger(entry.quantity) || entry.quantity < 1
    )
    if (incomplete && accounted === issued) {
      blockers.push(`${sample.name}: every disposition needs a type and a quantity of at least 1.`)
    }

    const returnedDisposition = sample.dispositions
      .filter((entry) => entry.type === "Returned")
      .reduce((sum, entry) => sum + entry.quantity, 0)
    const damagedDisposition = sample.dispositions
      .filter((entry) => entry.type === "Damaged")
      .reduce((sum, entry) => sum + entry.quantity, 0)
    if (sample.conditionAtReturn === "Good" && returnedDisposition !== sample.receivedBackQuantity) {
      blockers.push(
        `${sample.name}: "Returned" disposition (${returnedDisposition}) must equal the verified return quantity (${sample.receivedBackQuantity}).`
      )
    }
    if (
      (sample.conditionAtReturn === "Damaged" || sample.conditionAtReturn === "Unusable") &&
      damagedDisposition !== sample.receivedBackQuantity
    ) {
      blockers.push(
        `${sample.name}: "Damaged" disposition (${damagedDisposition}) must equal the verified damaged return quantity (${sample.receivedBackQuantity}).`
      )
    }
    if (!sample.returnRequired && (sample.returnedQuantity > 0 || sample.receivedBackQuantity > 0)) {
      blockers.push(`${sample.name}: return quantities are recorded even though no return was required.`)
    }
    if (sample.receivedBackQuantity > sample.returnedQuantity) {
      blockers.push(`${sample.name}: verified return quantity exceeds the planned returned quantity.`)
    }

    const missingApproval = sample.dispositions.find(
      (entry) =>
        (entry.type === "Retained" || entry.type === "Lost") &&
        !entry.approvedBy.trim()
    )
    if (missingApproval) {
      blockers.push(`${sample.name}: "${missingApproval.type}" requires an authorised approval name.`)
    }

    if (sample.returnRequired && sample.returnedQuantity > 0 && sample.receivedBackQuantity === 0) {
      blockers.push(`${sample.name}: a return of ${sample.returnedQuantity} unit(s) is expected but has not been verified.`)
    }
    if (
      sample.receivedBackQuantity > 0 &&
      (!sample.verifiedAt || !sample.verifiedBy.trim() || !sample.conditionAtReturn)
    ) {
      blockers.push(`${sample.name}: verify the physical return (date, verifier, condition) before closing.`)
    }

    // Every received unit must carry a finalized Stage 4 decision.
    const reviews = document.reviews.filter(
      (review) => review.requestId === request.id && review.itemId === sample.itemId
    )
    if (sample.receivedQuantity > 0) {
      const reviewedQuantity = reviews.reduce((sum, review) => sum + review.receivedQuantity, 0)
      if (!reviews.length || reviews.some((review) => !isFinalized(review)) || reviewedQuantity !== sample.receivedQuantity) {
        blockers.push(`${sample.name}: Stage 4 review is not finalized for all received units.`)
      }
    }
  })

  if (request.status === "Draft" || request.status === "Submitted") {
    blockers.push("Accept the request in Stage 2 before closing it.")
  }
  if (!record.closedBy.trim()) blockers.push("Enter who is closing the request (Closed By).")
  if (!record.closureDate) blockers.push("Enter the closure date.")

  return {
    blockers: [...new Set(blockers)],
    unissuedPending,
    cancelled: request.pendingResolved ? unissuedPending : 0,
  }
}

export function isReadyToClose(context: ClosureContext): boolean {
  return closureBlockers(context).blockers.length === 0
}

/* ------------------------------------------- Stage 5: stock-in computation */

export type ReturnStocking = {
  /** Units to add to available stock (verified good-condition returns only). */
  stockDelta: number
  /** Units parked in quarantine — never made available. */
  quarantineDelta: number
  /** Unique key `${requestId}:${itemId}:${condition}:${qty}` prevents double posting. */
  adjustmentId: string
  error: string | null
}

/**
 * Computes the inventory effect of verifying a return:
 *  - Good → available stock
 *  - Damaged / Unusable → quarantine (no available-stock change)
 * The delta is relative to what has already been applied for this sample, so
 * re-verifying the same quantity can never add stock twice (task §5).
 */
export function planReturnStocking(sample: ClosureSample, requestId: string): ReturnStocking {
  const quantity = sample.receivedBackQuantity
  const failure = (error: string): ReturnStocking => ({
    stockDelta: 0,
    quarantineDelta: 0,
    adjustmentId: "",
    error,
  })

  if (!sample.conditionAtReturn) return failure("Select the condition at return.")
  if (!Number.isInteger(quantity) || quantity < 0)
    return failure("Received-back quantity must be a whole number.")
  if (quantity > sample.returnedQuantity) {
    return failure("Received-back quantity cannot exceed the returned quantity.")
  }
  if (quantity > sample.issuedQuantity) {
    return failure("Received-back quantity cannot exceed the issued quantity.")
  }

  const good = sample.conditionAtReturn === "Good"
  const applied = good ? sample.stockedQuantity : sample.quarantinedQuantity
  const delta = quantity - applied
  if (delta < 0) {
    return failure("The received-back quantity cannot be reduced below the quantity already applied.")
  }

  return {
    stockDelta: good ? delta : 0,
    quarantineDelta: good ? 0 : delta,
    adjustmentId: `${requestId}:${sample.itemId}:${sample.conditionAtReturn}:${quantity}`,
    error: null,
  }
}

/* ------------------------------------------------------- cross-stage rollups */

export type StageProgress = {
  stage: 1 | 2 | 3 | 4 | 5
  label: string
  issued: number
  requested: number
  received: number
  reviewed: number
  outstanding: number
}

/**
 * Request-level rollup (spec §07): derived from line/bag/dispatch progress so a
 * partially completed request never shows a misleading single success state.
 */
export function requestProgress(
  request: SampleRequest,
  document: WorkflowDocument,
  allocation: Allocation
): StageProgress {
  const totals = allocation[request.id]?.totals
  const requested = totals?.requested ?? request.quantity
  const issued = totals?.issued ?? 0

  const receipts = document.receipts.filter((receipt) => receipt.requestId === request.id)
  const received = receipts.reduce(
    (sum, receipt) => sum + receipt.lines.reduce((lineSum, line) => lineSum + line.receivedQuantity, 0),
    0
  )
  const reviews = document.reviews.filter((review) => review.requestId === request.id)
  const reviewed = reviews.filter((review) => isFinalized(review)).length
  const closure = document.closures.find((entry) => entry.requestId === request.id)
  const outstanding = Math.max(0, issued - received)
  const base = { issued, requested, received, reviewed, outstanding }

  if (request.status === "Closed" || closure?.closureStatus === "Closed") {
    return { stage: 5, label: "Closed", ...base }
  }
  if (request.status === "Draft") return { stage: 1, label: "Draft", ...base }
  if (request.status === "Submitted") {
    return { stage: 1, label: "Awaiting coordinator acceptance", ...base }
  }

  // Stage 5 is active as soon as receipts exist and everything received has a
  // finalized review — unissued demand does not move the request backwards.
  if (receipts.length > 0 && outstanding === 0) {
    const receivedLines = receipts.flatMap((receipt) =>
      receipt.lines.filter((line) => line.receivedQuantity > 0)
    )
    const finalized = receivedLines.filter((line) =>
      reviews.some((review) => review.itemId === line.itemId && isFinalized(review))
    ).length
    if (receivedLines.length > 0 && finalized === receivedLines.length) {
      if (closure) {
        const closureTotals5 = closureTotals(closure)
        return {
          stage: 5,
          label: closureTotals5.outstanding > 0
            ? `Returns pending · ${closureTotals5.outstanding} unit(s) unaccounted`
            : closureBlockers({ request, record: closure, document, allocation }).blockers.length > 0
              ? "Reconciliation blocked"
              : "Ready to reconcile & close",
          ...base,
        }
      }
      return { stage: 5, label: "Awaiting return reconciliation", ...base }
    }
    return {
      stage: 4,
      label: `In review · ${finalized}/${receivedLines.length} line(s) finalized`,
      ...base,
    }
  }

  if (receipts.length > 0) {
    return { stage: 3, label: `Partially received · ${received}/${issued}`, ...base }
  }
  if (issued > 0) {
    return { stage: 3, label: "Awaiting dispatch receipt", ...base }
  }
  if (issued < requested && !request.pendingResolved) {
    const reserved = totals?.reserved ?? 0
    const pending = totals?.pending ?? 0
    if (pending > 0) {
      return { stage: 2, label: `Partially reserved · ${pending} unit(s) awaiting stock`, ...base }
    }
    if (reserved > 0) return { stage: 2, label: "Reserved · ready to issue", ...base }
    return { stage: 2, label: "Awaiting stock reservation", ...base }
  }
  return { stage: 2, label: "Fully reserved · ready to issue", ...base }
}

/* -------------------------------------------------------- legacy projections */

export type IssuedReportEntry = {
  id: string
  organization: string
  project: string
  assignedTo: string
  requiredDate: string
  returnBy: string
  issuedQuantity: number
  dispatchStatus: string
  receiptStatus: string
  closed: boolean
  samples: Array<{ code: string; name: string; category: string; issuedQuantity: number }>
  stage2DispatchId: string
}

/**
 * Derived projection written to `archscale.samples.requests` so the existing
 * Products → Issued report keeps working from the same source of truth.
 */
export function buildIssuedReportProjection(document: WorkflowDocument): IssuedReportEntry[] {
  return document.requests
    .filter((request) =>
      document.issues.some((issue) => issue.requestId === request.id)
    )
    .map((request) => {
      const issues = document.issues.filter((issue) => issue.requestId === request.id)
      const dispatches = document.dispatches.filter((dispatch) => dispatch.requestId === request.id)
      const receipts = document.receipts.filter((receipt) => receipt.requestId === request.id)
      const samples = new Map<string, { code: string; name: string; category: string; issuedQuantity: number }>()
      issues.forEach((issue) =>
        issue.lines.forEach((line) => {
          const existing = samples.get(line.itemId)
          const category =
            request.lines.find((entry) => entry.itemId === line.itemId)?.category ?? ""
          samples.set(line.itemId, {
            code: line.code,
            name: line.name,
            category,
            issuedQuantity: (existing?.issuedQuantity ?? 0) + line.quantity,
          })
        })
      )
      const returnBy = issues.map((issue) => issue.returnByDate).filter(Boolean).sort().at(-1) ?? ""
      return {
        id: request.id,
        organization: request.organization,
        project: request.project,
        assignedTo: request.assignedCoordinator,
        requiredDate: request.requiredDate,
        returnBy,
        issuedQuantity: [...samples.values()].reduce((sum, sample) => sum + sample.issuedQuantity, 0),
        dispatchStatus: dispatches.some((dispatch) => dispatch.status === "In Transit" || dispatch.status === "Delivered")
          ? "In transit"
          : dispatches.some((dispatch) => dispatch.status === "Receipt Confirmed")
            ? "Delivered"
            : "Pending",
        receiptStatus: receipts.length ? "Received" : "Pending",
        closed: request.status === "Closed",
        samples: [...samples.values()],
        stage2DispatchId: dispatches[0]?.id ?? "",
      }
    })
}

/* ------------------------------------------------------------------ formatting */

export function formatDateTime(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date)
}
