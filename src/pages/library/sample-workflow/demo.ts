/**
 * Realistic demo dataset for the five-stage sample workflow.
 *
 * Built programmatically with the same ids/quantities the real stages write, so
 * the seeded document is internally consistent:
 *
 *  MR-…-0001  Submitted, awaiting coordinator acceptance        (Stage 1 → 2 gate)
 *  MR-…-0002  In Preparation, 2 sample bags, partial stock       (Stage 2)
 *  MR-…-0003  Partial issue + dispatch ready for pickup          (Stage 2 → 3)
 *  MR-…-0004  Partial + damaged receipt, one deferred review     (Stage 3 → 4)
 *  MR-…-0005  Fully received, reviews finalized, partial returns (Stage 4 → 5, one line unaccounted)
 *
 * Inventory is adjusted exactly the way the live stages would adjust it
 * (stock-out at issue, stock-in on verified good return), so Products →
 * Inventory / Stocks / Issued report all agree with the demo.
 */

import type { InventoryItem } from "@/pages/products/inventory-data"
import type {
  ClosureRecord,
  ClosureSample,
  HistoryEntry,
  IssueLine,
  ReceiptLine,
  RequestLine,
  ReviewCycle,
  SampleBag,
  SampleDispatch,
  SampleIssue,
  SampleReceipt,
  SampleRequest,
  StockAdjustment,
  WorkflowDocument,
} from "./types"
import { emptyWorkflowDocument } from "./types"
import { bagLineId, closureSamples, issueLineId, receiptLineId, requestLineId } from "./logic"

const DAY = 24 * 60 * 60 * 1000

const daysAgo = (days: number): string => new Date(Date.now() - days * DAY).toISOString()
const daysFromNow = (days: number): string => new Date(Date.now() + days * DAY).toISOString()
const dateFromNow = (days: number): string => daysFromNow(days).slice(0, 10)
const dateAgo = (days: number): string => daysAgo(days).slice(0, 10)

let counter = 0
const requestId = (): string => `MR-${new Date().getFullYear()}-${String(++counter).padStart(4, "0")}`

const history = (...entries: Array<[string, string]>): HistoryEntry[] =>
  entries.map(([action, at]) => ({ action, at }))

function makeLine(
  requestNumber: number,
  index: number,
  item: InventoryItem,
  quantity: number
): RequestLine {
  return {
    id: requestLineId(`MR-${new Date().getFullYear()}-${String(requestNumber).padStart(4, "0")}`, index),
    itemId: item.id,
    name: item.name,
    code: item.code,
    category: item.category,
    quantity,
    selectedQuantity: quantity,
  }
}

const itemOf = (items: InventoryItem[], id: string): InventoryItem => {
  const item = items.find((entry) => entry.id === id)
  if (!item) throw new Error(`Demo seed: unknown inventory item ${id}`)
  return item
}

/* --------------------------------------------------------------- request 1 */

function buildRequestOne(items: InventoryItem[]): SampleRequest {
  const one = itemOf(items, "IT-1001")
  const two = itemOf(items, "IT-2001")
  const id = requestId()
  return {
    id,
    source: "New Enquiry",
    requestType: "Client presentation",
    project: "Atrium Residences — Lobby",
    space: "Lobby · Ground floor",
    requester: "Jasmine Kaur",
    requesterContactId: "jasmine-kaur",
    organization: "Acme Robotics Pvt. Ltd.",
    phone: "+91 80 4123 8890",
    deliveryContact: "Jasmine Kaur",
    deliveryAddress: "No. 14, Prestige Tech Park, Bengaluru 560103",
    purpose: "Client presentation of curtain options for the lobby refit.",
    priority: "High",
    requiredDate: dateFromNow(10),
    assignedCoordinator: "Ritik Verma",
    assignment: "Sample Coordinator",
    lines: [makeLine(1, 0, one, 8), makeLine(1, 1, two, 4)],
    sampleDetails: `${one.name}, ${two.name}`,
    quantity: 12,
    pendingResolved: false,
    status: "Submitted",
    createdAt: daysAgo(6),
    submittedAt: daysAgo(5),
    history: history(
      ["Request submitted by Jasmine Kaur", daysAgo(5)],
      ["Routed to Sample Coordinator Ritik Verma", daysAgo(5)]
    ),
  }
}

