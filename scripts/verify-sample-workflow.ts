import assert from "node:assert/strict"
import type { InventoryItem } from "../src/pages/products/inventory-data"
import type { WorkflowDocument } from "../src/pages/library/sample-workflow/types"
import { emptyWorkflowDocument } from "../src/pages/library/sample-workflow/types"
import {
  acceptRequest,
  addBag,
  addDisposition,
  closeRequest,
  confirmReceipt,
  createDispatch,
  createIssue,
  createRequest,
  recordFinalApproval,
  recordReviewDecision,
  resolvePendingDemand,
  startReview,
  submitRequest,
  verifyReturn,
} from "../src/pages/library/sample-workflow/operations"
import {
  allocateReservations,
  buildIssuedReportProjection,
  closureBlockers,
  closureSamples,
  dispositionTotal,
  isFinalized,
  latestCycle,
  suggestReceiptStatus,
  validateIssue,
  validateReceipt,
} from "../src/pages/library/sample-workflow/logic"
import { mergedClosureRecord } from "../src/pages/library/sample-workflow/operations"

const items = (): InventoryItem[] =>
  ["A", "B", "C", "D", "E"].map((id) => ({
    id,
    name: `Sample ${id}`,
    code: id,
    category: "Sample books",
    finish: "Audit",
    size: "Unit",
    stock: 0,
    color: "#cccccc",
    isSample: true,
  }))

const sampleLine = (id: string, quantity: number) => ({
  id: "",
  itemId: id,
  name: `Sample ${id}`,
  code: id,
  category: "Sample books",
  quantity,
  selectedQuantity: quantity,
})

function makeRequest(
  document: WorkflowDocument,
  lines: Array<{ itemId: string; quantity: number }>,
  status: "Submitted" | "Assigned" | "In Preparation" = "Assigned",
  project = "Verification project"
) {
  const itemList = items()
  const draft = createRequest(document, {
    source: "Direct Request",
    requestType: "Project sample",
    project,
    requester: "Verifier",
    organization: "Verification",
    phone: "000",
    deliveryContact: "Verifier",
    deliveryAddress: "Verification address",
    purpose: "Workflow verification",
    priority: "Normal",
    requiredDate: "2026-12-01",
    assignedCoordinator: "Coordinator",
    lines: lines.map((line) => sampleLine(line.itemId, line.quantity)),
  })
  const created = draft.document.requests[draft.document.requests.length - 1]
  const submitted = submitRequest(draft.document, created.id)
  assert.equal(submitted.error, null)
  if (status === "Submitted") return { document: submitted.document, request: created }
  const accepted = acceptRequest(submitted.document, created.id)
  assert.equal(accepted.error, null)
  const request = accepted.document.requests.find((entry) => entry.id === created.id)!
  return { document: accepted.document, request, itemList }
}

function bagFor(
  document: WorkflowDocument,
  requestId: string,
  lines: Array<{ itemId: string; quantity: number }>,
  name = "Test bag"
) {
  const result = addBag(document, {
    requestId,
    name,
    stockLocation: "Studio",
    lines,
  })
  assert.equal(result.error, null, result.error ?? "")
  return { document: result.document, bag: result.document.bags[result.document.bags.length - 1] }
}

function issueFor(
  document: WorkflowDocument,
  stock: InventoryItem[],
  requestId: string,
  bagId: string,
  quantities: Record<string, number>,
) {
  const result = createIssue(document, stock, {
    requestId,
    bagId,
    quantities,
    issuedBy: "Coordinator",
    issuedTo: "Requester",
    conditionAtIssue: "Good",
    returnByDate: "2026-12-20",
  })
  assert.equal(result.error, null, result.error ?? "")
  return result
}

function dispatchFor(document: WorkflowDocument, issueId: string) {
  const issue = document.issues.find((entry) => entry.id === issueId)!
  const result = createDispatch(document, {
    requestId: issue.requestId,
    issueId,
    method: "Courier",
    pickupLocation: "Studio",
    destination: "Site-Client",
    deliveryAddress: "Verification address",
    contactPerson: "Requester",
    contactNumber: "000",
    expectedDeliveryDate: "2026-12-10",
    dispatchedBy: "Coordinator",
    courierName: "Test Courier",
  })
  assert.equal(result.error, null, result.error ?? "")
  return result
}

