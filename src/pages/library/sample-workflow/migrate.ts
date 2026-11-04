/**
 * v1 → v2 workflow migration.
 *
 * The original implementation kept each stage in its own storage key with a
 * flatter record shape (`archscale.samples.stage1.requests`,
 * `.stage2.workflows`, `.stage2.dispatches`, `.stage4.reviews`,
 * `.stage5.records`, `.stage5.stockAdjustments`).
 *
 * This module converts whatever exists in those keys into the centralised v2
 * document so no developer/test data is lost when the five connected stages
 * land. Quantities that were only stored as an aggregate (receipts) are split
 * across lines deterministically, and already-posted stock adjustments are
 * carried over so a later return can never double-post inventory.
 */

import type {
  ClosureRecord,
  ClosureSample,
  Disposition,
  DispositionType,
  HistoryEntry,
  IssueLine,
  ReceiptLine,
  RequestLine,
  RequestStatus,
  ReviewCycle,
  SampleBag,
  SampleDispatch,
  SampleIssue,
  SampleReceipt,
  SampleRequest,
  StockAdjustment,
  WorkflowDocument,
  DeliveryMethod,
  PickupLocation,
} from "./types"
import { emptyWorkflowDocument } from "./types"
import {
  bagLineId,
  issueLineId,
  now,
  receiptLineId,
  requestLineId,
} from "./logic"

export const LEGACY_KEYS = {
  requests: "archscale.samples.stage1.requests",
  workflows: "archscale.samples.stage2.workflows",
  dispatches: "archscale.samples.stage2.dispatches",
  reviews: "archscale.samples.stage4.reviews",
  closures: "archscale.samples.stage5.records",
  adjustments: "archscale.samples.stage5.stockAdjustments",
} as const

type AnyRecord = Record<string, any>