/* --------------------------------------------------------------- request 2 */

function buildRequestTwo(items: InventoryItem[]): { request: SampleRequest; bags: SampleBag[] } {
  const short = itemOf(items, "IT-2007") // stock 5, demand 6 → partial availability
  const full = itemOf(items, "IT-2003")
  const id = requestId()
  const request: SampleRequest = {
    id,
    source: "Existing Project",
    requestType: "Project sample",
    project: "Northwind Logistics — Hub Office",
    space: "Meeting rooms · Level 2",
    requester: "John Doe",
    requesterContactId: "john-doe",
    organization: "Northwind Logistics",
    phone: "+91 20 6788 1200",
    deliveryContact: "John Doe",
    deliveryAddress: "Suite 402, Amar Business Zone, Pune 411045",
    purpose: "Sample pack for the hub office blinds tender.",
    priority: "Normal",
    requiredDate: dateFromNow(7),
    assignedCoordinator: "Ritik Verma",
    assignment: "Self",
    lines: [makeLine(2, 0, short, 6), makeLine(2, 1, full, 3)],
    sampleDetails: `${short.name}, ${full.name}`,
    quantity: 9,
    pendingResolved: false,
    status: "In Preparation",
    createdAt: daysAgo(5),
    submittedAt: daysAgo(4),
    acceptedAt: daysAgo(4),
    preparedAt: daysAgo(3),
    history: history(
      ["Request submitted", daysAgo(4)],
      ["Accepted and assigned by Ritik Verma (Self)", daysAgo(4)],
      ["Stock reservation refreshed — 1 unit awaiting incoming stock", daysAgo(3)]
    ),
  }
  const bagOne: SampleBag = {
    id: "BAG-0001",
    requestId: id,
    name: "Bag 1 · Presentation set",
    stockLocation: "Studio",
    createdAt: daysAgo(3),
    lines: [
      { id: bagLineId("BAG-0001", short.id), requestLineId: request.lines[0].id, itemId: short.id, name: short.name, code: short.code, quantity: 4 },
      { id: bagLineId("BAG-0001", full.id), requestLineId: request.lines[1].id, itemId: full.id, name: full.name, code: full.code, quantity: 3 },
    ],
  }
  const bagTwo: SampleBag = {
    id: "BAG-0002",
    requestId: id,
    name: "Bag 2 · Overflow set",
    stockLocation: "Studio",
    createdAt: daysAgo(3),
    lines: [
      { id: bagLineId("BAG-0002", short.id), requestLineId: request.lines[0].id, itemId: short.id, name: short.name, code: short.code, quantity: 2 },
    ],
  }
  return { request, bags: [bagOne, bagTwo] }
}

/* --------------------------------------------------------------- request 3 */