function receiptFor(
  document: WorkflowDocument,
  dispatchId: string,
  entries: Array<{ itemId: string; receivedQuantity: number; damagedQuantity?: number; discrepancyNotes?: string }>,
  conditionAtReceipt: "Good" | "Used" | "Damaged" = "Good",
  notes = "Verification notes"
) {
  return confirmReceipt(document, {
    dispatchId,
    receivedDate: "2026-12-11",
    receiver: "Requester",
    custodyHolder: "Requester",
    conditionAtReceipt,
    proofOfDelivery: "",
    notes,
    lines: entries.map((entry) => ({
      itemId: entry.itemId,
      receivedQuantity: entry.receivedQuantity,
      damagedQuantity: entry.damagedQuantity ?? 0,
      discrepancyNotes: entry.discrepancyNotes ?? notes,
    })),
  })
}

const tests: Array<[string, () => void]> = []
const test = (name: string, fn: () => void) => tests.push([name, fn])

test("1. Stage 1 submit and acceptance preserve request/sample IDs", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const line = made.request.lines[0]
  assert.match(made.request.id, /^MR-/)
  assert.equal(line.itemId, "A")
  assert.equal(line.quantity, 8)
  assert.equal(made.document.requests[0].status, "Assigned")
})

test("2. Requested 8 / available 8 reserves 8", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 8 } : item)
  const allocation = allocateReservations(made.document.requests, [], stock)[made.request.id]
  assert.equal(allocation.lines.A.reserved, 8)
  assert.equal(allocation.lines.A.pending, 0)
})

test("3. Requested 8 / available 4 reserves 4 and leaves 4 pending", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 4 } : item)
  const line = allocateReservations(made.document.requests, [], stock)[made.request.id].lines.A
  assert.equal(line.reserved, 4)
  assert.equal(line.pending, 4)
})

test("4. Requested 8 / available 0 leaves 8 pending", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const line = allocateReservations(made.document.requests, [], items())[made.request.id].lines.A
  assert.equal(line.reserved, 0)
  assert.equal(line.pending, 8)
})

test("5. Incoming stock is assigned to the oldest pending request first", () => {
  let doc = emptyWorkflowDocument()
  const first = makeRequest(doc, [{ itemId: "A", quantity: 8 }], "Assigned", "First")
  doc = first.document
  const second = makeRequest(doc, [{ itemId: "A", quantity: 8 }], "Assigned", "Second")
  doc = second.document
  const low = items().map((item) => item.id === "A" ? { ...item, stock: 4 } : item)
  assert.equal(allocateReservations(doc.requests, [], low)[first.request.id].lines.A.reserved, 4)
  const replenished = low.map((item) => item.id === "A" ? { ...item, stock: 8 } : item)
  const next = allocateReservations(doc.requests, [], replenished)
  assert.equal(next[first.request.id].lines.A.reserved, 8)
  assert.equal(next[second.request.id].lines.A.reserved, 0)
})

test("6. Multiple requested samples retain individual quantities and allocations", () => {
  const made = makeRequest(emptyWorkflowDocument(), [
    { itemId: "A", quantity: 8 },
    { itemId: "B", quantity: 5 },
  ])
  const stock = items().map((item) =>
    item.id === "A" ? { ...item, stock: 3 } : item.id === "B" ? { ...item, stock: 2 } : item
  )
  const lines = allocateReservations(made.document.requests, [], stock)[made.request.id].lines
  assert.deepEqual([lines.A.stage1Quantity, lines.A.reserved, lines.A.pending], [8, 3, 5])
  assert.deepEqual([lines.B.stage1Quantity, lines.B.reserved, lines.B.pending], [5, 2, 3])
})

test("7. Multiple bags cannot stage more than the sample request quantity", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const first = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 4 }], "Bag one")
  const second = bagFor(first.document, made.request.id, [{ itemId: "A", quantity: 4 }], "Bag two")
  const duplicate = addBag(second.document, {
    requestId: made.request.id, name: "Bag three", stockLocation: "Studio",
    lines: [{ itemId: "A", quantity: 1 }],
  })
  assert.equal(second.document.bags.length, 2)
  assert.ok(duplicate.error?.includes("remain unstaged"))
})

test("8. Partial issue deducts only issued units and preserves remaining demand", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 8 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 8 }])
  const result = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 3 })
  assert.equal(result.items.find((item) => item.id === "A")?.stock, 5)
  assert.equal(result.document.issues[0].lines[0].quantity, 3)
  assert.equal(allocateReservations(result.document.requests, result.document.issues, result.items)[made.request.id].lines.A.remaining, 5)
})

