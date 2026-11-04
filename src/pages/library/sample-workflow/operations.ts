/**
 * Sample Management — workflow operations (pure document mutations).
 *
 * Every state change of the five stages goes through one of these functions.
 * They are pure: `(document, input) → { document, error }`, no storage, no DOM.
 * The UI layer only pairs them with `commitWorkflow` / `commitWithInventory`.
 *
 * This is the seam for future backend integration: each operation maps 1:1 to a
 * future REST call (`POST /requests/{id}/submit`, `POST /issues`, …). Swapping
 * the body of an operation for `fetch(...)` will not touch any component.
 *
 * Quantity discipline is enforced here:
 *   requested (Stage 1) → reserved (derived) → issued (Stage 2)
 *   → received (Stage 3, ≤ issued) → reviewed (Stage 4) → accounted (Stage 5).
 */

import type { InventoryItem } from "@/pages/products/inventory-data"
import type {
  Assignment,
  ClosureRecord,
  ClosureSample,
  Disposition,
  DispositionType,
  DispatchStatus,
  HistoryEntry,
  IssueLine,
  ReceiptLine,
  RequestLine,
  ReviewCycle,
  ReviewDecision,
  ReviewFollowUp,
  ReviewerRole,
  ReturnInstruction,
  ReturnCondition,
  SampleBag,
  SampleCondition,
  SampleDispatch,
  SampleIssue,
  SampleReceipt,
  SampleRequest,
  WorkflowDocument,
} from "./types"
import {
  bagLineId,
  baggedQuantity,
  closureBlockers,
  closureSamples,
  isFinalized,
  isWholeNumber,
  issueLineId,
  issuedQuantityFor,
  latestCycle,
  nextRequestId,
  nextSequentialId,
  now,
  planReturnStocking,
  receiptLineId,
  requestLineId,
  suggestReceiptStatus,
  validateIssue,
  validateReceipt,
  validateRequestForAccept,
  validateRequestForSubmit,
  validateReviewCycle,
  validateFinalApproval,
  type Allocation,
} from "./logic"
import { allocateReservations } from "./logic"

export type OpResult = { document: WorkflowDocument; error: string | null }
export type StockOpResult = { document: WorkflowDocument; items: InventoryItem[]; error: string | null }

const ok = (document: WorkflowDocument): OpResult => ({ document, error: null })
const fail = (document: WorkflowDocument, error: string): OpResult => ({ document, error })

const history = (action: string): HistoryEntry => ({ action, at: now() })

const replaceRequest = (
  document: WorkflowDocument,
  requestId: string,
  update: (request: SampleRequest) => SampleRequest
): WorkflowDocument => ({
  ...document,
  requests: document.requests.map((request) => (request.id === requestId ? update(request) : request)),
})

const findRequest = (document: WorkflowDocument, requestId: string): SampleRequest | undefined =>
  document.requests.find((request) => request.id === requestId)

/* ================================================================ Stage 1 */

export type RequestDraft = Partial<SampleRequest> & { lines?: RequestLine[] }

/** Creates a Draft request with fresh, consistent `MR-YYYY-000N` ids. */
export function createRequest(document: WorkflowDocument, draft: RequestDraft): OpResult {
  const id = nextRequestId(document.requests)
  const lines = (draft.lines ?? []).map((line, index) => ({
    ...line,
    id: requestLineId(id, index),
    selectedQuantity: line.selectedQuantity || line.quantity,
  }))
  const request: SampleRequest = {
    id,
    source: draft.source ?? "New Enquiry",
    requestType: draft.requestType ?? "Project sample",
    project: draft.project ?? "",
    space: draft.space ?? "",
    requester: draft.requester ?? "",
    requesterContactId: draft.requesterContactId ?? "",
    organization: draft.organization ?? "",
    phone: draft.phone ?? "",
    deliveryContact: draft.deliveryContact ?? "",
    deliveryAddress: draft.deliveryAddress ?? "",
    purpose: draft.purpose ?? "",
    priority: draft.priority ?? "Normal",
    requiredDate: draft.requiredDate ?? "",
    assignedCoordinator: draft.assignedCoordinator ?? "",
    assignment: draft.assignment ?? "Sample Coordinator",
    lines,
    sampleDetails: lines.map((line) => line.name).join(", "),
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    pendingResolved: false,
    status: "Draft",
    createdAt: now(),
    history: [history("Draft created")],
  }
  return ok({ ...document, requests: [...document.requests, request] })
}

/** Saves a Stage 1 edit (create is handled by `createRequest`). */
export function saveRequest(document: WorkflowDocument, requestId: string, draft: RequestDraft): OpResult {
  const current = findRequest(document, requestId)
  if (!current) return fail(document, "Request not found.")
  if (current.status === "Closed") return fail(document, "A closed request is read-only.")

  const editable = current.status === "Draft" || current.status === "Submitted"
  if (!editable) {
    return fail(document, "Only Draft or Submitted requests can be edited in Stage 1.")
  }

  const lines = (draft.lines ?? current.lines).map((line, index) => ({
    ...line,
    id: requestLineId(requestId, index),
    quantity: Math.max(1, Math.round(line.quantity)),
    selectedQuantity: Math.max(1, Math.round(line.selectedQuantity || line.quantity)),
  }))

  const next = replaceRequest(document, requestId, (request) => ({
    ...request,
    ...draft,
    id: requestId,
    lines,
    sampleDetails: lines.map((line) => line.name).join(", "),
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    history: [...request.history, history("Request details updated")],
  }))
  return ok(next)
}