function buildRequestThree(items: InventoryItem[]): {
  request: SampleRequest
  bag: SampleBag
  issue: SampleIssue
  dispatch: SampleDispatch
} {
  const sheer = itemOf(items, "IT-1003")
  const voile = itemOf(items, "IT-1004")
  const id = requestId()
  const request: SampleRequest = {
    id,
    source: "Existing Lead",
    requestType: "Mock-up",
    project: "Initech Software Labs — Fitout",
    space: "Café & collaboration zones",
    requester: "Dev Patel",
    requesterContactId: "dev-patel",
    organization: "Initech Software Labs",
    phone: "+91 44 4455 1120",
    deliveryContact: "Dev Patel",
    deliveryAddress: "RMZ Ecoworld, Bengaluru 560103",
    purpose: "Mock-up of café sheer curtains for the phased fitout.",
    priority: "Urgent",
    requiredDate: dateFromNow(4),
    assignedCoordinator: "Ritik Verma",
    assignment: "Team Member",
    lines: [makeLine(3, 0, sheer, 6), makeLine(3, 1, voile, 4)],
    sampleDetails: `${sheer.name}, ${voile.name}`,
    quantity: 10,
    pendingResolved: false,
    status: "In Preparation",
    createdAt: daysAgo(4),
    submittedAt: daysAgo(3),
    acceptedAt: daysAgo(3),
    preparedAt: daysAgo(2),
    history: history(
      ["Request submitted", daysAgo(3)],
      ["Accepted and assigned (Team Member)", daysAgo(3)],
      ["Partial issue recorded — 8 of 10 units issued", daysAgo(1)]
    ),
  }
  const bag: SampleBag = {
    id: "BAG-0003",
    requestId: id,
    name: "Bag 1 · Café mock-up",
    stockLocation: "Studio",
    createdAt: daysAgo(2),
    lines: [
      { id: bagLineId("BAG-0003", sheer.id), requestLineId: request.lines[0].id, itemId: sheer.id, name: sheer.name, code: sheer.code, quantity: 6 },
      { id: bagLineId("BAG-0003", voile.id), requestLineId: request.lines[1].id, itemId: voile.id, name: voile.name, code: voile.code, quantity: 4 },
    ],
  }
  const issueLines: IssueLine[] = [
    { id: issueLineId("ISS-0001", sheer.id), bagLineId: bag.lines[0].id, itemId: sheer.id, name: sheer.name, code: sheer.code, quantity: 4 },
    { id: issueLineId("ISS-0001", voile.id), bagLineId: bag.lines[1].id, itemId: voile.id, name: voile.name, code: voile.code, quantity: 4 },
  ]
  const issue: SampleIssue = {
    id: "ISS-0001",
    requestId: id,
    bagId: bag.id,
    issuedAt: daysAgo(1),
    issuedBy: "Ritik Verma",
    issuedTo: "Dev Patel",
    conditionAtIssue: "Good",
    returnByDate: dateFromNow(14),
    lines: issueLines,
  }
  const dispatch: SampleDispatch = {
    id: "DSP-0001",
    requestId: id,
    bagId: bag.id,
    issueId: issue.id,
    method: "Runner",
    pickupLocation: "Studio",
    destination: "Site-Client",
    deliveryAddress: "RMZ Ecoworld, Bengaluru 560103",
    contactPerson: "Dev Patel",
    contactNumber: "+91 44 4455 1120",
    expectedDeliveryDate: dateFromNow(1),
    dispatchedBy: "Ritik Verma",
    dispatchDate: "",
    courierName: "",
    trackingNumber: "",
    awbNumber: "",
    status: "Ready for Pickup",
    createdAt: daysAgo(1),
    history: history(["Dispatch request created from issue ISS-0001", daysAgo(1)]),
  }
  return { request, bag, issue, dispatch }
}

/* --------------------------------------------------------------- request 4 */

