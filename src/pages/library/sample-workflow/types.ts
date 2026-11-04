/**
 * Sample Management — shared domain types for the five-stage workflow.
 *
 * These types are the single contract between Stage 1 … Stage 5. They follow
 * the Sample Management Operational Specification data model (§07):
 * request → request_line → bag/bag_line → issue/issue_line → dispatch/dispatch_line
 *          → receipt/receipt_line → review/review_line → return/closure.
 *
 * Frontend only: every record lives in localStorage (see `store.ts`). The shape
 * is deliberately API-friendly — each record has a stable id and a parent id so
 * the same objects can later be created/updated through REST endpoints without
 * rewriting the UI.
 */

export type HistoryEntry = { action: string; at: string }

/* ------------------------------------------------------------------ Stage 1 */

export type RequestSource =
  | "New Enquiry"
  | "Existing Lead"
  | "Existing Project"
  | "Direct Request"

export type RequestPriority = "Urgent" | "High" | "Normal" | "Low"

/** Assignment action accepted by the Sample Coordinator (spec §01). */
export type Assignment = "Self" | "Sample Coordinator" | "Team Member"

/**
 * Request lifecycle (spec §01): Draft → Submitted → Assigned → In Preparation → Closed.
 * Draft never becomes visible to Stage 2; Submitted requests become visible and
 * must be accepted (Assigned) before stock can be reserved.
 */
export type RequestStatus = "Draft" | "Submitted" | "Assigned" | "In Preparation" | "Closed"

export type RequestLine = {
  /** request_line_id */
  id: string
  itemId: string
  name: string
  code: string
  category: string
  /** Quantity requested in Stage 1 (immutable once submitted). */
  quantity: number
  /** Quantity Stage 2 will try to fulfil (≤ quantity). */
  selectedQuantity: number
}

export type SampleRequest = {
  /** request_id — MR-YYYY-0001 */
  id: string
  source: RequestSource
  requestType: string
  project: string
  space: string
  requester: string
  requesterContactId: string
  organization: string
  phone: string
  deliveryContact: string
  deliveryAddress: string
  purpose: string
  /** Current Sample Request Priority — independent from the organisation tag. */
  priority: RequestPriority
  requiredDate: string
  assignedCoordinator: string
  assignment: Assignment
  lines: RequestLine[]
  /** Derived display string (joined line names). */
  sampleDetails: string
  /** Derived total requested units. */
  quantity: number
  /** True once unissued pending demand has been cancelled (Stage 5 gate). */
  pendingResolved: boolean
  status: RequestStatus
  createdAt: string
  submittedAt?: string
  acceptedAt?: string
  preparedAt?: string
  closedAt?: string
  history: HistoryEntry[]
}

/* ------------------------------------------------------------------ Stage 2 */

export type BagLine = {
  /** bag_line_id */
  id: string
  requestLineId: string
  itemId: string
  name: string
  code: string
  quantity: number
}

export type SampleBag = {
  /** bag_id */
  id: string
  requestId: string
  name: string
  stockLocation: string
  createdAt: string
  lines: BagLine[]
}

export type IssueLine = {
  /** issue_line_id */
  id: string
  bagLineId: string
  itemId: string
  name: string
  code: string
  /** Physically issued units — never copied from requested or received qty. */
  quantity: number
}

export type SampleIssue = {
  /** issue_id */
  id: string
  requestId: string
  bagId: string
  issuedAt: string
  issuedBy: string
  issuedTo: string
  conditionAtIssue: SampleCondition
  returnByDate: string
  lines: IssueLine[]
}

export type SampleCondition = "Good" | "Used" | "Damaged"

/* ------------------------------------------------------------------ Stage 3 */

export type DeliveryMethod = "Self Pickup" | "Runner" | "Courier" | "Internal Transfer"
export type PickupLocation = "Studio" | "Store-Warehouse" | "Vendor"
export type DeliveryDestination = "Site-Client" | "Studio" | "Project Office" | "Other"

export type DispatchStatus =
  | "Ready for Pickup"
  | "Picked Up"
  | "In Transit"
  | "Delivered"
  | "Receipt Confirmed"