export function deleteRequest(document: WorkflowDocument, requestId: string): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "A closed request cannot be deleted.")
  if (document.issues.some((issue) => issue.requestId === requestId)) {
    return fail(document, "This request has issued samples and cannot be deleted.")
  }
  return ok({
    ...document,
    requests: document.requests.filter((entry) => entry.id !== requestId),
    bags: document.bags.filter((bag) => bag.requestId !== requestId),
    dispatches: document.dispatches.filter((dispatch) => dispatch.requestId !== requestId),
    receipts: document.receipts.filter((receipt) => receipt.requestId !== requestId),
    reviews: document.reviews.filter((review) => review.requestId !== requestId),
    closures: document.closures.filter((closure) => closure.requestId !== requestId),
  })
}

/** Gate 01→02: Draft → Submitted (mandatory fields validated). */
export function submitRequest(document: WorkflowDocument, requestId: string): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status !== "Draft") return fail(document, "Only Draft requests can be submitted.")
  const error = validateRequestForSubmit(request)
  if (error) return fail(document, error)
  return ok(
    replaceRequest(document, requestId, (current) => ({
      ...current,
      status: "Submitted",
      submittedAt: now(),
      history: [...current.history, history(`Request submitted by ${current.requester || "requester"}`)],
    }))
  )
}

/** Coordinator accepts a Submitted request → Assigned (visible to Stage 2). */
export function acceptRequest(
  document: WorkflowDocument,
  requestId: string,
  assignment?: Assignment
): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  const error = validateRequestForAccept(request)
  if (error) return fail(document, error)
  return ok(
    replaceRequest(document, requestId, (current) => ({
      ...current,
      status: "Assigned",
      assignment: assignment ?? current.assignment,
      acceptedAt: now(),
      history: [
        ...current.history,
        history(`Accepted by ${current.assignedCoordinator || "coordinator"} (${assignment ?? current.assignment})`),
      ],
    }))
  )
}

/* ================================================================ Stage 2 */

const editableInStage2 = (request?: SampleRequest): string | null => {
  if (!request) return "Request not found."
  if (request.status === "Draft") return "Draft requests are not visible to Stage 2. Submit the request first."
  if (request.status === "Submitted") return "Accept this request in Stage 2 before reserving or issuing stock."
  if (request.status === "Closed") return "This request is closed and is read-only."
  return null
}

export type BagDraft = {
  requestId: string
  name: string
  stockLocation: string
  lines: Array<{ itemId: string; quantity: number }>
}

/** Adds a Sample Bag without staging units that are not currently reserved. */
export function addBag(document: WorkflowDocument, draft: BagDraft, items: InventoryItem[]): OpResult {
  const request = findRequest(document, draft.requestId)
  const blocked = editableInStage2(request)
  if (blocked || !request) return fail(document, blocked ?? "Request not found.")
  if (!draft.name.trim()) return fail(document, "Enter a bag name.")
  if (!draft.lines.length) return fail(document, "Add at least one sample line to the bag.")
  const allocation = allocateReservations(document.requests, document.issues, items)[request.id]

  const requestedByItem = new Map<string, number>()
  for (const entry of draft.lines) {
    if (!isWholeNumber(entry.quantity) || entry.quantity < 1) {
      return fail(document, "Bag quantities must be whole numbers of at least 1.")
    }
    requestedByItem.set(entry.itemId, (requestedByItem.get(entry.itemId) ?? 0) + entry.quantity)
  }

  const lines = []
  for (const [itemId, quantity] of requestedByItem) {
    const requestLine = request.lines.find((line) => line.itemId === itemId)
    if (!requestLine) return fail(document, `Sample ${itemId} is not part of this request.`)
    const staged = Math.max(
      0,
      baggedQuantity(document, request.id, itemId) -
        issuedQuantityFor(document.issues, request.id, itemId)
    )
    const reserved = allocation?.lines[itemId]?.reserved ?? 0
    if (staged + quantity > reserved) {
      return fail(
        document,
        `${requestLine.name}: only ${Math.max(0, reserved - staged)} reserved unit(s) remain unstaged for this bag.`
      )
    }
    lines.push({
      id: "",
      requestLineId: requestLine.id,
      itemId,
      name: requestLine.name,
      code: requestLine.code,
      quantity,
    })
  }

  const id = nextSequentialId("BAG-", document.bags.map((bag) => bag.id))
  const bag: SampleBag = {
    id,
    requestId: request.id,
    name: draft.name.trim(),
    stockLocation: draft.stockLocation,
    createdAt: now(),
    lines: lines.map((line) => ({ ...line, id: bagLineId(id, line.itemId) })),
  }
  return ok({ ...document, bags: [...document.bags, bag] })
}