function buildRequestFour(items: InventoryItem[]): {
  request: SampleRequest
  bag: SampleBag
  issue: SampleIssue
  dispatch: SampleDispatch
  receipt: SampleReceipt
  deferredReview: WorkflowDocument["reviews"][number]
} {
  const curtain = itemOf(items, "IT-1002")
  const book = itemOf(items, "IT-2002")
  const id = requestId()
  const request: SampleRequest = {
    id,
    source: "Direct Request",
    requestType: "Replacement",
    project: "Atrium Residences — Tower B",
    space: "Apartments 12B & 14A",
    requester: "Jasmine Kaur",
    requesterContactId: "jasmine-kaur",
    organization: "Acme Robotics Pvt. Ltd.",
    phone: "+91 80 4123 8890",
    deliveryContact: "Jasmine Kaur",
    deliveryAddress: "No. 14, Prestige Tech Park, Bengaluru 560103",
    purpose: "Replacement samples after the first set was damaged on site.",
    priority: "High",
    requiredDate: dateAgo(2),
    assignedCoordinator: "Ritik Verma",
    assignment: "Self",
    lines: [makeLine(4, 0, curtain, 5), makeLine(4, 1, book, 3)],
    sampleDetails: `${curtain.name}, ${book.name}`,
    quantity: 8,
    pendingResolved: false,
    status: "In Preparation",
    createdAt: daysAgo(9),
    submittedAt: daysAgo(9),
    acceptedAt: daysAgo(8),
    preparedAt: daysAgo(7),
    history: history(
      ["Request submitted", daysAgo(9)],
      ["Accepted and assigned (Self)", daysAgo(8)],
      ["Issue ISS-0002 recorded — 8 units issued", daysAgo(6)],
      ["Receipt confirmed with discrepancy — 7 of 8 units received", daysAgo(3)]
    ),
  }
  const bag: SampleBag = {
    id: "BAG-0004",
    requestId: id,
    name: "Bag 1 · Replacement set",
    stockLocation: "Studio",
    createdAt: daysAgo(7),
    lines: [
      { id: bagLineId("BAG-0004", curtain.id), requestLineId: request.lines[0].id, itemId: curtain.id, name: curtain.name, code: curtain.code, quantity: 5 },
      { id: bagLineId("BAG-0004", book.id), requestLineId: request.lines[1].id, itemId: book.id, name: book.name, code: book.code, quantity: 3 },
    ],
  }
  const issue: SampleIssue = {
    id: "ISS-0002",
    requestId: id,
    bagId: bag.id,
    issuedAt: daysAgo(6),
    issuedBy: "Ritik Verma",
    issuedTo: "Jasmine Kaur",
    conditionAtIssue: "Good",
    returnByDate: dateFromNow(6),
    lines: [
      { id: issueLineId("ISS-0002", curtain.id), bagLineId: bag.lines[0].id, itemId: curtain.id, name: curtain.name, code: curtain.code, quantity: 5 },
      { id: issueLineId("ISS-0002", book.id), bagLineId: bag.lines[1].id, itemId: book.id, name: book.name, code: book.code, quantity: 3 },
    ],
  }
  const dispatch: SampleDispatch = {
    id: "DSP-0002",
    requestId: id,
    bagId: bag.id,
    issueId: issue.id,
    method: "Courier",
    pickupLocation: "Studio",
    destination: "Site-Client",
    deliveryAddress: "No. 14, Prestige Tech Park, Bengaluru 560103",
    contactPerson: "Jasmine Kaur",
    contactNumber: "+91 80 4123 8890",
    expectedDeliveryDate: dateAgo(4),
    dispatchedBy: "Ritik Verma",
    dispatchDate: dateAgo(6),
    courierName: "BlueDart",
    trackingNumber: "BD-4471902",
    awbNumber: "AWB4471902",
    status: "Receipt Confirmed",
    createdAt: daysAgo(6),
    history: history(
      ["Dispatch request created from issue ISS-0002", daysAgo(6)],
      ["Dispatch status updated to Picked Up", daysAgo(6)],
      ["Dispatch status updated to In Transit", daysAgo(5)],
      ["Dispatch status updated to Delivered", daysAgo(3)],
      ["Receipt confirmed: Discrepancy", daysAgo(3)]
    ),
  }
  const receiptLines: ReceiptLine[] = [
    {
      id: receiptLineId("RCP-DSP-0002", curtain.id),
      itemId: curtain.id,
      name: curtain.name,
      code: curtain.code,
      issuedQuantity: 5,
      receivedQuantity: 4,
      damagedQuantity: 0,
      missingQuantity: 1,
      discrepancyNotes: "One unit missing from the courier bag; carrier claim opened.",
    },
    {
      id: receiptLineId("RCP-DSP-0002", book.id),
      itemId: book.id,
      name: book.name,
      code: book.code,
      issuedQuantity: 3,
      receivedQuantity: 3,
      damagedQuantity: 1,
      missingQuantity: 0,
      discrepancyNotes: "One swatch water-damaged in transit, received for review only.",
    },
  ]
  const receipt: SampleReceipt = {
    id: "RCP-DSP-0002",
    dispatchId: dispatch.id,
    requestId: id,
    receivedDate: dateAgo(3),
    receivedAt: daysAgo(3),
    receiver: "Jasmine Kaur",
    custodyHolder: "Jasmine Kaur",
    conditionAtReceipt: "Damaged",
    receiptStatus: "Discrepancy",
    proofOfDelivery: "Photo · POD-9921",
    notes: "Partial delivery: 1 unit missing, 1 unit damaged on arrival.",
    lines: receiptLines,
    confirmedAt: daysAgo(3),
  }
  const deferredCycle: ReviewCycle = {
    cycle: 1,
    reviewer: "Jasmine Kaur",
    reviewerRole: "Requester",
    reviewerReassigned: false,
    reviewDate: dateAgo(2),
    nextReviewDate: dateFromNow(3),
    dueDate: dateFromNow(3),
    status: "Decision Recorded",
    isDraft: false,
    decision: "Deferred",
    comments: "Deferring until the site visit on Friday with the client.",
    feedback: "",
    followUp: "None",
    returnInstruction: "Coordinator decision",
    finalApproval: "Pending",
    history: history(["Review decision recorded: Deferred", daysAgo(2)]),
  }
  const deferredReview = {
    id: `REV-${dispatch.id}-${curtain.id}`,
    requestId: id,
    dispatchId: dispatch.id,
    receiptId: receipt.id,
    itemId: curtain.id,
    name: curtain.name,
    code: curtain.code,
    issuedQuantity: 5,
    receivedQuantity: 4,
    cycles: [deferredCycle],
  }
  return { request, bag, issue, dispatch, receipt, deferredReview }
}