test("9. Multiple partial issues from one bag remain bounded and do not double deduct", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 8 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 8 }])
  const first = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 3 })
  const second = issueFor(first.document, first.items, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 2 })
  assert.equal(second.items.find((item) => item.id === "A")?.stock, 3)
  assert.equal(second.document.issues.reduce((sum, issue) => sum + issue.lines[0].quantity, 0), 5)
  const invalid = validateIssue({
    request: second.document.requests[0], bagId: bag.bag.id, bagLines: bag.bag.lines,
    quantities: { [bag.bag.lines[0].id]: 4 }, issuedBy: "Coordinator", issuedTo: "Requester",
    conditionAtIssue: "Good", returnByDate: "2026-12-20", issues: second.document.issues,
    allocation: allocateReservations(second.document.requests, second.document.issues, second.items),
  })
  assert.ok(invalid)
})

test("10. Multiple dispatches preserve each issue and parent request", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 8 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 8 } : item)
  const bag1 = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 4 }], "Bag one")
  const bag2 = bagFor(bag1.document, made.request.id, [{ itemId: "A", quantity: 4 }], "Bag two")
  const issue1 = issueFor(bag2.document, stock, made.request.id, bag1.bag.id, { [bag1.bag.lines[0].id]: 2 })
  const issue2 = issueFor(issue1.document, issue1.items, made.request.id, bag2.bag.id, { [bag2.bag.lines[0].id]: 2 })
  const dispatch1 = dispatchFor(issue2.document, issue1.document.issues[0].id)
  const dispatch2 = dispatchFor(dispatch1.document, issue2.document.issues[1].id)
  assert.equal(dispatch2.document.dispatches.length, 2)
  assert.ok(dispatch2.document.dispatches.every((dispatch) => dispatch.requestId === made.request.id))
})

test("11. Multiple partial receipts accumulate to the issued quantity", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 4 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 4 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 4 }])
  const issued = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 4 })
  const dispatched = dispatchFor(issued.document, issued.document.issues[0].id)
  const dispatch = dispatched.document.dispatches[0]
  const first = receiptFor(dispatched.document, dispatch.id, [{ itemId: "A", receivedQuantity: 2, discrepancyNotes: "Two still in transit" }])
  assert.equal(first.error, null)
  const second = receiptFor(first.document, dispatch.id, [{ itemId: "A", receivedQuantity: 2 }])
  assert.equal(second.error, null)
  const totals = second.document.receipts.flatMap((receipt) => receipt.lines)
    .reduce((sum, line) => sum + line.receivedQuantity, 0)
  assert.equal(totals, 4)
  assert.equal(second.document.dispatches[0].status, "Receipt Confirmed")
})

test("12. Damaged and missing receipt quantities require notes and cannot exceed issue", () => {
  const line = { id: "R-A", itemId: "A", name: "Sample A", code: "A", issuedQuantity: 4, receivedQuantity: 3, damagedQuantity: 1, missingQuantity: 1, discrepancyNotes: "" }
  const missingNotes = validateReceipt({ lines: [line], status: "Discrepancy", receiver: "Receiver", receivedDate: "2026-12-11", conditionAtReceipt: "Damaged", notes: "" })
  assert.ok(missingNotes?.includes("discrepancy notes"))
  assert.equal(validateReceipt({ lines: [{ ...line, discrepancyNotes: "Damaged and one missing" }], status: "Discrepancy", receiver: "Receiver", receivedDate: "2026-12-11", conditionAtReceipt: "Damaged", notes: "Documented" }), null)
  assert.ok(validateReceipt({ lines: [{ ...line, receivedQuantity: 5, damagedQuantity: 0, missingQuantity: 0, discrepancyNotes: "" }], status: "Full", receiver: "Receiver", receivedDate: "2026-12-11", conditionAtReceipt: "Good", notes: "" }))

  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 4 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 4 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 4 }])
  const issued = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 4 })
  const dispatch = dispatchFor(issued.document, issued.document.issues[0].id)
  const pending = receiptFor(dispatch.document, dispatch.document.dispatches[0].id, [{ itemId: "A", receivedQuantity: 0, discrepancyNotes: "Delivery not received" }])
  assert.equal(pending.error, null)
  assert.equal(pending.document.receipts[0].receiptStatus, "Pending")
  assert.equal(pending.document.dispatches[0].status, "Delivered")
  assert.equal(pending.document.reviews.length, 0)
})