export function updateBag(
  document: WorkflowDocument,
  bagId: string,
  patch: { name?: string; stockLocation?: string }
): OpResult {
  const bag = document.bags.find((entry) => entry.id === bagId)
  if (!bag) return fail(document, "Bag not found.")
  if (findRequest(document, bag.requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  return ok({
    ...document,
    bags: document.bags.map((entry) =>
      entry.id === bagId ? { ...entry, ...patch, name: (patch.name ?? entry.name).trim() } : entry
    ),
  })
}

export function removeBag(document: WorkflowDocument, bagId: string): OpResult {
  const bag = document.bags.find((entry) => entry.id === bagId)
  if (!bag) return fail(document, "Bag not found.")
  if (findRequest(document, bag.requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  if (document.issues.some((issue) => issue.bagId === bagId)) {
    return fail(document, "This bag already has issued samples and cannot be removed.")
  }
  if (document.dispatches.some((dispatch) => dispatch.bagId === bagId)) {
    return fail(document, "This bag is already dispatched and cannot be removed.")
  }
  return ok({ ...document, bags: document.bags.filter((entry) => entry.id !== bagId) })
}

export type IssueDraftInput = {
  requestId: string
  bagId: string
  /** bagLineId → quantity to issue in this run (0 allowed for partial issue). */
  quantities: Record<string, number>
  issuedBy: string
  issuedTo: string
  conditionAtIssue: SampleCondition
  returnByDate: string
}

/**
 * Records a physical stock-out: creates an Issue, deducts inventory, moves the
 * request to In Preparation. Only reserved units may be issued (validateIssue).
 * Multiple issues per bag/request are supported — quantities accumulate.
 */
export function createIssue(
  document: WorkflowDocument,
  items: InventoryItem[],
  draft: IssueDraftInput
): StockOpResult {
  const request = findRequest(document, draft.requestId)
  const blocked = editableInStage2(request)
  if (blocked || !request) return { document, items, error: blocked ?? "Request not found." }

  const bag = document.bags.find((entry) => entry.id === draft.bagId)
  if (!bag || bag.requestId !== request.id) {
    return { document, items, error: "Bag not found for this request." }
  }

  const allocation: Allocation = allocateReservations(document.requests, document.issues, items)
  const error = validateIssue({
    request,
    bagId: bag.id,
    bagLines: bag.lines,
    quantities: draft.quantities,
    issuedBy: draft.issuedBy,
    issuedTo: draft.issuedTo,
    conditionAtIssue: draft.conditionAtIssue,
    returnByDate: draft.returnByDate,
    issues: document.issues,
    allocation,
  })
  if (error) return { document, items, error }

  const id = nextSequentialId("ISS-", document.issues.map((issue) => issue.id))
  const lines: IssueLine[] = bag.lines
    .filter((bagLine) => (draft.quantities[bagLine.id] ?? 0) > 0)
    .map((bagLine) => ({
      id: issueLineId(id, bagLine.itemId),
      bagLineId: bagLine.id,
      itemId: bagLine.itemId,
      name: bagLine.name,
      code: bagLine.code,
      quantity: draft.quantities[bagLine.id],
    }))

  const issue: SampleIssue = {
    id,
    requestId: request.id,
    bagId: bag.id,
    issuedAt: now(),
    issuedBy: draft.issuedBy.trim(),
    issuedTo: draft.issuedTo.trim(),
    conditionAtIssue: draft.conditionAtIssue,
    returnByDate: draft.returnByDate,
    lines,
  }

  const nextItems = items.map((item) => {
    const issued = lines
      .filter((line) => line.itemId === item.id)
      .reduce((sum, line) => sum + line.quantity, 0)
    return issued ? { ...item, stock: Math.max(0, item.stock - issued) } : item
  })

  const next = replaceRequest(document, request.id, (current) => ({
    ...current,
    status: current.status === "Assigned" ? "In Preparation" : current.status,
    preparedAt: current.preparedAt ?? now(),
    history: [
      ...current.history,
      history(`Issue ${id} recorded — ${lines.reduce((sum, line) => sum + line.quantity, 0)} unit(s) issued to ${issue.issuedTo}`),
    ],
  }))

  return { document: { ...next, issues: [...next.issues, issue] }, items: nextItems, error: null }
}

/* ================================================================ Stage 3 */

export type DispatchDraft = {
  requestId: string
  issueId: string
  method: SampleDispatch["method"]
  pickupLocation: SampleDispatch["pickupLocation"]
  destination: SampleDispatch["destination"]
  deliveryAddress: string
  contactPerson: string
  contactNumber: string
  expectedDeliveryDate: string
  dispatchedBy: string
  courierName?: string
  trackingNumber?: string
  awbNumber?: string
}

/** Creates a dispatch for an issue. One request may hold several dispatches. */
export function createDispatch(document: WorkflowDocument, draft: DispatchDraft): OpResult {
  const issue = document.issues.find((entry) => entry.id === draft.issueId)
  if (!issue || issue.requestId !== draft.requestId) return fail(document, "Issue not found for this request.")
  const request = findRequest(document, draft.requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is closed and is read-only.")
  if (!draft.method) return fail(document, "Select a delivery method.")
  if (!draft.pickupLocation) return fail(document, "Select a pickup location.")
  if (!draft.destination) return fail(document, "Select a delivery destination.")
  if (!draft.deliveryAddress.trim()) return fail(document, "Enter the delivery address.")
  if (!draft.contactPerson.trim()) return fail(document, "Enter the contact person.")
  if (!draft.expectedDeliveryDate) return fail(document, "Enter the expected delivery date.")
  if ((draft.method === "Courier") && !draft.courierName?.trim()) {
    return fail(document, "Courier dispatches require a courier name.")
  }

  const id = nextSequentialId("DSP-", document.dispatches.map((dispatch) => dispatch.id))
  const dispatch: SampleDispatch = {
    id,
    requestId: request.id,
    bagId: issue.bagId,
    issueId: issue.id,
    method: draft.method,
    pickupLocation: draft.pickupLocation,
    destination: draft.destination,
    deliveryAddress: draft.deliveryAddress.trim(),
    contactPerson: draft.contactPerson.trim(),
    contactNumber: draft.contactNumber.trim(),
    expectedDeliveryDate: draft.expectedDeliveryDate,
    dispatchedBy: draft.dispatchedBy.trim() || request.assignedCoordinator,
    dispatchDate: "",
    courierName: draft.courierName?.trim() ?? "",
    trackingNumber: draft.trackingNumber?.trim() ?? "",
    awbNumber: draft.awbNumber?.trim() ?? "",
    status: "Ready for Pickup",
    createdAt: now(),
    history: [history(`Dispatch request created from issue ${issue.id}`)],
  }
  return ok({ ...document, dispatches: [...document.dispatches, dispatch] })
}

export function updateDispatchStatus(
  document: WorkflowDocument,
  dispatchId: string,
  status: DispatchStatus,
  actor: string
): OpResult {
  const dispatch = document.dispatches.find((entry) => entry.id === dispatchId)
  if (!dispatch) return fail(document, "Dispatch not found.")
  if (findRequest(document, dispatch.requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  if (dispatch.status === "Receipt Confirmed") {
    return fail(document, "A confirmed receipt cannot be moved back to an earlier dispatch status.")
  }
  if (status === "Receipt Confirmed") {
    return fail(document, "Receipt Confirmed is set by recording the receipt in Stage 3.")
  }
  return ok({
    ...document,
    dispatches: document.dispatches.map((entry) =>
      entry.id === dispatchId
        ? {
            ...entry,
            status,
            dispatchDate: status === "Picked Up" || status === "In Transit" ? entry.dispatchDate || now().slice(0, 10) : entry.dispatchDate,
            history: [...entry.history, history(`Dispatch status updated to ${status} by ${actor || "dispatch"}`)],
          }
        : entry
    ),
  })
}

export type ReceiptDraftInput = {
  dispatchId: string
  receivedDate: string
  receiver: string
  custodyHolder: string
  conditionAtReceipt: SampleCondition
  proofOfDelivery: string
  notes: string
  lines: Array<{ itemId: string; receivedQuantity: number; damagedQuantity: number; discrepancyNotes: string }>
}

/**
 * Confirms a receipt for a dispatch (full, partial or damaged).
 * `received ≤ remaining issued` is checked against ALL earlier receipts for the
 * same dispatch, so cumulative receipts can never exceed the issued quantity.
 * Confirmed received lines become the Stage 4 review snapshot.
 */
export function confirmReceipt(document: WorkflowDocument, draft: ReceiptDraftInput): OpResult {
  const dispatch = document.dispatches.find((entry) => entry.id === draft.dispatchId)
  if (!dispatch) return fail(document, "Dispatch not found.")
  const request = findRequest(document, dispatch.requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is closed and is read-only.")
  if (dispatch.status === "Receipt Confirmed") {
    return fail(document, "A receipt is already confirmed for this dispatch.")
  }

  const issue = document.issues.find((entry) => entry.id === dispatch.issueId)
  if (!issue) return fail(document, "The linked issue no longer exists.")

  const prior = document.receipts.filter((receipt) => receipt.dispatchId === dispatch.id)
  const receivedBefore = (itemId: string): number =>
    prior.reduce(
      (sum, receipt) =>
        sum + receipt.lines.filter((line) => line.itemId === itemId).reduce((s, line) => s + line.receivedQuantity, 0),
      0
    )

  const receiptId = nextSequentialId("RCP-", document.receipts.map((receipt) => receipt.id))
  const lines: ReceiptLine[] = []
  for (const entry of draft.lines) {
    const issueLine = issue.lines.find((line) => line.itemId === entry.itemId)
    if (!issueLine) return fail(document, `Sample ${entry.itemId} was not issued on this dispatch.`)
    const already = receivedBefore(entry.itemId)
    const remaining = issueLine.quantity - already
    if (remaining <= 0) {
      return fail(document, `${issueLine.name}: all ${issueLine.quantity} issued unit(s) were already received.`)
    }
    if (!isWholeNumber(entry.receivedQuantity) || entry.receivedQuantity < 0) {
      return fail(document, `${issueLine.name}: received quantity must be a whole number.`)
    }
    if (entry.receivedQuantity > remaining) {
      return fail(
        document,
        `${issueLine.name}: received quantity (${entry.receivedQuantity}) cannot exceed the ${remaining} issued unit(s) still outstanding.`
      )
    }
    const finalised = document.reviews.find(
      (review) => review.dispatchId === dispatch.id && review.itemId === entry.itemId
    )
    if (finalised && isFinalized(finalised)) {
      return fail(document, `${issueLine.name}: already reviewed — additional receipts are blocked for this sample.`)
    }
    lines.push({
      id: receiptLineId(receiptId, entry.itemId),
      itemId: entry.itemId,
      name: issueLine.name,
      code: issueLine.code,
      issuedQuantity: remaining,
      receivedQuantity: entry.receivedQuantity,
      damagedQuantity: entry.damagedQuantity,
      missingQuantity: Math.max(0, remaining - entry.receivedQuantity),
      discrepancyNotes: entry.discrepancyNotes.trim(),
    })
  }

  const cumulativeIssued = issue.lines.reduce((sum, line) => sum + line.quantity, 0)
  const cumulativeReceived =
    prior.reduce(
      (sum, receipt) => sum + receipt.lines.reduce((s, line) => s + line.receivedQuantity, 0),
      0
    ) + lines.reduce((sum, line) => sum + line.receivedQuantity, 0)
  const receiptStatus = suggestReceiptStatus(lines)

  const error = validateReceipt({
    lines,
    status: receiptStatus,
    receiver: draft.receiver,
    receivedDate: draft.receivedDate,
    conditionAtReceipt: draft.conditionAtReceipt,
    notes: draft.notes,
  })
  if (error) return fail(document, error)
  const receipt: SampleReceipt = {
    id: receiptId,
    dispatchId: dispatch.id,
    requestId: request.id,
    receivedDate: draft.receivedDate,
    receivedAt: now(),
    receiver: draft.receiver.trim(),
    custodyHolder: draft.custodyHolder.trim() || draft.receiver.trim(),
    conditionAtReceipt: draft.conditionAtReceipt,
    receiptStatus,
    proofOfDelivery: draft.proofOfDelivery.trim(),
    notes: draft.notes.trim(),
    lines,
    confirmedAt: now(),
  }

  const fullyReceived = cumulativeReceived >= cumulativeIssued
  const nextDispatches = document.dispatches.map((entry) =>
    entry.id === dispatch.id
      ? {
          ...entry,
          status: (fullyReceived && cumulativeReceived > 0 ? "Receipt Confirmed" : "Delivered") as DispatchStatus,
          history: [
            ...entry.history,
            history(`Receipt ${receiptId} recorded: ${receiptStatus} (${cumulativeReceived}/${cumulativeIssued})`),
          ],
        }
      : entry
  )

  // Stage 4 snapshots: one review per dispatch + sample, created at first receipt.
  const nextReviews = [...document.reviews]
  lines
    .filter((line) => line.receivedQuantity > 0)
    .forEach((line) => {
      const index = nextReviews.findIndex(
        (review) => review.dispatchId === dispatch.id && review.itemId === line.itemId
      )
      const alreadyReceived = receivedBefore(line.itemId)
      const issuedQuantity = issue.lines
        .filter((issueLine) => issueLine.itemId === line.itemId)
        .reduce((sum, issueLine) => sum + issueLine.quantity, 0)
      const receivedQuantity = alreadyReceived + line.receivedQuantity
      if (index >= 0) {
        nextReviews[index] = { ...nextReviews[index], receivedQuantity, receiptId: receipt.id }
      } else {
        nextReviews.push({
          id: `REV-${dispatch.id}-${line.itemId}`,
          requestId: request.id,
          dispatchId: dispatch.id,
          receiptId: receipt.id,
          itemId: line.itemId,
          name: line.name,
          code: line.code,
          issuedQuantity,
          receivedQuantity,
          cycles: [],
        })
      }
    })

  return ok({
    ...document,
    receipts: [...document.receipts, receipt],
    dispatches: nextDispatches,
    reviews: nextReviews,
  })
}

/* ================================================================ Stage 4 */

export type ReviewDraftInput = {
  requestId: string
  reviewId?: string
  dispatchId?: string
  itemId?: string
  reviewer: string
  reviewerRole: ReviewerRole
  reviewerReassigned?: boolean
  reviewDate: string
  nextReviewDate?: string
  dueDate: string
  decision: ReviewDecision
  comments: string
  feedback: string
  followUp: ReviewFollowUp
  returnInstruction: ReturnInstruction
}

export function startReview(
  document: WorkflowDocument,
  input: { reviewId: string; reviewer: string; reviewerRole: ReviewerRole; dueDate: string }
): OpResult {
  const review = document.reviews.find((entry) => entry.id === input.reviewId)
  if (!review) return fail(document, "Review not found.")
  if (findRequest(document, review.requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  if (!input.reviewer.trim()) return fail(document, "Select a reviewer.")
  if (!input.dueDate) return fail(document, "Enter the review due date.")

  const existing = latestCycle(review)
  if (existing && !existing.decision) {
    const updated = {
      ...existing,
      reviewer: input.reviewer.trim(),
      reviewerRole: input.reviewerRole,
      dueDate: input.dueDate,
      status: "Under Review" as const,
      isDraft: true,
      history: [...existing.history, history(`Review started by ${input.reviewer.trim()}`)],
    }
    return ok({
      ...document,
      reviews: document.reviews.map((entry) =>
        entry.id === review.id
          ? { ...entry, cycles: entry.cycles.map((cycle, index) => index === entry.cycles.length - 1 ? updated : cycle) }
          : entry
      ),
    })
  }

  const cycle: ReviewCycle = {
    cycle: existing ? existing.cycle + 1 : 1,
    reviewer: input.reviewer.trim(),
    reviewerRole: input.reviewerRole,
    reviewerReassigned: false,
    reviewDate: now().slice(0, 10),
    dueDate: input.dueDate,
    status: "Under Review",
    isDraft: true,
    decision: "",
    comments: "",
    feedback: "",
    followUp: "None",
    returnInstruction: "Coordinator decision",
    finalApproval: "Pending",
    history: [history(`Review started by ${input.reviewer.trim()}`)],
  }
  return ok({
    ...document,
    reviews: document.reviews.map((entry) =>
      entry.id === review.id ? { ...entry, cycles: [...entry.cycles, cycle] } : entry
    ),
  })
}

const findReview = (document: WorkflowDocument, input: ReviewDraftInput): WorkflowDocument["reviews"][number] | undefined =>
  input.reviewId
    ? document.reviews.find((review) => review.id === input.reviewId)
    : document.reviews.find(
        (review) => review.dispatchId === input.dispatchId && review.itemId === input.itemId
      )

/**
 * Records one review decision for one sample (per-line independence) and keeps
 * the full revision history as additional cycles.
 */
export function recordReviewDecision(document: WorkflowDocument, input: ReviewDraftInput): OpResult {
  const request = findRequest(document, input.requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is closed and is read-only.")

  const error = validateReviewCycle({
    reviewer: input.reviewer,
    reviewerRole: input.reviewerRole,
    reviewDate: input.reviewDate,
    nextReviewDate: input.nextReviewDate,
    dueDate: input.dueDate,
    decision: input.decision,
    comments: input.comments,
    feedback: input.feedback,
    followUp: input.followUp,
    returnInstruction: input.returnInstruction,
  })
  if (error) return fail(document, error)

  const review = findReview(document, input)
  if (!review) return fail(document, "No confirmed receipt is available for this sample yet.")

  const existing = latestCycle(review)
  const status: ReviewCycle["status"] =
    input.decision === "Revision Required" ? "Revision Requested" : "Decision Recorded"
  const cycle: ReviewCycle = {
    cycle: existing ? existing.cycle + (existing.isDraft && !existing.decision ? 0 : 1) : 1,
    reviewer: input.reviewer.trim(),
    reviewerRole: input.reviewerRole,
    reviewerReassigned: input.reviewerReassigned ?? (existing ? existing.reviewer !== input.reviewer.trim() : false),
    reviewDate: input.reviewDate,
    nextReviewDate: input.decision === "Deferred" ? input.nextReviewDate : undefined,
    dueDate: input.dueDate,
    status,
    isDraft: false,
    decision: input.decision,
    comments: input.comments.trim(),
    feedback: input.feedback.trim(),
    followUp: input.followUp,
    returnInstruction: input.returnInstruction,
    finalApproval: "Pending",
    history: [
      ...(existing?.history ?? []),
      history(`Review submitted by ${input.reviewer.trim()} (${input.reviewerRole})`),
      history(`Review decision recorded: ${input.decision}`),
    ],
  }

  const nextReviews = document.reviews.map((entry) => {
    if (entry.id !== review.id) return entry
    const lastIndex = entry.cycles.length - 1
    if (existing?.isDraft && !existing.decision && lastIndex >= 0) {
      return { ...entry, cycles: entry.cycles.map((previous, index) => index === lastIndex ? cycle : previous) }
    }
    return { ...entry, cycles: [...entry.cycles, cycle] }
  })
  const notification = {
    id: `NTF-${review.id}-${cycle.cycle}`,
    requestId: request.id,
    reviewId: review.id,
    sampleName: review.name,
    coordinator: request.assignedCoordinator,
    decision: input.decision,
    comments: input.comments.trim(),
    createdAt: now(),
    read: false,
  }
  return ok({
    ...document,
    reviews: nextReviews,
    notifications: [...document.notifications, notification],
  })
}

/** Reassigns the reviewer of the current (not yet decided) review cycle. */
export function reassignReviewer(
  document: WorkflowDocument,
  reviewId: string,
  reviewer: string,
  role: ReviewerRole
): OpResult {
  const review = document.reviews.find((entry) => entry.id === reviewId)
  if (!review) return fail(document, "Review not found.")
  if (findRequest(document, review.requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  if (!reviewer.trim()) return fail(document, "Select a reviewer.")
  const existing = latestCycle(review)
  if (existing?.decision) {
    // A decided cycle is frozen — start the next cycle with the new reviewer.
    const cycle: ReviewCycle = {
      ...existing,
      cycle: existing.cycle + 1,
      reviewer: reviewer.trim(),
      reviewerRole: role,
      reviewerReassigned: true,
      reviewDate: now().slice(0, 10),
      dueDate: existing.dueDate,
      status: "Awaiting Review",
      isDraft: true,
      decision: "",
      comments: "",
      feedback: "",
      nextReviewDate: undefined,
      finalApproval: "Pending",
      finalComments: undefined,
      approvedBy: undefined,
      decisionDate: undefined,
      history: [...existing.history, history(`Reviewer reassigned to ${reviewer.trim()} (${role})`)],
    }
    return ok({
      ...document,
      reviews: document.reviews.map((entry) =>
        entry.id === reviewId ? { ...entry, cycles: [...entry.cycles, cycle] } : entry
      ),
    })
  }
  const nextCycle: ReviewCycle = existing
    ? { ...existing, reviewer: reviewer.trim(), reviewerRole: role, reviewerReassigned: true }
    : {
        cycle: 1,
        reviewer: reviewer.trim(),
        reviewerRole: role,
        reviewerReassigned: true,
        reviewDate: now().slice(0, 10),
        dueDate: now().slice(0, 10),
        status: "Awaiting Review",
        isDraft: true,
        decision: "",
        comments: "",
        feedback: "",
        followUp: "None",
        returnInstruction: "Coordinator decision",
        finalApproval: "Pending",
        history: [history(`Reviewer assigned: ${reviewer.trim()} (${role})`)],
      }
  return ok({
    ...document,
    reviews: document.reviews.map((entry) =>
      entry.id === reviewId
        ? {
            ...entry,
            cycles: existing ? entry.cycles.map((c, i) => (i === entry.cycles.length - 1 ? nextCycle : c)) : [nextCycle],
          }
        : entry
    ),
  })
}

export type FinalApprovalInput = {
  reviewId: string
  finalApproval: "Approved" | "Rejected" | "Changes Required" | "Not Required"
  decisionDate: string
  approvedBy: string
  coordinator: string
  finalComments: string
}

/** Final approval is recorded separately from the review decision (spec §04). */
export function recordFinalApproval(document: WorkflowDocument, input: FinalApprovalInput): OpResult {
  const review = document.reviews.find((entry) => entry.id === input.reviewId)
  if (!review) return fail(document, "Review not found.")
  const request = findRequest(document, review.requestId)
  if (request?.status === "Closed") return fail(document, "This request is closed and is read-only.")

  const existing = latestCycle(review)
  if (!existing) return fail(document, "Record a review decision before the final approval.")
  if (!existing.decision) return fail(document, "Record a review decision before the final approval.")
  if (existing.status === "Finalized") return fail(document, "A final decision is already recorded for this review cycle.")
  const error = validateFinalApproval({
    finalApproval: input.finalApproval,
    decisionDate: input.decisionDate,
    approvedBy: input.approvedBy,
    coordinator: input.coordinator,
    finalComments: input.finalComments,
    decision: existing.decision,
  })
  if (error) return fail(document, error)

  const nextCycles = review.cycles.map((cycle, index) =>
    index === review.cycles.length - 1
      ? {
          ...cycle,
          status: "Finalized" as const,
          finalApproval: input.finalApproval,
          finalComments: input.finalComments.trim() || undefined,
          approvedBy: input.finalApproval === "Not Required" ? undefined : input.approvedBy.trim(),
          decisionDate: input.finalApproval === "Not Required" ? undefined : input.decisionDate,
          coordinator: input.coordinator.trim(),
          history: [
            ...cycle.history,
            history(
              input.finalApproval === "Approved"
                ? `Final decision ${input.finalApproval} recorded by ${input.approvedBy.trim()}`
                : "Marked as not requiring a separate final decision"
            ),
          ],
        }
      : cycle
  )
  const finalDecision =
    input.finalApproval === "Not Required"
      ? existing.decision
      : input.finalApproval === "Changes Required"
        ? "Revision Required"
        : input.finalApproval
  const notification = {
    id: `NTF-${review.id}-FINAL-${existing.cycle}`,
    requestId: review.requestId,
    reviewId: review.id,
    sampleName: review.name,
    coordinator: input.coordinator.trim(),
    decision: finalDecision,
    comments: input.finalComments.trim(),
    createdAt: now(),
    read: false,
  }
  return ok({
    ...document,
    reviews: document.reviews.map((entry) => (entry.id === review.id ? { ...entry, cycles: nextCycles } : entry)),
    notifications: [...document.notifications, notification],
  })
}

/* ================================================================ Stage 5 */

/** Builds the closure record (live quantities merged with saved return data). */
export function mergedClosureRecord(document: WorkflowDocument, requestId: string): ClosureRecord | null {
  const request = findRequest(document, requestId)
  if (!request) return null
  const built = closureSamples(request, document)
  const existing = document.closures.find((closure) => closure.requestId === requestId)
  if (!existing) {
    return {
      requestId,
      project: request.project,
      samples: built,
      closureStatus: "Pending Closure",
      closureDate: "",
      closedBy: "",
      closureNotes: "",
      history: [history("Return reconciliation opened")],
    }
  }
  const samples: ClosureSample[] = built.map((sample) => {
    const saved = existing.samples.find((entry) => entry.itemId === sample.itemId)
    if (!saved) return sample
    return {
      ...saved,
      name: sample.name,
      code: sample.code,
      issuedQuantity: sample.issuedQuantity,
      receivedQuantity: sample.receivedQuantity,
      reviewSummary: sample.reviewSummary,
    }
  })
  return { ...existing, project: request.project, samples }
}

function upsertClosure(document: WorkflowDocument, record: ClosureRecord): WorkflowDocument {
  const exists = document.closures.some((closure) => closure.requestId === record.requestId)
  return {
    ...document,
    closures: exists
      ? document.closures.map((closure) => (closure.requestId === record.requestId ? record : closure))
      : [...document.closures, record],
  }
}

export function updateClosureSample(
  document: WorkflowDocument,
  requestId: string,
  itemId: string,
  patch: Partial<ClosureSample>
): OpResult {
  const record = mergedClosureRecord(document, requestId)
  if (!record) return fail(document, "Request not found.")
  if (findRequest(document, requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  const existingSample = record.samples.find((entry) => entry.itemId === itemId)
  const nextReturned = patch.returnedQuantity ?? existingSample?.returnedQuantity ?? 0
  if (!Number.isInteger(nextReturned) || nextReturned < 0 || nextReturned > (existingSample?.issuedQuantity ?? 0)) {
    return fail(document, "Expected returned quantity must be a whole number between zero and the issued quantity.")
  }
  const samples = record.samples.map((sample) => (sample.itemId === itemId ? { ...sample, ...patch } : sample))
  return ok(upsertClosure(document, { ...record, samples }))
}

/**
 * Verifies a physical return:
 *  - Good condition → available stock (idempotent via StockAdjustment id)
 *  - Damaged / Unusable → quarantine, never available stock
 */
export function verifyReturn(
  document: WorkflowDocument,
  items: InventoryItem[],
  requestId: string,
  itemId: string,
  input: {
    receivedBackQuantity: number
    conditionAtReturn: ReturnCondition
    verifiedBy: string
    inspectionNotes: string
    actualReturnDate: string
  }
): StockOpResult {
  const record = mergedClosureRecord(document, requestId)
  if (!record) return { document, items, error: "Request not found." }
  if (findRequest(document, requestId)?.status === "Closed") {
    return { document, items, error: "This request is closed and is read-only." }
  }
  const sample = record.samples.find((entry) => entry.itemId === itemId)
  if (!sample) return { document, items, error: "Sample not found on this request." }
  if (!input.verifiedBy.trim()) return { document, items, error: "Enter who verified the return." }
  if (!input.actualReturnDate) return { document, items, error: "Enter the actual return date." }

  const patched: ClosureSample = {
    ...sample,
    receivedBackQuantity: input.receivedBackQuantity,
    conditionAtReturn: input.conditionAtReturn,
    verifiedBy: input.verifiedBy.trim(),
    inspectionNotes: input.inspectionNotes.trim(),
    actualReturnDate: input.actualReturnDate,
    verifiedAt: now(),
  }
  const plan = planReturnStocking(patched, requestId)
  if (plan.error) return { document, items, error: plan.error }

  const adjustmentAlreadyPosted = document.stockAdjustments.some((entry) => entry.id === plan.adjustmentId)
  const stockDelta = adjustmentAlreadyPosted ? 0 : plan.stockDelta

  const nextItems = stockDelta
    ? items.map((item) => (item.id === itemId ? { ...item, stock: item.stock + stockDelta } : item))
    : items

  const nextSamples = record.samples.map((entry) =>
    entry.itemId === itemId
      ? {
          ...patched,
          stockedQuantity: patched.conditionAtReturn === "Good" ? patched.receivedBackQuantity : patched.stockedQuantity,
          quarantinedQuantity:
            patched.conditionAtReturn === "Good" ? patched.quarantinedQuantity : patched.receivedBackQuantity,
        }
      : entry
  )

  const adjustment = stockDelta
    ? {
        id: plan.adjustmentId,
        requestId,
        itemId,
        sampleName: sample.name,
        quantity: stockDelta,
        reason: "Verified good sample return",
        createdAt: now(),
      }
    : null

  const historyEntry = history(
    patched.conditionAtReturn === "Good"
      ? `Return verified: ${patched.receivedBackQuantity} unit(s) of ${sample.name} returned to stock`
      : `Return verified: ${patched.receivedBackQuantity} unit(s) of ${sample.name} placed in quarantine`
  )

  return {
    document: {
      ...upsertClosure(document, {
        ...record,
        samples: nextSamples,
        history: [...record.history, historyEntry],
      }),
      stockAdjustments: adjustment
        ? [...document.stockAdjustments.filter((entry) => entry.id !== adjustment.id), adjustment]
        : document.stockAdjustments,
    },
    items: nextItems,
    error: null,
  }
}

export function addDisposition(
  document: WorkflowDocument,
  requestId: string,
  itemId: string,
  input: { type: DispositionType; quantity: number; notes: string; approvedBy: string }
): OpResult {
  const record = mergedClosureRecord(document, requestId)
  if (!record) return fail(document, "Request not found.")
  if (findRequest(document, requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  const sample = record.samples.find((entry) => entry.itemId === itemId)
  if (!sample) return fail(document, "Sample not found on this request.")
  if (!isWholeNumber(input.quantity) || input.quantity < 1) {
    return fail(document, "Disposition quantity must be a whole number of at least 1.")
  }
  if ((input.type === "Retained" || input.type === "Lost") && !input.approvedBy.trim()) {
    return fail(document, `"${input.type}" requires an authorised approval name.`)
  }
  if (input.type === "Returned" && sample.conditionAtReturn && sample.conditionAtReturn !== "Good") {
    return fail(document, "Damaged or unusable returns cannot be returned to available stock.")
  }
  if (input.type === "Returned" && input.quantity > sample.stockedQuantity) {
    return fail(document, "Verify good-condition stock return before recording the Returned disposition.")
  }
  const already = sample.dispositions.reduce((sum, entry) => sum + entry.quantity, 0)
  if (already + input.quantity > sample.issuedQuantity) {
    return fail(
      document,
      `${sample.name}: dispositions (${already + input.quantity}) would exceed the issued quantity (${sample.issuedQuantity}).`
    )
  }
  if (input.type === "Returned" && input.quantity !== sample.receivedBackQuantity) {
    return fail(
      document,
      `"Returned" (${input.quantity}) must equal the verified return quantity (${sample.receivedBackQuantity}).`
    )
  }

  const disposition: Disposition = {
    id: nextSequentialId(`DISP-${itemId}-`, sample.dispositions.map((entry) => entry.id)),
    type: input.type,
    quantity: input.quantity,
    notes: input.notes.trim(),
    approvedBy: input.approvedBy.trim(),
  }
  const samples = record.samples.map((entry) =>
    entry.itemId === itemId ? { ...entry, dispositions: [...entry.dispositions, disposition] } : entry
  )
  return ok(upsertClosure(document, { ...record, samples }))
}

export function removeDisposition(
  document: WorkflowDocument,
  requestId: string,
  itemId: string,
  dispositionId: string
): OpResult {
  const record = mergedClosureRecord(document, requestId)
  if (!record) return fail(document, "Request not found.")
  if (findRequest(document, requestId)?.status === "Closed") {
    return fail(document, "This request is closed and is read-only.")
  }
  const samples = record.samples.map((sample) =>
    sample.itemId === itemId
      ? { ...sample, dispositions: sample.dispositions.filter((entry) => entry.id !== dispositionId) }
      : sample
  )
  return ok(upsertClosure(document, { ...record, samples }))
}

/** Cancels the unissued pending demand (Stage 5 closure gate). */
export function resolvePendingDemand(document: WorkflowDocument, requestId: string): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is closed and is read-only.")
  if (request.pendingResolved) return ok(document)
  return ok(
    replaceRequest(document, requestId, (current) => ({
      ...current,
      pendingResolved: true,
      history: [...current.history, history("Unissued pending demand cancelled by coordinator")],
    }))
  )
}

export type ClosureMeta = { closedBy: string; closureDate: string; closureNotes: string }

export function saveClosureDraft(
  document: WorkflowDocument,
  requestId: string,
  meta: Partial<ClosureMeta>
): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is closed and is read-only.")
  const record = mergedClosureRecord(document, requestId)
  if (!record) return fail(document, "Request not found.")
  return ok(upsertClosure(document, {
    ...record,
    ...meta,
    closureStatus: "Pending Closure",
    history: [...record.history, history("Closure draft saved")],
  }))
}

/** The closure gate with the coordinator's typed metadata applied. */
export function closureGate(
  document: WorkflowDocument,
  requestId: string,
  meta: ClosureMeta,
  allocation: Allocation
): { blockers: string[]; unissuedPending: number; record: ClosureRecord | null } {
  const record = mergedClosureRecord(document, requestId)
  const request = findRequest(document, requestId)
  if (!record || !request) return { blockers: ["Request not found."], unissuedPending: 0, record: null }
  const withMeta: ClosureRecord = { ...record, ...meta }
  const check = closureBlockers({ request, record: withMeta, document, allocation })
  return { blockers: check.blockers, unissuedPending: check.unissuedPending, record: withMeta }
}

/** Final closure: all gates must pass; the request becomes read-only. */
export function closeRequest(
  document: WorkflowDocument,
  requestId: string,
  meta: ClosureMeta,
  allocation: Allocation
): OpResult {
  const request = findRequest(document, requestId)
  if (!request) return fail(document, "Request not found.")
  if (request.status === "Closed") return fail(document, "This request is already closed.")

  const record = mergedClosureRecord(document, requestId)
  if (!record) return fail(document, "Request not found.")
  const withMeta: ClosureRecord = { ...record, ...meta }
  const { blockers } = closureBlockers({ request, record: withMeta, document, allocation })
  if (blockers.length) return fail(document, blockers.join(" "))

  const closedAt = now()
  const closedRecord: ClosureRecord = {
    ...withMeta,
    closureStatus: "Closed",
    closedAt,
    history: [...withMeta.history, history(`Request closed by ${meta.closedBy.trim()}`)],
  }
  const next = replaceRequest(document, requestId, (current) => ({
    ...current,
    status: "Closed",
    closedAt,
    history: [...current.history, history(`Request closed by ${meta.closedBy.trim()}`)],
  }))
  return ok(upsertClosure(next, closedRecord))
}

/* --------------------------------------------------------------- selectors */

export { allocateReservations, issuedQuantityFor, latestCycle }