export type SampleDispatch = {
  /** dispatch_id */
  id: string
  requestId: string
  bagId: string
  issueId: string
  method: DeliveryMethod | ""
  pickupLocation: PickupLocation | ""
  destination: DeliveryDestination | ""
  deliveryAddress: string
  contactPerson: string
  contactNumber: string
  expectedDeliveryDate: string
  dispatchedBy: string
  dispatchDate: string
  courierName: string
  trackingNumber: string
  awbNumber: string
  status: DispatchStatus
  createdAt: string
  history: HistoryEntry[]
}

export type ReceiptStatus = "Full" | "Partial" | "Discrepancy"

export type ReceiptLine = {
  /** receipt_line_id */
  id: string
  itemId: string
  name: string
  code: string
  /** Snapshot of the issued quantity for this dispatch line. */
  issuedQuantity: number
  /** Physically received units (damaged units included) — ≤ issuedQuantity. */
  receivedQuantity: number
  /** Units received but damaged — ≤ receivedQuantity. */
  damagedQuantity: number
  /** issued − received (derived, kept for read-only display). */
  missingQuantity: number
  discrepancyNotes: string
}

export type SampleReceipt = {
  /** receipt_id */
  id: string
  dispatchId: string
  requestId: string
  receivedDate: string
  receivedAt: string
  receiver: string
  custodyHolder: string
  conditionAtReceipt: SampleCondition | ""
  receiptStatus: ReceiptStatus
  proofOfDelivery: string
  notes: string
  lines: ReceiptLine[]
  confirmedAt: string
}

/* ------------------------------------------------------------------ Stage 4 */

export type ReviewDecision =
  | "Approved"
  | "Approved with Comments"
  | "Revision Required"
  | "Rejected"
  | "Deferred"

export type ReviewFollowUp = "Replace" | "Resubmit" | "Request Quotation" | "None"

export type ReviewStatus =
  | "Awaiting Review"
  | "Under Review"
  | "Decision Recorded"
  | "Revision Requested"
  | "Finalized"

export type FinalApproval = "Pending" | "Approved" | "Not Required"

export type ReviewerRole = "Requester" | "Studio" | "Client" | "Project Owner"

export type ReturnInstruction = "Return required" | "Retention approved" | "Coordinator decision"

export type ReviewCycle = {
  cycle: number
  reviewer: string
  reviewerRole: ReviewerRole
  reviewerReassigned: boolean
  reviewDate: string
  /** Mandatory when the decision is Deferred (spec §04). */
  nextReviewDate?: string
  dueDate: string
  status: ReviewStatus
  isDraft: boolean
  decision: ReviewDecision | ""
  comments: string
  feedback: string
  followUp: ReviewFollowUp
  returnInstruction: ReturnInstruction
  /** Separate from the review decision (spec §04). */
  finalApproval: FinalApproval
  finalComments?: string
  approvedBy?: string
  decisionDate?: string
  coordinator?: string
  history: HistoryEntry[]
}

export type SampleReview = {
  /** review_id */
  id: string
  requestId: string
  dispatchId: string
  receiptId: string
  itemId: string
  name: string
  code: string
  /** Snapshot from Stage 2 — never the requested quantity. */
  issuedQuantity: number
  /** Snapshot from Stage 3 — only confirmed received units are review-ready. */
  receivedQuantity: number
  cycles: ReviewCycle[]
}

export type ReviewNotification = {
  id: string
  requestId: string
  reviewId: string
  sampleName: string
  coordinator: string
  decision: ReviewDecision
  comments: string
  createdAt: string
  read: boolean
}

/* ------------------------------------------------------------------ Stage 5 */

export type DispositionType = "Returned" | "Retained" | "Consumed" | "Lost" | "Converted"

export type Disposition = {
  id: string
  type: DispositionType | ""
  quantity: number
  notes: string
  /** Required for Retained / Lost dispositions (authorised approval, spec §05). */
  approvedBy: string
}

export type ReturnCondition = "Good" | "Damaged" | "Unusable"