test("13. Review decisions are sample-specific and deferred review needs a date", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 2 }, { itemId: "B", quantity: 2 }])
  const stock = items().map((item) => ["A", "B"].includes(item.id) ? { ...item, stock: 2 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 2 }, { itemId: "B", quantity: 2 }])
  const issued = issueFor(bag.document, stock, made.request.id, bag.bag.id, Object.fromEntries(bag.bag.lines.map((line) => [line.id, 2])))
  const dispatch = dispatchFor(issued.document, issued.document.issues[0].id)
  const received = receiptFor(dispatch.document, dispatch.document.dispatches[0].id, [{ itemId: "A", receivedQuantity: 2 }, { itemId: "B", receivedQuantity: 2 }])
  assert.equal(received.error, null)
  const revA = received.document.reviews.find((review) => review.itemId === "A")!
  const started = startReview(received.document, {
    reviewId: revA.id, reviewer: "Studio", reviewerRole: "Studio", dueDate: "2026-12-12",
  })
  assert.equal(started.error, null)
  assert.equal(started.document.reviews.find((review) => review.id === revA.id)?.cycles[0].status, "Under Review")
  const failed = recordReviewDecision(started.document, {
    requestId: made.request.id, reviewId: revA.id, reviewer: "Studio", reviewerRole: "Studio",
    reviewDate: "2026-12-12", dueDate: "2026-12-12", decision: "Deferred", comments: "", feedback: "",
    followUp: "None", returnInstruction: "Coordinator decision",
  })
  assert.ok(failed.error?.includes("next review date"))
  const deferred = recordReviewDecision(started.document, {
    requestId: made.request.id, reviewId: revA.id, reviewer: "Studio", reviewerRole: "Studio",
    reviewDate: "2026-12-12", dueDate: "2026-12-12", nextReviewDate: "2026-12-20",
    decision: "Deferred", comments: "", feedback: "", followUp: "None", returnInstruction: "Coordinator decision",
  })
  assert.equal(deferred.error, null)
  assert.equal(deferred.document.reviews.find((review) => review.id === revA.id)?.cycles.length, 1)
  assert.notEqual(deferred.document.reviews.find((review) => review.itemId === "B")?.cycles.length, 1)
})

test("14. Revision cycles preserve prior decisions and feedback", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 1 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 1 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 1 }])
  const issued = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 1 })
  const dispatch = dispatchFor(issued.document, issued.document.issues[0].id)
  const received = receiptFor(dispatch.document, dispatch.document.dispatches[0].id, [{ itemId: "A", receivedQuantity: 1 }])
  const review = received.document.reviews[0]
  const first = recordReviewDecision(received.document, {
    requestId: made.request.id, reviewId: review.id, reviewer: "Client", reviewerRole: "Client",
    reviewDate: "2026-12-12", dueDate: "2026-12-12", decision: "Revision Required",
    comments: "", feedback: "Revise color", followUp: "Resubmit", returnInstruction: "Return required",
  })
  assert.equal(first.error, null)
  const second = recordReviewDecision(first.document, {
    requestId: made.request.id, reviewId: review.id, reviewer: "Client", reviewerRole: "Client",
    reviewDate: "2026-12-20", dueDate: "2026-12-20", decision: "Approved",
    comments: "", feedback: "", followUp: "None", returnInstruction: "Return required",
  })
  const cycles = second.document.reviews[0].cycles
  assert.equal(cycles.length, 2)
  assert.equal(cycles[0].feedback, "Revise color")
  assert.equal(cycles[1].decision, "Approved")
})