/* --------------------------------------------------------------- request 5 */

function buildRequestFive(items: InventoryItem[]): {
  request: SampleRequest
  bag: SampleBag
  issue: SampleIssue
  dispatch: SampleDispatch
  receipt: SampleReceipt
  reviews: WorkflowDocument["reviews"]
  closure: ClosureRecord
  adjustments: StockAdjustment[]
} {
  const velvet = itemOf(items, "IT-2004")
  const boucle = itemOf(items, "IT-2005")
  const chenille = itemOf(items, "IT-2006") // requested but never issued → must be resolved before closure
  const id = requestId()
  const request: SampleRequest = {
    id,
    source: "Existing Project",
    requestType: "Project sample",
    project: "Lumen Lighting Co — Showroom",
    space: "Showroom windows",
    requester: "Isha Rao",
    requesterContactId: "isha-rao",
    organization: "Lumen Lighting Co",
    phone: "+91 22 2233 4455",
    deliveryContact: "Isha Rao",
    deliveryAddress: "Lower Parel, Mumbai 400013",
    purpose: "Showroom window treatment samples for the seasonal refresh.",
    priority: "Normal",
    requiredDate: dateAgo(6),
    assignedCoordinator: "Ritik Verma",
    assignment: "Self",
    lines: [
      makeLine(5, 0, velvet, 4),
      makeLine(5, 1, boucle, 3),
      makeLine(5, 2, chenille, 2),
    ],
    sampleDetails: `${velvet.name}, ${boucle.name}, ${chenille.name}`,
    quantity: 9,
    pendingResolved: false,
    status: "In Preparation",
    createdAt: daysAgo(14),
    submittedAt: daysAgo(13),
    acceptedAt: daysAgo(12),
    preparedAt: daysAgo(12),
    history: history(
      ["Request submitted", daysAgo(13)],
      ["Accepted and assigned (Self)", daysAgo(12)],
      ["Issue ISS-0003 recorded — 7 units issued", daysAgo(11)],
      ["Receipt confirmed: Full — 7 of 7 units received", daysAgo(9)],
      ["Stage 4 reviews finalized for both received samples", daysAgo(5)]
    ),
  }
  const bag: SampleBag = {
    id: "BAG-0005",
    requestId: id,
    name: "Bag 1 · Showroom refresh",
    stockLocation: "Studio",
    createdAt: daysAgo(12),
    lines: [
      { id: bagLineId("BAG-0005", velvet.id), requestLineId: request.lines[0].id, itemId: velvet.id, name: velvet.name, code: velvet.code, quantity: 4 },
      { id: bagLineId("BAG-0005", boucle.id), requestLineId: request.lines[1].id, itemId: boucle.id, name: boucle.name, code: boucle.code, quantity: 3 },
      { id: bagLineId("BAG-0005", chenille.id), requestLineId: request.lines[2].id, itemId: chenille.id, name: chenille.name, code: chenille.code, quantity: 2 },
    ],
  }
  const issue: SampleIssue = {
    id: "ISS-0003",
    requestId: id,
    bagId: bag.id,
    issuedAt: daysAgo(11),
    issuedBy: "Ritik Verma",
    issuedTo: "Isha Rao",
    conditionAtIssue: "Good",
    returnByDate: dateAgo(1),
    lines: [
      { id: issueLineId("ISS-0003", velvet.id), bagLineId: bag.lines[0].id, itemId: velvet.id, name: velvet.name, code: velvet.code, quantity: 4 },
      { id: issueLineId("ISS-0003", boucle.id), bagLineId: bag.lines[1].id, itemId: boucle.id, name: boucle.name, code: boucle.code, quantity: 3 },
    ],
  }
  const dispatch: SampleDispatch = {
    id: "DSP-0003",
    requestId: id,
    bagId: bag.id,
    issueId: issue.id,
    method: "Self Pickup",
    pickupLocation: "Studio",
    destination: "Studio",
    deliveryAddress: "Lower Parel, Mumbai 400013",
    contactPerson: "Isha Rao",
    contactNumber: "+91 22 2233 4455",
    expectedDeliveryDate: dateAgo(10),
    dispatchedBy: "Ritik Verma",
    dispatchDate: dateAgo(11),
    courierName: "",
    trackingNumber: "",
    awbNumber: "",
    status: "Receipt Confirmed",
    createdAt: daysAgo(11),
    history: history(
      ["Dispatch request created from issue ISS-0003", daysAgo(11)],
      ["Dispatch status updated to Picked Up", daysAgo(11)],
      ["Dispatch status updated to Delivered", daysAgo(9)],
      ["Receipt confirmed: Full", daysAgo(9)]
    ),
  }
  const receipt: SampleReceipt = {
    id: "RCP-DSP-0003",
    dispatchId: dispatch.id,
    requestId: id,
    receivedDate: dateAgo(9),
    receivedAt: daysAgo(9),
    receiver: "Isha Rao",
    custodyHolder: "Isha Rao",
    conditionAtReceipt: "Good",
    receiptStatus: "Full",
    proofOfDelivery: "Signature · POD-9917",
    notes: "",
    lines: [
      {
        id: receiptLineId("RCP-DSP-0003", velvet.id),
        itemId: velvet.id,
        name: velvet.name,
        code: velvet.code,
        issuedQuantity: 4,
        receivedQuantity: 4,
        damagedQuantity: 0,
        missingQuantity: 0,
        discrepancyNotes: "",
      },
      {
        id: receiptLineId("RCP-DSP-0003", boucle.id),
        itemId: boucle.id,
        name: boucle.name,
        code: boucle.code,
        issuedQuantity: 3,
        receivedQuantity: 3,
        damagedQuantity: 0,
        missingQuantity: 0,
        discrepancyNotes: "",
      },
    ],
    confirmedAt: daysAgo(9),
  }
  const baseCycle = (
    sample: { id: string; name: string; code: string },
    issued: number,
    decision: ReviewCycle["decision"],
    approvedBy: string
  ): WorkflowDocument["reviews"][number] => ({
    id: `REV-${dispatch.id}-${sample.id}`,
    requestId: id,
    dispatchId: dispatch.id,
    receiptId: receipt.id,
    itemId: sample.id,
    name: sample.name,
    code: sample.code,
    issuedQuantity: issued,
    receivedQuantity: issued,
    cycles: [
      {
        cycle: 1,
        reviewer: "Isha Rao",
        reviewerRole: "Requester",
        reviewerReassigned: false,
        reviewDate: dateAgo(7),
        dueDate: dateAgo(7),
        status: "Finalized",
        isDraft: false,
        decision,
        comments: decision === "Approved" ? "Both samples work with the showroom lighting." : "Approved with a note on nap direction.",
        feedback: "",
        followUp: "None",
        returnInstruction: "Return required",
        finalApproval: "Approved",
        finalComments: "Design lead signed off; samples must come back to the studio.",
        approvedBy,
        decisionDate: dateAgo(5),
        coordinator: "Ritik Verma",
        history: history(
          ["Review submitted by requester (default reviewer)", daysAgo(7)],
          [`Review decision recorded: ${decision}`, daysAgo(6)],
          [`Final approval recorded by ${approvedBy}`, daysAgo(5)]
        ),
      },
    ],
  })
  const reviews = [
    baseCycle(velvet, 4, "Approved", "Jasmine Kaur"),
    baseCycle(boucle, 3, "Approved with Comments", "Jasmine Kaur"),
  ]

  // Stage 5: velvet fully verified and back in stock; boucle still outstanding.
  const velvetTemplate = closureSamples(request, { ...emptyWorkflowDocument(), issues: [issue], receipts: [receipt], reviews })
  const velvetSample: ClosureSample = {
    ...velvetTemplate[0],
    returnRequired: true,
    expectedReturnDate: dateAgo(1),
    actualReturnDate: dateAgo(2),
    returnedQuantity: 4,
    receivedBackQuantity: 4,
    conditionAtReturn: "Good",
    verifiedAt: daysAgo(2),
    verifiedBy: "Ritik Verma",
    inspectionNotes: "All four units returned clean; packaging reused.",
    stockedQuantity: 4,
    quarantinedQuantity: 0,
    dispositions: [
      { id: `DISP-${velvet.id}-1`, type: "Returned", quantity: 4, notes: "Verified good return, posted to stock.", approvedBy: "" },
    ],
  }
  const boucleSample: ClosureSample = {
    ...velvetTemplate[1],
    returnRequired: true,
    expectedReturnDate: dateAgo(1),
  }
  const chenilleSample: ClosureSample = {
    ...velvetTemplate[2],
    returnRequired: true,
    expectedReturnDate: dateAgo(1),
  }

  const closure: ClosureRecord = {
    requestId: id,
    project: request.project,
    samples: [velvetSample, boucleSample, chenilleSample],
    closureStatus: "Pending Closure",
    closureDate: "",
    closedBy: "",
    closureNotes: "",
    history: history(["Return verified: 4 unit(s) of " + velvet.name + " returned to stock", daysAgo(2)]),
  }
  const adjustment: StockAdjustment = {
    id: `${id}:${velvet.id}:4`,
    requestId: id,
    itemId: velvet.id,
    sampleName: velvet.name,
    quantity: 4,
    reason: "Verified good sample return",
    createdAt: daysAgo(2),
  }
  return { request, bag, issue, dispatch, receipt, reviews, closure, adjustments: [adjustment] }
}