const readJson = <T,>(read: (key: string) => string | null, key: string): T | null => {
  try {
    const raw = read(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const asInt = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback
}

const str = (value: unknown): string => (typeof value === "string" ? value : "")

const mapRequestStatus = (status: unknown): RequestStatus => {
  switch (status) {
    case "Draft":
      return "Draft"
    case "Submitted":
      return "Submitted"
    case "Ready for Select & Issue":
      return "In Preparation"
    case "Closed":
      return "Closed"
    default:
      return "Submitted"
  }
}

const mapMethod = (value: unknown): DeliveryMethod | "" => {
  const method = str(value)
  if (method === "Pickup") return "Self Pickup"
  if (method === "Hand delivery") return "Runner"
  if (method === "Internal Transfer") return "Internal Transfer"
  if (method === "Courier") return "Courier"
  if (method === "Runner" || method === "Self Pickup") return method
  return method ? "Courier" : ""
}

const mapPickup = (value: unknown): PickupLocation | "" => {
  const location = str(value)
  if (location === "Studio" || location === "Store-Warehouse" || location === "Vendor") return location
  if (!location) return ""
  if (/warehouse|store/i.test(location)) return "Store-Warehouse"
  if (/vendor/i.test(location)) return "Vendor"
  return "Studio"
}

const mapCondition = (value: unknown): "Good" | "Used" | "Damaged" | "" => {
  const condition = str(value)
  if (condition === "Good" || condition === "Used" || condition === "Damaged") return condition
  if (condition === "Incomplete") return "Damaged"
  return condition ? "Damaged" : ""
}

/** Spread an aggregate received quantity across the issued lines, in order. */
export function splitReceiptQuantity(
  issued: number[],
  totalReceived: number,
  totalDamaged = 0
): { received: number[]; damaged: number[] } {
  let remainingReceived = Math.max(0, totalReceived)
  let remainingDamaged = Math.max(0, totalDamaged)
  const received = issued.map((quantity) => {
    const value = Math.min(quantity, remainingReceived)
    remainingReceived -= value
    return value
  })
  const damaged = received.map((quantity) => {
    const value = Math.min(quantity, remainingDamaged)
    remainingDamaged -= value
    return value
  })
  return { received, damaged }
}

/* ----------------------------------------------------------------- requests */

function migrateRequests(raw: AnyRecord[] | null): SampleRequest[] {
  if (!raw?.length) return []
  return raw.map((entry, index): SampleRequest => {
    const selections = Array.isArray(entry.sampleSelections) ? entry.sampleSelections : []
    const lines: RequestLine[] = selections
      .filter((selection: AnyRecord) => selection && selection.itemId)
      .map((selection: AnyRecord, lineIndex: number): RequestLine => ({
        id: requestLineId(entry.id ?? `MR-LEGACY-${index}`, lineIndex),
        itemId: str(selection.itemId),
        name: str(selection.name) || str(selection.itemId),
        code: str(selection.code) || str(selection.itemId),
        category: str(selection.category) || "Sample",
        quantity: asInt(selection.quantity, 1) || 1,
        selectedQuantity: asInt(selection.quantity, 1) || 1,
      }))
    const history: HistoryEntry[] = []
    if (entry.submittedAt) history.push({ action: "Request submitted", at: str(entry.submittedAt) })
    if (entry.readyAt) history.push({ action: "Coordinator confirmed ready for Select & Issue", at: str(entry.readyAt) })
    if (entry.closedAt) history.push({ action: "Request closed", at: str(entry.closedAt) })

    const status = mapRequestStatus(entry.status)
    return {
      id: str(entry.id) || `MR-LEGACY-${index}`,
      source: "Direct Request",
      requestType: str(entry.requestType) || "Project sample",
      project: str(entry.project),
      space: "",
      requester: str(entry.requester),
      requesterContactId: "",
      organization: str(entry.organization) || "",
      phone: "",
      deliveryContact: str(entry.requester),
      deliveryAddress: str(entry.deliveryAddress),
      purpose: str(entry.purpose),
      priority: (["Urgent", "High", "Normal", "Low"].includes(entry.priority)
        ? entry.priority
        : "Normal") as SampleRequest["priority"],
      requiredDate: str(entry.requiredDate),
      assignedCoordinator: str(entry.assignedCoordinator),
      assignment: "Sample Coordinator",
      lines,
      sampleDetails: str(entry.sampleDetails) || lines.map((line) => line.name).join(", "),
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      pendingResolved: status === "Closed",
      status,
      createdAt: str(entry.createdAt) || now(),
      submittedAt: entry.submittedAt ? str(entry.submittedAt) : undefined,
      acceptedAt: entry.readyAt ? str(entry.readyAt) : undefined,
      preparedAt: entry.readyAt ? str(entry.readyAt) : undefined,
      closedAt: entry.closedAt ? str(entry.closedAt) : undefined,
      history,
    }
  })
}

/* ------------------------------------------- bags, issues, dispatch, receipt */

function migrateStage2(
  requests: SampleRequest[],
  workflows: AnyRecord[] | null,
  dispatches: AnyRecord[] | null
): { bags: SampleBag[]; issues: SampleIssue[]; dispatches: SampleDispatch[]; receipts: SampleReceipt[] } {
  const bags: SampleBag[] = []
  const issues: SampleIssue[] = []
  const outDispatches: SampleDispatch[] = []
  const receipts: SampleReceipt[] = []
  let bagCounter = 0
  let issueCounter = 0

  const requestById = new Map(requests.map((request) => [request.id, request]))
  const dispatchList = Array.isArray(dispatches) ? dispatches : []

  workflows?.forEach((workflow) => {
    const request = requestById.get(str(workflow?.request?.id))
    if (!request) return
    const samples: AnyRecord[] = Array.isArray(workflow.samples) ? workflow.samples : []
    if (!samples.length) return

    bagCounter += 1
    const bagId = `BAG-${String(bagCounter).padStart(4, "0")}`
    const bag: SampleBag = {
      id: bagId,
      requestId: request.id,
      name: `Bag ${bagCounter}`,
      stockLocation: str(samples[0]?.stockLocation),
      createdAt: str(workflow.createdAt) || now(),
      lines: samples.map((sample, index) => ({
        id: bagLineId(bagId, str(sample.itemId)),
        requestLineId: requestLineId(request.id, index),
        itemId: str(sample.itemId),
        name: str(sample.name),
        code: str(sample.code),
        quantity: asInt(sample.requestedQuantity ?? sample.stage1RequestedQuantity, 1) || 1,
      })),
    }
    bags.push(bag)

    const issuedSamples = samples.filter((sample) => asInt(sample.issuedQuantity) > 0)
    if (!issuedSamples.length) return

    issueCounter += 1
    const issueId = `ISS-${String(issueCounter).padStart(4, "0")}`
    const issueLines: IssueLine[] = issuedSamples.map((sample) => ({
      id: issueLineId(issueId, str(sample.itemId)),
      bagLineId: bagLineId(bagId, str(sample.itemId)),
      itemId: str(sample.itemId),
      name: str(sample.name),
      code: str(sample.code),
      quantity: asInt(sample.issuedQuantity),
    }))
    const issue: SampleIssue = {
      id: issueId,
      requestId: request.id,
      bagId,
      issuedAt: str(workflow.dispatchedAt) || now(),
      issuedBy: request.assignedCoordinator,
      issuedTo: request.requester,
      conditionAtIssue: (mapCondition(issuedSamples[0]?.condition) || "Good") as "Good" | "Used" | "Damaged",
      returnByDate: str(workflow.expectedReturnDate),
      lines: issueLines,
    }
    issues.push(issue)

    const legacyDispatch = dispatchList.find((entry) => str(entry?.id) === str(workflow.dispatchId))
      ?? dispatchList.find((entry) => str(entry?.request?.id) === request.id)
    const delivery: AnyRecord = legacyDispatch?.delivery ?? {}
    const confirmedAt = str(delivery.receiptConfirmedAt)

    const dispatch: SampleDispatch = {
      id: str(legacyDispatch?.id) || str(workflow.dispatchId) || `DSP-${request.id}`,
      requestId: request.id,
      bagId,
      issueId,
      method: mapMethod(delivery.deliveryMethod),
      pickupLocation: mapPickup(delivery.pickupLocation),
      destination: "Project Office",
      deliveryAddress: str(delivery.deliveryAddress) || request.deliveryAddress,
      contactPerson: str(delivery.contactPerson) || request.requester,
      contactNumber: str(delivery.contactNumber),
      expectedDeliveryDate: str(delivery.expectedDeliveryDate),
      dispatchedBy: request.assignedCoordinator,
      dispatchDate: str(delivery.dispatchDate),
      courierName: str(delivery.courierName),
      trackingNumber: str(delivery.trackingNumber),
      awbNumber: "",
      status: confirmedAt ? "Receipt Confirmed" : "Ready for Pickup",
      createdAt: str(legacyDispatch?.createdAt) || now(),
      history: (Array.isArray(delivery.history) ? delivery.history : []).map((entry: AnyRecord) => ({
        action: str(entry.action),
        at: str(entry.at),
      })),
    }
    outDispatches.push(dispatch)

    if (confirmedAt) {
      const issuedTotal = issueLines.reduce((sum, line) => sum + line.quantity, 0)
      const receivedTotal = Math.min(issuedTotal, asInt(delivery.receivedQuantity))
      const condition = mapCondition(delivery.receivedCondition)
      const damagedTotal = condition === "Damaged" ? receivedTotal : 0
      const split = splitReceiptQuantity(issueLines.map((line) => line.quantity), receivedTotal, damagedTotal)
      const receiptId = `RCP-${dispatch.id}`
      const lines: ReceiptLine[] = issueLines.map((line, index) => ({
        id: receiptLineId(receiptId, line.itemId),
        itemId: line.itemId,
        name: line.name,
        code: line.code,
        issuedQuantity: line.quantity,
        receivedQuantity: split.received[index],
        damagedQuantity: split.damaged[index],
        missingQuantity: Math.max(0, line.quantity - split.received[index]),
        discrepancyNotes:
          split.damaged[index] > 0 || split.received[index] < line.quantity
            ? str(delivery.receiptNotes) || "Carried over from the previous workflow version."
            : "",
      }))
      const missing = Math.max(0, issuedTotal - receivedTotal)
      receipts.push({
        id: receiptId,
        dispatchId: dispatch.id,
        requestId: request.id,
        receivedDate: str(delivery.receivedDate),
        receivedAt: confirmedAt,
        receiver: str(delivery.contactPerson) || request.requester,
        custodyHolder: request.requester,
        conditionAtReceipt: condition === "Good" ? "Good" : condition === "Used" ? "Used" : "Damaged",
        receiptStatus: damagedTotal > 0 || missing > 0 ? "Discrepancy" : receivedTotal >= issuedTotal ? "Full" : "Partial",
        proofOfDelivery: "",
        notes: str(delivery.receiptNotes),
        lines,
        confirmedAt,
      })
    }
  })

  return { bags, issues, dispatches: outDispatches, receipts }
}

/* ------------------------------------------------------------------- reviews */

const mapDecision = (value: unknown): ReviewCycle["decision"] => {
  const decision = str(value)
  if (decision === "Approved" || decision === "Rejected") return decision
  if (decision === "Changes Required") return "Revision Required"
  if (decision === "Approved with Comments") return "Approved with Comments"
  if (decision === "Deferred") return "Deferred"
  return ""
}

function migrateReviews(raw: AnyRecord[] | null) {
  const reviews = (raw ?? []).flatMap((entry) => {
    const cycles: ReviewCycle[] = (Array.isArray(entry.cycles) ? entry.cycles : []).map(
      (cycle: AnyRecord, index: number): ReviewCycle => {
        const decision = mapDecision(cycle.decision)
        const finalDecision = str(cycle.finalDecision)
        return {
          cycle: asInt(cycle.cycle, index + 1) || index + 1,
          reviewer: str(cycle.reviewer),
          reviewerRole: "Requester",
          reviewerReassigned: false,
          reviewDate: str(cycle.reviewDate),
          nextReviewDate: decision === "Deferred" ? str(cycle.reviewDate) : undefined,
          dueDate: str(cycle.reviewDate),
          status: finalDecision ? "Finalized" : str(cycle.status) === "Review Completed" ? "Decision Recorded" : "Awaiting Review",
          isDraft: Boolean(cycle.isDraft),
          decision,
          comments: str(cycle.comments),
          feedback: str(cycle.feedback),
          followUp: "None",
          returnInstruction: "Coordinator decision",
          finalApproval: finalDecision ? "Approved" : "Pending",
          finalComments: finalDecision ? str(cycle.finalComments) : undefined,
          approvedBy: finalDecision ? str(cycle.nextResponsibleCoordinator) || str(cycle.reviewer) : undefined,
          decisionDate: finalDecision ? str(cycle.decisionDate) : undefined,
          coordinator: str(cycle.nextResponsibleCoordinator),
          history: (Array.isArray(cycle.history) ? cycle.history : []).map((item: AnyRecord) => ({
            action: str(item.action),
            at: str(item.at),
          })),
        }
      }
    )
    if (!cycles.length) return []
    const first = cycles[0]
    const issued = asInt(entry.issuedQuantity)
    const received = asInt(entry.receivedQuantity)
    return [{
      id: `REV-${str(entry.dispatchId) ?? "LEGACY"}-${str(entry.sampleId)}`,
      requestId: str(entry.requestId),
      dispatchId: str(entry.dispatchId),
      receiptId: `RCP-${str(entry.dispatchId)}`,
      itemId: str(entry.sampleId),
      name: str(entry.sampleName),
      code: str(entry.sampleCode),
      issuedQuantity: issued,
      receivedQuantity: received || Math.min(issued, received),
      cycles,
    }]
  })
  return reviews
}

/* ------------------------------------------------------------------ closures */

const dispositionMap: Record<string, DispositionType> = {
  "Returned to Stock": "Returned",
  Damaged: "Returned",
  "Retained by Client": "Retained",
  Consumed: "Consumed",
  Lost: "Lost",
  "Converted to Permanent Sample": "Converted",
}

function migrateClosures(
  requests: SampleRequest[],
  raw: AnyRecord[] | null,
  receiptByRequest: Map<string, SampleReceipt[]>
): ClosureRecord[] {
  return (raw ?? []).flatMap((entry): ClosureRecord[] => {
    const request = requests.find((item) => item.id === str(entry?.request?.id))
    if (!request) return []
    const receivedByItem = new Map<string, number>()
    receiptByRequest.get(request.id)?.forEach((receipt) =>
      receipt.lines.forEach((line) =>
        receivedByItem.set(line.itemId, (receivedByItem.get(line.itemId) ?? 0) + line.receivedQuantity)
      )
    )

    const samples: ClosureSample[] = (Array.isArray(entry.samples) ? entry.samples : []).map(
      (sample: AnyRecord): ClosureSample => {
        const issued = asInt(sample.issuedQuantity)
        const dispositions: Disposition[] = (Array.isArray(sample.dispositions) ? sample.dispositions : [])
          .map((item: AnyRecord): Disposition => ({
            id: str(item.id) || `DISP-${str(sample.sampleId)}-${Math.random().toString(36).slice(2, 8)}`,
            type: dispositionMap[str(item.type)] ?? dispositionMap[str(item.disposition)] ?? "",
            quantity: asInt(item.quantity),
            notes: str(item.notes),
            approvedBy: str(item.approvedBy),
          }))
          .filter((item: Disposition) => Boolean(item.type))
        const returnedDisposition = dispositions
          .filter((item) => item.type === "Returned")
          .reduce((sum, item) => sum + item.quantity, 0)
        const stocked = asInt(sample.stockedQuantity)
        const rawCondition = str(sample.condition)
        const condition =
          rawCondition === "Good"
            ? ("Good" as const)
            : rawCondition === "Damaged" || rawCondition === "Incomplete" || rawCondition === "Unusable" || returnedDisposition > 0
              ? ("Damaged" as const)
              : ""
        return {
          itemId: str(sample.sampleId),
          name: str(sample.sampleName),
          code: str(sample.sampleCode),
          issuedQuantity: issued,
          receivedQuantity: receivedByItem.get(str(sample.sampleId)) ?? 0,
          reviewSummary: str(sample.finalReviewDecision),
          returnRequired: str(sample.returnRequired) !== "No",
          expectedReturnDate: str(sample.expectedReturnDate),
          actualReturnDate: str(sample.actualReturnDate),
          returnedQuantity: Math.min(issued, asInt(sample.returnedQuantity, returnedDisposition)),
          receivedBackQuantity: returnedDisposition || asInt(sample.receivedBackQuantity),
          conditionAtReturn: condition,
          verifiedAt: sample.receiptVerifiedAt ? str(sample.receiptVerifiedAt) : undefined,
          verifiedBy: str(sample.verifiedBy),
          inspectionNotes: str(sample.inspectionNotes),
          stockedQuantity: stocked,
          quarantinedQuantity: Math.max(0, (returnedDisposition || asInt(sample.receivedBackQuantity)) - stocked),
          dispositions,
        }
      }
    )

    const closed = str(entry.closureStatus) === "Closed"
    return [{
      requestId: request.id,
      project: request.project,
      samples,
      closureStatus: closed ? "Closed" : "Pending Closure",
      closureDate: str(entry.closureDate),
      closedBy: str(entry.closedBy),
      closureNotes: str(entry.closureNotes),
      closedAt: entry.closedAt ? str(entry.closedAt) : undefined,
      history: (Array.isArray(entry.history) ? entry.history : []).map((item: AnyRecord) => ({
        action: str(item.action),
        at: str(item.at),
      })),
    }]
  })
}

/* --------------------------------------------------------------------- entry */

export function migrateLegacyWorkflow(read: (key: string) => string | null): WorkflowDocument | null {
  const rawRequests = readJson<AnyRecord[]>(read, LEGACY_KEYS.requests)
  const rawWorkflows = readJson<AnyRecord[]>(read, LEGACY_KEYS.workflows)
  const rawDispatches = readJson<AnyRecord[]>(read, LEGACY_KEYS.dispatches)
  const rawReviews = readJson<AnyRecord[]>(read, LEGACY_KEYS.reviews)
  const rawClosures = readJson<AnyRecord[]>(read, LEGACY_KEYS.closures)
  const rawAdjustments = readJson<AnyRecord[]>(read, LEGACY_KEYS.adjustments)

  const hasLegacyData =
    rawRequests?.length || rawWorkflows?.length || rawDispatches?.length ||
    rawReviews?.length || rawClosures?.length
  if (!hasLegacyData) return null

  const requests = migrateRequests(rawRequests)
  const stage2 = migrateStage2(requests, rawWorkflows, rawDispatches)
  const reviews = migrateReviews(rawReviews)
  const receiptByRequest = new Map<string, SampleReceipt[]>()
  stage2.receipts.forEach((receipt) => {
    receiptByRequest.set(receipt.requestId, [...(receiptByRequest.get(receipt.requestId) ?? []), receipt])
  })
  const closures = migrateClosures(requests, rawClosures, receiptByRequest)

  const document: WorkflowDocument = {
    ...emptyWorkflowDocument(),
    requests,
    bags: stage2.bags,
    issues: stage2.issues,
    dispatches: stage2.dispatches,
    receipts: stage2.receipts,
    reviews,
    closures,
    stockAdjustments: (rawAdjustments ?? []).map((entry): StockAdjustment => ({
      id: str(entry.id),
      requestId: str(entry.requestId),
      itemId: str(entry.sampleId),
      sampleName: str(entry.sampleName),
      quantity: asInt(entry.quantity),
      reason: str(entry.reason) || "Verified good sample return",
      createdAt: str(entry.createdAt) || now(),
    })),
    demoSeeded: false,
  }
  return document
}