export type ClosureSample = {
  itemId: string
  name: string
  code: string
  /** Aggregated physical stock-out across every issue for this request. */
  issuedQuantity: number
  /** Aggregated confirmed receipt quantity (read-only, Stage 3). */
  receivedQuantity: number
  /** Latest Stage 4 final approval summary (read-only). */
  reviewSummary: string
  returnRequired: boolean
  expectedReturnDate: string
  actualReturnDate: string
  /** Units the holder committed to send back. */
  returnedQuantity: number
  /** Units physically received back (≤ returnedQuantity). */
  receivedBackQuantity: number
  conditionAtReturn: ReturnCondition | ""
  verifiedAt?: string
  verifiedBy: string
  inspectionNotes: string
  /** Good units already posted to available stock (idempotency guard). */
  stockedQuantity: number
  /** Damaged/Unusable units parked in quarantine (never available stock). */
  quarantinedQuantity: number
  dispositions: Disposition[]
}

export type ClosureStatus = "Pending Closure" | "Ready to Close" | "Closed"

export type ClosureRecord = {
  requestId: string
  project: string
  samples: ClosureSample[]
  closureStatus: ClosureStatus
  closureDate: string
  closedBy: string
  closureNotes: string
  closedAt?: string
  history: HistoryEntry[]
}

export type StockAdjustment = {
  /** `${requestId}:${itemId}:${quantity}` — unique, prevents double posting. */
  id: string
  requestId: string
  itemId: string
  sampleName: string
  quantity: number
  reason: "Verified good sample return" | "Quarantine receipt (no stock change)" | string
  createdAt: string
}

/* ---------------------------------------------------------------- Document */

export type WorkflowDocument = {
  version: 2
  requests: SampleRequest[]
  bags: SampleBag[]
  issues: SampleIssue[]
  dispatches: SampleDispatch[]
  receipts: SampleReceipt[]
  reviews: SampleReview[]
  closures: ClosureRecord[]
  stockAdjustments: StockAdjustment[]
  notifications: ReviewNotification[]
  demoSeeded: boolean
}

export const emptyWorkflowDocument = (): WorkflowDocument => ({
  version: 2,
  requests: [],
  bags: [],
  issues: [],
  dispatches: [],
  receipts: [],
  reviews: [],
  closures: [],
  stockAdjustments: [],
  notifications: [],
  demoSeeded: false,
})

/* -------------------------------------------------------------- option sets */

export const REQUEST_SOURCES: RequestSource[] = [
  "New Enquiry",
  "Existing Lead",
  "Existing Project",
  "Direct Request",
]

export const REQUEST_PRIORITIES: RequestPriority[] = ["Urgent", "High", "Normal", "Low"]

export const REQUEST_TYPES = ["Project sample", "Client presentation", "Mock-up", "Replacement"]

export const ASSIGNMENTS: Assignment[] = ["Self", "Sample Coordinator", "Team Member"]

export const DELIVERY_METHODS: DeliveryMethod[] = [
  "Self Pickup",
  "Runner",
  "Courier",
  "Internal Transfer",
]

export const PICKUP_LOCATIONS: PickupLocation[] = ["Studio", "Store-Warehouse", "Vendor"]

export const DELIVERY_DESTINATIONS: DeliveryDestination[] = [
  "Site-Client",
  "Studio",
  "Project Office",
  "Other",
]

export const DISPATCH_STATUSES: DispatchStatus[] = [
  "Ready for Pickup",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Receipt Confirmed",
]

export const SAMPLE_CONDITIONS: SampleCondition[] = ["Good", "Used", "Damaged"]

export const REVIEW_DECISIONS: ReviewDecision[] = [
  "Approved",
  "Approved with Comments",
  "Revision Required",
  "Rejected",
  "Deferred",
]

export const REVIEW_FOLLOW_UPS: ReviewFollowUp[] = [
  "Replace",
  "Resubmit",
  "Request Quotation",
  "None",
]

export const REVIEWER_ROLES: ReviewerRole[] = ["Requester", "Studio", "Client", "Project Owner"]

export const RETURN_CONDITIONS: ReturnCondition[] = ["Good", "Damaged", "Unusable"]

export const DISPOSITION_TYPES: DispositionType[] = [
  "Returned",
  "Retained",
  "Consumed",
  "Lost",
  "Converted",
]