test("15. Partial verified good returns stock once and all disposition types keep unique IDs", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 6 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 6 } : item)
  const bag = bagFor(made.document, made.request.id, [{ itemId: "A", quantity: 6 }])
  const issued = issueFor(bag.document, stock, made.request.id, bag.bag.id, { [bag.bag.lines[0].id]: 6 })
  const dispatch = dispatchFor(issued.document, issued.document.issues[0].id)
  let doc = receiptFor(dispatch.document, dispatch.document.dispatches[0].id, [{ itemId: "A", receivedQuantity: 6 }]).document
  const review = doc.reviews[0]
  doc = recordReviewDecision(doc, {
    requestId: made.request.id, reviewId: review.id, reviewer: "Studio", reviewerRole: "Studio",
    reviewDate: "2026-12-12", dueDate: "2026-12-12", decision: "Approved",
    comments: "", feedback: "", followUp: "None", returnInstruction: "Return required",
  }).document
  doc = recordFinalApproval(doc, {
    reviewId: review.id, finalApproval: "Approved", decisionDate: "2026-12-12",
    approvedBy: "Approver", coordinator: "Coordinator", finalComments: "",
  }).document
  const returned = verifyReturn(doc, issued.items, made.request.id, "A", {
    receivedBackQuantity: 1, conditionAtReturn: "Good", verifiedBy: "Coordinator",
    inspectionNotes: "Good", actualReturnDate: "2026-12-22",
  })
  assert.equal(returned.error, null)
  const repeated = verifyReturn(returned.document, returned.items, made.request.id, "A", {
    receivedBackQuantity: 1, conditionAtReturn: "Good", verifiedBy: "Coordinator",
    inspectionNotes: "Good", actualReturnDate: "2026-12-22",
  })
  assert.equal(repeated.items.find((item) => item.id === "A")?.stock, 1)
  let closureDoc = returned.document
  const types = ["Returned", "Damaged", "Retained", "Consumed", "Lost", "Converted"] as const
  for (const type of types) {
    const result = addDisposition(closureDoc, made.request.id, "A", {
      type, quantity: 1, notes: "Verified disposition",
      approvedBy: type === "Retained" || type === "Lost" ? "Approver" : "",
    })
    assert.equal(result.error, null, result.error ?? "")
    closureDoc = result.document
  }
  const record = mergedClosureRecord(closureDoc, made.request.id)!
  assert.equal(dispositionTotal(record.samples[0]), 6)
  assert.equal(new Set(record.samples[0].dispositions.map((entry) => entry.id)).size, 6)
})

test("16. Closure blocks uncancelled demand and succeeds after pending demand is resolved", () => {
  const made = makeRequest(emptyWorkflowDocument(), [{ itemId: "A", quantity: 2 }])
  const stock = items().map((item) => item.id === "A" ? { ...item, stock: 2 } : item)
  const allocation = allocateReservations(made.document.requests, [], stock)
  const record = {
    requestId: made.request.id, project: made.request.project,
    samples: closureSamples(made.request, made.document),
    closureStatus: "Pending Closure" as const, closureDate: "2026-12-31",
    closedBy: "Coordinator", closureNotes: "", history: [],
  }
  const blocked = closureBlockers({ request: made.request, record, document: made.document, allocation })
  assert.ok(blocked.blockers.some((message) => message.includes("never issued")))
  const resolved = resolvePendingDemand(made.document, made.request.id)
  assert.equal(resolved.error, null)
  const closeAttempt = closeRequest(resolved.document, made.request.id, {
    closedBy: "Coordinator", closureDate: "2026-12-31", closureNotes: "No samples issued",
  }, allocateReservations(resolved.document.requests, [], stock))
  assert.equal(closeAttempt.error, null)
  assert.equal(closeAttempt.document.requests[0].status, "Closed")
})

test("17. Status suggestions, stock bounds, and issued-report projection are deterministic", () => {
  const lines = [{ id: "R-A", itemId: "A", name: "A", code: "A", issuedQuantity: 8, receivedQuantity: 8, damagedQuantity: 0, missingQuantity: 0, discrepancyNotes: "" }]
  assert.equal(suggestReceiptStatus(lines), "Full")
  assert.equal(suggestReceiptStatus([{ ...lines[0], receivedQuantity: 4 }]), "Partial")
  assert.equal(suggestReceiptStatus([{ ...lines[0], receivedQuantity: 4, damagedQuantity: 1 }]), "Discrepancy")
  assert.equal(suggestReceiptStatus([{ ...lines[0], receivedQuantity: 0 }]), "Pending")
  assert.equal(suggestReceiptStatus([{ ...lines[0], damagedQuantity: 1 }]), "Full")
  assert.equal(latestCycle(undefined), undefined)
  assert.equal(isFinalized(undefined), false)
  const projection = buildIssuedReportProjection(emptyWorkflowDocument())
  assert.deepEqual(projection, [])
})

let failures = 0
tests.forEach(([name, run]) => {
  try {
    run()
    console.log(`PASS ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL ${name}`)
    console.error(error)
  }
})

console.log(`\n${tests.length - failures}/${tests.length} workflow scenarios passed.`)
if (failures) process.exitCode = 1