/* -------------------------------------------------------------------- entry */

export type DemoSeed = {
  document: WorkflowDocument
  items: InventoryItem[]
}

/**
 * Returns the demo document plus the inventory snapshot it implies
 * (issues subtract stock, verified good returns add it back).
 */
export function buildDemoWorkflow(currentItems: InventoryItem[]): DemoSeed {
  counter = 0
  const items = currentItems.map((item) => ({ ...item }))

  const one = buildRequestOne(items)
  const two = buildRequestTwo(items)
  const three = buildRequestThree(items)
  const four = buildRequestFour(items)
  const five = buildRequestFive(items)

  const issues = [three.issue, four.issue, five.issue]
  const issuedDelta = new Map<string, number>()
  issues.forEach((issue) =>
    issue.lines.forEach((line) =>
      issuedDelta.set(line.itemId, (issuedDelta.get(line.itemId) ?? 0) + line.quantity)
    )
  )
  five.closure.samples.forEach((sample) => {
    if (sample.stockedQuantity > 0) {
      issuedDelta.set(sample.itemId, (issuedDelta.get(sample.itemId) ?? 0) - sample.stockedQuantity)
    }
  })

  const seededItems = items.map((item) => ({
    ...item,
    stock: Math.max(0, item.stock - (issuedDelta.get(item.id) ?? 0)),
  }))

  const document: WorkflowDocument = {
    ...emptyWorkflowDocument(),
    requests: [one, two.request, three.request, four.request, five.request],
    bags: [...two.bags, three.bag, four.bag, five.bag],
    issues,
    dispatches: [three.dispatch, four.dispatch, five.dispatch],
    receipts: [four.receipt, five.receipt],
    reviews: [four.deferredReview, ...five.reviews],
    closures: [five.closure],
    stockAdjustments: five.adjustments,
    notifications: [],
    demoSeeded: true,
  }

  return { document, items: seededItems }
}
