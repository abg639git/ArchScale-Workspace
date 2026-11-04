import * as React from "react"
import type { InventoryItem } from "@/pages/products/inventory-data"
import {
  ASSIGNMENTS,
  DELIVERY_METHODS,
  DELIVERY_DESTINATIONS,
  DISPOSITION_TYPES,
  PICKUP_LOCATIONS,
  REQUEST_PRIORITIES,
  REQUEST_SOURCES,
  REQUEST_TYPES,
  RETURN_CONDITIONS,
  DISPATCH_STATUSES,
  REVIEW_DECISIONS,
  REVIEW_FOLLOW_UPS,
  REVIEWER_ROLES,
  SAMPLE_CONDITIONS,
  type Assignment,
  type ClosureSample,
  type DeliveryDestination,
  type DeliveryMethod,
  type DispositionType,
  type PickupLocation,
  type RequestPriority,
  type RequestSource,
  type RequestStatus,
  type ReturnCondition,
  type ReviewDecision,
  type ReviewFollowUp,
  type ReviewerRole,
  type SampleCondition,
} from "./sample-workflow/types"
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
  saveClosureDraft,
  startReview,
  submitRequest,
  updateDispatchStatus,
  updateClosureSample,
  verifyReturn,
} from "./sample-workflow/operations"
import {
  closureBlockers,
  closureTotals,
  dispositionTotal,
  latestCycle,
} from "./sample-workflow/logic"
import {
  commitWithInventory,
  commitWorkflow,
  useAllocation,
  useInventory,
  useWorkflow,
} from "./sample-workflow/store"
import { mergedClosureRecord } from "./sample-workflow/operations"
import {
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Package,
  Truck,
} from "@/components/ui/icons"

const today = () => new Date().toISOString().slice(0, 10)

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500"
const textAreaClass =
  "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500"
const cardClass = "rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/70 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.045)] ring-1 ring-slate-900/[0.02] sm:p-5"
const buttonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const stageThemes = [
  { active: "border-indigo-600 bg-indigo-600 shadow-indigo-200/60", icon: "text-indigo-500", eyebrow: "text-indigo-700", activeIcon: "text-indigo-100", step: "text-indigo-200" },
  { active: "border-violet-600 bg-violet-600 shadow-violet-200/60", icon: "text-violet-500", eyebrow: "text-violet-700", activeIcon: "text-violet-100", step: "text-violet-200" },
  { active: "border-sky-600 bg-sky-600 shadow-sky-200/60", icon: "text-sky-500", eyebrow: "text-sky-700", activeIcon: "text-sky-100", step: "text-sky-200" },
  { active: "border-amber-600 bg-amber-600 shadow-amber-200/60", icon: "text-amber-600", eyebrow: "text-amber-700", activeIcon: "text-amber-100", step: "text-amber-200" },
  { active: "border-emerald-600 bg-emerald-600 shadow-emerald-200/60", icon: "text-emerald-600", eyebrow: "text-emerald-700", activeIcon: "text-emerald-100", step: "text-emerald-200" },
]

function Field({
  label,
  children,
  required = false,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block space-y-1 text-xs font-semibold text-slate-700">
      <span>{label}{required && <span className="ml-1 text-rose-600">*</span>}</span>
      {children}
    </label>
  )
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  const status = String(children ?? "")
  const color =
    status === "Closed" || status === "Receipt Confirmed" || status === "Approved" || status === "Fully Reserved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Submitted" || status === "In Transit" || status === "Under Review"
        ? "bg-blue-50 text-blue-700"
        : status === "Partially Reserved" || status === "Partial" || status === "Revision Required"
          ? "bg-amber-50 text-amber-700"
          : status === "Rejected" || status === "Damaged" || status === "Pending Stock"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-700"
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${color}`}>{children}</span>
}

function StageLayout({
  stage,
  title,
  subtitle,
  children,
}: {
  stage: number
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const steps = [
    { label: "Request", Icon: ClipboardList },
    { label: "Reserve & Issue", Icon: Package },
    { label: "Delivery", Icon: Truck },
    { label: "Review", Icon: MessageCircle },
    { label: "Closure", Icon: CheckCircle2 },
  ]
  const theme = stageThemes[stage - 1]
  return (
    <main className="h-full min-h-0 w-full flex-1 overflow-y-auto overscroll-contain bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${theme.eyebrow}`}>Sample Management <span className="px-1 text-slate-300">/</span> Stage {stage} of 5</p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">{subtitle}</p>
          </div>
        </header>
        <nav aria-label="Sample workflow stages" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map(({ label, Icon }, index) => (
            <div key={label} aria-current={index + 1 === stage ? "step" : undefined} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2.5 py-2 text-center text-xs font-semibold transition-colors ${index + 1 === stage ? `${theme.active} text-white shadow-md` : "border-slate-200 bg-white/90 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-white"}`}>
              <Icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${index + 1 === stage ? theme.activeIcon : stageThemes[index].icon}`} />
              <span><span className={`mr-1.5 text-[10px] ${index + 1 === stage ? theme.step : "text-slate-400"}`}>{String(index + 1).padStart(2, "0")}</span>{label}</span>
            </div>
          ))}
        </nav>
        {children}
      </div>
    </main>
  )
}

function Feedback({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
    </>
  )
}

function useSelectedRequest<T extends { id: string }>(requests: T[]) {
  const [id, setId] = React.useState("")
  const selected = requests.find((request) => request.id === id) ?? requests[0]
  return [selected, setId] as const
}

function RequestSelect({
  requests,
  selectedId,
  onChange,
  label = "Sample request",
}: {
  requests: Array<{ id: string; project: string; status: RequestStatus }>
  selectedId?: string
  onChange: (id: string) => void
  label?: string
}) {
  return (
    <Field label={label}>
      <select className={inputClass} value={selectedId ?? requests[0]?.id ?? ""} onChange={(event) => onChange(event.target.value)} disabled={!requests.length}>
        {!requests.length && <option value="">No requests available</option>}
        {requests.map((request) => <option key={request.id} value={request.id}>{request.id} · {request.project} ({request.status})</option>)}
      </select>
    </Field>
  )
}

const itemLine = (item: InventoryItem, quantity: number) => ({
  id: "",
  itemId: item.id,
  name: item.name,
  code: item.code,
  category: item.category,
  quantity,
  selectedQuantity: quantity,
})

export function SwatchSamplePage() {
  const document = useWorkflow()
  const inventory = useInventory()
  const sampleItems = inventory.filter((item) => item.isSample)
  const [form, setForm] = React.useState({
    source: "New Enquiry" as RequestSource,
    requestType: "Project sample",
    project: "",
    requester: "",
    organization: "",
    phone: "",
    deliveryContact: "",
    deliveryAddress: "",
    purpose: "",
    priority: "Normal" as RequestPriority,
    requiredDate: "",
    assignedCoordinator: "",
    assignment: "Sample Coordinator" as Assignment,
  })
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  const [pendingItemId, setPendingItemId] = React.useState("")
  const [pendingQuantity, setPendingQuantity] = React.useState(1)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const requests = document.requests.slice().reverse()
  const [selected] = useSelectedRequest(requests)
  const selectedSamples = sampleItems.filter((item) => (quantities[item.id] ?? 0) > 0)

  const addSample = () => {
    const item = sampleItems.find((entry) => entry.id === pendingItemId)
    if (!item) return
    setQuantities((current) => ({ ...current, [item.id]: Math.max(1, pendingQuantity) }))
    setPendingItemId("")
  }

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const save = (submit: boolean) => {
    setError("")
    setSuccess("")
    const lines = sampleItems
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => itemLine(item, quantities[item.id]))
    const created = createRequest(document, { ...form, lines })
    if (created.error) return setError(created.error)
    if (submit) {
      const requestId = created.document.requests.at(-1)?.id
      if (!requestId) return setError("Request could not be created.")
      const submitted = submitRequest(created.document, requestId)
      if (submitted.error) return setError(submitted.error)
      const persistError = commitWorkflow(submitted.document)
      if (persistError) return setError(persistError)
      setSuccess(`${requestId} submitted to the coordinator.`)
    } else {
      const persistError = commitWorkflow(created.document)
      if (persistError) return setError(persistError)
      setSuccess("Draft request saved.")
    }
    setForm((current) => ({ ...current, project: "", requester: "", organization: "", phone: "", deliveryContact: "", deliveryAddress: "", purpose: "", requiredDate: "" }))
    setQuantities({})
  }

  const submitExisting = (requestId: string) => {
    const result = submitRequest(document, requestId)
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError)
    else setSuccess(`${requestId} submitted.`)
  }

  return (
    <StageLayout stage={1} title="Request registration" subtitle="Create a traceable request using catalogue samples; submit it to place it in the coordinator’s Stage 2 queue.">
      <Feedback error={error} success={success} />
      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">New sample request</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Request source" required><select className={inputClass} value={form.source} onChange={(e) => setField("source", e.target.value as RequestSource)}>{REQUEST_SOURCES.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Request type"><select className={inputClass} value={form.requestType} onChange={(e) => setField("requestType", e.target.value)}>{REQUEST_TYPES.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Project / client" required><input className={inputClass} value={form.project} onChange={(e) => setField("project", e.target.value)} /></Field>
          <Field label="Requester" required><input className={inputClass} value={form.requester} onChange={(e) => setField("requester", e.target.value)} /></Field>
          <Field label="Organization" required><input className={inputClass} value={form.organization} onChange={(e) => setField("organization", e.target.value)} /></Field>
          <Field label="Phone" required><input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
          <Field label="Delivery contact" required><input className={inputClass} value={form.deliveryContact} onChange={(e) => setField("deliveryContact", e.target.value)} /></Field>
          <Field label="Delivery address" required><input className={inputClass} value={form.deliveryAddress} onChange={(e) => setField("deliveryAddress", e.target.value)} /></Field>
          <Field label="Required date" required><input type="date" className={inputClass} value={form.requiredDate} onChange={(e) => setField("requiredDate", e.target.value)} /></Field>
          <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => setField("priority", e.target.value as RequestPriority)}>{REQUEST_PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Assigned coordinator" required><input className={inputClass} value={form.assignedCoordinator} onChange={(e) => setField("assignedCoordinator", e.target.value)} /></Field>
          <Field label="Assignment"><select className={inputClass} value={form.assignment} onChange={(e) => setField("assignment", e.target.value as Assignment)}>{ASSIGNMENTS.map((value) => <option key={value}>{value}</option>)}</select></Field>
        </div>
        <Field label="Purpose" required><textarea className={`${textAreaClass} mt-1.5`} value={form.purpose} onChange={(e) => setField("purpose", e.target.value)} /></Field>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-800">Sample selection <span className="text-rose-600">*</span></h3>
          <p className="mb-3 mt-1 text-xs text-slate-500">Pick a catalogue item from the dropdown and set its requested quantity.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[16rem] flex-1 space-y-1 text-xs font-semibold text-slate-700">
              <span>Catalogue sample</span>
              <select
                className={inputClass}
                aria-label="Catalogue sample"
                value={pendingItemId}
                onChange={(e) => setPendingItemId(e.target.value)}
              >
                <option value="">Select a sample…</option>
                {sampleItems.map((item) => (
                  <option key={item.id} value={item.id} disabled={(quantities[item.id] ?? 0) > 0}>
                    {item.name} · {item.code} · {item.category} (Stock {item.stock})
                  </option>
                ))}
              </select>
            </label>
            <label className="w-28 space-y-1 text-xs font-semibold text-slate-700">
              <span>Quantity</span>
              <input
                type="number"
                min={1}
                step={1}
                aria-label="Requested quantity"
                className={inputClass}
                value={pendingQuantity}
                onChange={(e) => setPendingQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <button type="button" className={secondaryButtonClass} disabled={!pendingItemId} onClick={addSample}>
              Add sample
            </button>
          </div>
          {selectedSamples.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSamples.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-indigo-800">
                  <span className="max-w-[14rem] truncate">{item.name} <span className="font-normal text-indigo-500">· {item.code}</span></span>
                  <input
                    aria-label={`${item.name} requested quantity`}
                    type="number"
                    min={1}
                    step={1}
                    className="h-6 w-14 rounded-full border border-indigo-200 bg-white px-1.5 text-center text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    value={quantities[item.id]}
                    onChange={(e) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    className="flex size-5 items-center justify-center rounded-full text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
                    onClick={() => setQuantities((current) => ({ ...current, [item.id]: 0 }))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No samples selected yet.</p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => save(false)}>Save draft</button>
          <button type="button" className={buttonClass} onClick={() => save(true)}>Submit request</button>
        </div>
      </section>
      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Sample requests</h2><span className="text-sm text-slate-500">{requests.length} total</span></div>
        {requests.length ? <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50"><tr className="border-b text-[10px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-3 py-2.5">Request</th><th className="px-3 py-2.5">Project</th><th className="px-3 py-2.5">Requester</th><th className="px-3 py-2.5">Samples</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Action</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-b text-slate-700 transition-colors last:border-0 hover:bg-slate-50/70"><td className="px-3 py-3 font-semibold text-slate-900">{request.id}</td><td className="px-3 py-3">{request.project}</td><td className="px-3 py-3">{request.requester}</td><td className="px-3 py-3">{request.sampleDetails}</td><td className="px-3 py-3"><StatusBadge>{request.status}</StatusBadge></td><td className="px-3 py-3">{request.status === "Draft" && <button className="text-sm font-semibold text-indigo-700 hover:text-indigo-900" onClick={() => submitExisting(request.id)}>Submit</button>}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">No sample requests yet.</p>}
      </section>
      {selected && <p className="sr-only">Selected request {selected.id}</p>}
    </StageLayout>
  )
}

export function SelectIssuePage() {
  const document = useWorkflow()
  const inventory = useInventory()
  const allocation = useAllocation()
  const requests = document.requests.filter((request) => request.status !== "Draft" && request.status !== "Closed")
  const [request, setRequestId] = useSelectedRequest(requests)
  const [bagName, setBagName] = React.useState("Sample bag")
  const [bagQuantities, setBagQuantities] = React.useState<Record<string, number>>({})
  const [issueQuantities, setIssueQuantities] = React.useState<Record<string, Record<string, number>>>({})
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [issuedBy, setIssuedBy] = React.useState("")
  const [issuedTo, setIssuedTo] = React.useState("")
  const [returnByDate, setReturnByDate] = React.useState("")
  const [condition, setCondition] = React.useState<SampleCondition>("Good")

  const bags = document.bags.filter((bag) => bag.requestId === request?.id)
  const lines = request?.lines ?? []
  const stagedUnissued = (itemId: string) => {
    const staged = bags.flatMap((bag) => bag.lines.filter((line) => line.itemId === itemId)).reduce((sum, line) => sum + line.quantity, 0)
    const issued = document.issues.filter((issue) => issue.requestId === request?.id).flatMap((issue) => issue.lines).filter((line) => line.itemId === itemId).reduce((sum, line) => sum + line.quantity, 0)
    return Math.max(0, staged - issued)
  }
  const addBagNow = () => {
    if (!request) return
    setError(""); setSuccess("")
    const entries = lines.filter((line) => (bagQuantities[line.itemId] ?? 0) > 0).map((line) => ({ itemId: line.itemId, quantity: bagQuantities[line.itemId] }))
    const result = addBag(document, { requestId: request.id, name: bagName, stockLocation: "Studio", lines: entries }, inventory)
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError)
    else { setBagQuantities({}); setSuccess("Sample bag added.") }
  }
  const issueBag = (bagId: string) => {
    if (!request) return
    setError(""); setSuccess("")
    const bag = bags.find((entry) => entry.id === bagId)
    if (!bag) return setError("Bag not found.")
    const quantities = Object.fromEntries(bag.lines.map((line) => {
      const reserved = allocation[request.id]?.lines[line.itemId]?.reserved ?? 0
      const alreadyIssued = document.issues
        .filter((issue) => issue.bagId === bag.id)
        .flatMap((issue) => issue.lines)
        .filter((issueLine) => issueLine.bagLineId === line.id)
        .reduce((sum, issueLine) => sum + issueLine.quantity, 0)
      const max = Math.min(line.quantity - alreadyIssued, reserved)
      return [line.id, issueQuantities[bag.id]?.[line.id] ?? max]
    }))
    const result = createIssue(document, inventory, {
      requestId: request.id,
      bagId,
      quantities,
      issuedBy,
      issuedTo,
      conditionAtIssue: condition,
      returnByDate,
    })
    if (result.error) return setError(result.error)
    const persistError = commitWithInventory(result.document, result.items)
    if (persistError) setError(persistError)
    else setSuccess("Issue recorded and available stock deducted.")
  }

  return (
    <StageLayout stage={2} title="Select, reserve & issue" subtitle="Stage 1 demand is the source of truth. FIFO allocation reserves available stock; only reserved units can be issued.">
      <Feedback error={error} success={success} />
      <section className={cardClass}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <RequestSelect requests={requests} selectedId={request?.id} onChange={setRequestId} />
          {request && <StatusBadge>{request.status}</StatusBadge>}
        </div>
        {!request ? <p className="mt-4 text-sm text-slate-500">Submitted requests will appear here for coordinator acceptance.</p> : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Project</p><p className="mt-1 font-semibold">{request.project}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Requester</p><p className="mt-1 font-semibold">{request.requester}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Request ID</p><p className="mt-1 font-semibold">{request.id}</p></div>
            </div>
            {request.status === "Submitted" && <button className={`${buttonClass} mt-4`} onClick={() => { const result = acceptRequest(document, request.id); if (result.error) { setError(result.error) } else { const err = commitWorkflow(result.document); if (err) setError(err); else setSuccess("Request accepted for allocation.") } }}>Accept request</button>}
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50"><tr className="border-b text-[10px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-3 py-2.5">Sample</th><th className="px-3 py-2.5">Requested</th><th className="px-3 py-2.5">Available</th><th className="px-3 py-2.5">Reserved</th><th className="px-3 py-2.5">Pending</th><th className="px-3 py-2.5">Issued</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody>{lines.map((line) => { const row = allocation[request.id]?.lines[line.itemId]; const status = !row?.reserved && row?.pending ? "Pending Stock" : row?.pending ? "Partially Reserved" : row?.remaining === 0 ? "Issued" : "Fully Reserved"; return <tr key={line.itemId} className="border-b text-slate-700 transition-colors last:border-0 hover:bg-slate-50/70"><td className="px-3 py-3"><p className="font-semibold text-slate-900">{line.name}</p><p className="text-xs text-slate-500">{line.code} · {line.itemId}</p></td><td className="px-3 py-3">{row?.requested ?? line.quantity}</td><td className="px-3 py-3">{row?.available ?? 0}</td><td className="px-3 py-3">{row?.reserved ?? 0}/{row?.requested ?? line.quantity}</td><td className="px-3 py-3">{row?.pending ?? line.quantity}</td><td className="px-3 py-3">{row?.issued ?? 0}</td><td className="px-3 py-3"><StatusBadge>{status}</StatusBadge></td></tr> })}</tbody></table></div>
            {request.status !== "Submitted" && request.status !== "Closed" && <>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-900">Build sample bag</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Field label="Bag name"><input className={inputClass} value={bagName} onChange={(e) => setBagName(e.target.value)} /></Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lines.map((line) => { const row = allocation[request.id]?.lines[line.itemId]; const remainingToBag = Math.max(0, (row?.reserved ?? 0) - stagedUnissued(line.itemId)); return <Field key={line.itemId} label={`${line.name} · reserved to bag ${remainingToBag}`}><input className={inputClass} type="number" min={0} max={remainingToBag} value={bagQuantities[line.itemId] ?? 0} onChange={(e) => setBagQuantities((current) => ({ ...current, [line.itemId]: Math.min(remainingToBag, Math.max(0, Number(e.target.value) || 0)) }))} /></Field> })}
                  </div>
                </div>
                <button className={`${secondaryButtonClass} mt-3`} onClick={addBagNow}>Add to sample bag</button>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-900">Issue details</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Issued by" required><input className={inputClass} value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} /></Field>
                  <Field label="Issued to" required><input className={inputClass} value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} /></Field>
                  <Field label="Condition at issue"><select className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value as SampleCondition)}>{SAMPLE_CONDITIONS.map((value) => <option key={value}>{value}</option>)}</select></Field>
                  <Field label="Return by date"><input type="date" className={inputClass} value={returnByDate} onChange={(e) => setReturnByDate(e.target.value)} /></Field>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {bags.map((bag) => {
                    const issueTotalByLine = new Map(document.issues.filter((issue) => issue.bagId === bag.id).flatMap((issue) => issue.lines).map((line) => [line.bagLineId, (document.issues.filter((issue) => issue.bagId === bag.id).flatMap((issue) => issue.lines).filter((issuedLine) => issuedLine.bagLineId === line.bagLineId).reduce((sum, issuedLine) => sum + issuedLine.quantity, 0))]))
                    return <div key={bag.id} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between gap-2"><h4 className="font-semibold">{bag.name}</h4><span className="text-xs text-slate-500">{bag.id}</span></div><div className="mt-3 space-y-3">{bag.lines.map((line) => { const row = allocation[request.id]?.lines[line.itemId]; const issued = issueTotalByLine.get(line.id) ?? 0; const max = Math.min(line.quantity - issued, row?.reserved ?? 0); return <Field key={line.id} label={`${line.name} · bagged ${line.quantity}, issued ${issued}, reserved ${row?.reserved ?? 0}`}><input type="number" min={0} max={max} className={inputClass} value={issueQuantities[bag.id]?.[line.id] ?? max} onChange={(e) => setIssueQuantities((current) => ({ ...current, [bag.id]: { ...current[bag.id], [line.id]: Math.min(max, Math.max(0, Number(e.target.value) || 0)) } }))} /></Field> })}</div><button className={`${buttonClass} mt-4`} disabled={bag.lines.every((line) => !(issueQuantities[bag.id]?.[line.id] ?? Math.min(line.quantity, allocation[request.id]?.lines[line.itemId]?.reserved ?? 0)))} onClick={() => issueBag(bag.id)}>Record issue</button></div>
                  })}
                </div>
                {!bags.length && <p className="mt-3 text-sm text-slate-500">Reserve stock, then add one or more sample bags to prepare an issue.</p>}
              </div>
            </>}
          </>
        )}
      </section>
    </StageLayout>
  )
}

export function DeliveryReceiptPage() {
  const document = useWorkflow()
  const requests = document.requests.filter((request) => request.status !== "Draft")
  const [request, setRequestId] = useSelectedRequest(requests)
  const issues = document.issues.filter((issue) => issue.requestId === request?.id)
  const [issueId, setIssueId] = React.useState("")
  const selectedIssue = issues.find((issue) => issue.id === issueId) ?? issues[0]
  const dispatches = document.dispatches.filter((dispatch) => dispatch.requestId === request?.id)
  const [dispatchId, setDispatchId] = React.useState("")
  const selectedDispatch = dispatches.find((dispatch) => dispatch.id === dispatchId) ?? dispatches.find((dispatch) => dispatch.status !== "Receipt Confirmed")
  const [dispatchForm, setDispatchForm] = React.useState({
    method: "Courier" as DeliveryMethod, pickupLocation: "Studio" as PickupLocation,
    destination: "Site-Client" as DeliveryDestination, deliveryAddress: "", contactPerson: "",
    contactNumber: "", expectedDeliveryDate: "", dispatchedBy: "", courierName: "",
    trackingNumber: "", awbNumber: "",
  })
  const [received, setReceived] = React.useState<Record<string, number>>({})
  const [damaged, setDamaged] = React.useState<Record<string, number>>({})
  const [discrepancyNotes, setDiscrepancyNotes] = React.useState<Record<string, string>>({})
  const [receiver, setReceiver] = React.useState("")
  const [condition, setCondition] = React.useState<SampleCondition>("Good")
  const [receiptNotes, setReceiptNotes] = React.useState("")
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")

  const saveDispatch = () => {
    setError("")
    setSuccess("")
    if (!request || !selectedIssue) return setError("Select an issued sample before creating a dispatch.")
    const result = createDispatch(document, {
      requestId: request.id,
      issueId: selectedIssue.id,
      ...dispatchForm,
      deliveryAddress: dispatchForm.deliveryAddress || request.deliveryAddress,
      contactPerson: dispatchForm.contactPerson || request.deliveryContact,
      contactNumber: dispatchForm.contactNumber || request.phone,
      dispatchedBy: dispatchForm.dispatchedBy || request.assignedCoordinator,
    })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Dispatch created.")
  }
  const saveReceipt = () => {
    setError("")
    setSuccess("")
    if (!selectedDispatch) return setError("Select a dispatch.")
    const issue = document.issues.find((entry) => entry.id === selectedDispatch.issueId)
    if (!issue) return setError("The issue linked to this dispatch could not be found.")
    const prior = document.receipts.filter((entry) => entry.dispatchId === selectedDispatch.id).flatMap((entry) => entry.lines)
    const lines = issue.lines.map((line) => {
      const already = prior.filter((entry) => entry.itemId === line.itemId).reduce((sum, entry) => sum + entry.receivedQuantity, 0)
      const remaining = Math.max(0, line.quantity - already)
      return { itemId: line.itemId, receivedQuantity: received[line.itemId] ?? remaining, damagedQuantity: damaged[line.itemId] ?? 0, discrepancyNotes: discrepancyNotes[line.itemId] ?? "" }
    }).filter((line) => line.receivedQuantity > 0 || (received[line.itemId] ?? 0) === 0)
    const result = confirmReceipt(document, { dispatchId: selectedDispatch.id, receivedDate: today(), receiver, custodyHolder: receiver, conditionAtReceipt: condition, proofOfDelivery: "", notes: receiptNotes, lines })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else { setReceived({}); setDamaged({}); setDiscrepancyNotes({}); setReceiptNotes(""); setSuccess("Receipt confirmed and confirmed quantities sent to Stage 4.") }
  }

  return (
    <StageLayout stage={3} title="Dispatch, delivery & receipt" subtitle="Create dispatches from actual Stage 2 issues, then confirm receipt quantities against each issued line.">
      <Feedback error={error} success={success} />
      <section className={cardClass}>
        <RequestSelect requests={requests} selectedId={request?.id} onChange={setRequestId} />
        {request && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">{request.id}</span> · {request.project} · {request.requester}</div>}
      </section>
      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Create dispatch</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Issued record" required><select className={inputClass} value={selectedIssue?.id ?? ""} onChange={(e) => setIssueId(e.target.value)}><option value="">Select an issue</option>{issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.id} · {issue.lines.map((line) => `${line.name} (${line.quantity})`).join(", ")}</option>)}</select></Field>
          <Field label="Delivery method" required><select className={inputClass} value={dispatchForm.method} onChange={(e) => setDispatchForm((f) => ({ ...f, method: e.target.value as DeliveryMethod }))}>{DELIVERY_METHODS.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Pickup location" required><select className={inputClass} value={dispatchForm.pickupLocation} onChange={(e) => setDispatchForm((f) => ({ ...f, pickupLocation: e.target.value as PickupLocation }))}>{PICKUP_LOCATIONS.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Destination" required><select className={inputClass} value={dispatchForm.destination} onChange={(e) => setDispatchForm((f) => ({ ...f, destination: e.target.value as DeliveryDestination }))}>{DELIVERY_DESTINATIONS.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Delivery address" required><input className={inputClass} value={dispatchForm.deliveryAddress || request?.deliveryAddress || ""} onChange={(e) => setDispatchForm((f) => ({ ...f, deliveryAddress: e.target.value }))} /></Field>
          <Field label="Contact person" required><input className={inputClass} value={dispatchForm.contactPerson || request?.deliveryContact || ""} onChange={(e) => setDispatchForm((f) => ({ ...f, contactPerson: e.target.value }))} /></Field>
          <Field label="Contact number"><input className={inputClass} value={dispatchForm.contactNumber || request?.phone || ""} onChange={(e) => setDispatchForm((f) => ({ ...f, contactNumber: e.target.value }))} /></Field>
          <Field label="Expected delivery date" required><input type="date" className={inputClass} value={dispatchForm.expectedDeliveryDate} onChange={(e) => setDispatchForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} /></Field>
          <Field label="Dispatched by"><input className={inputClass} value={dispatchForm.dispatchedBy || request?.assignedCoordinator || ""} onChange={(e) => setDispatchForm((f) => ({ ...f, dispatchedBy: e.target.value }))} /></Field>
          {dispatchForm.method === "Courier" && <Field label="Courier name" required><input className={inputClass} value={dispatchForm.courierName} onChange={(e) => setDispatchForm((f) => ({ ...f, courierName: e.target.value }))} /></Field>}
          <Field label="Tracking number"><input className={inputClass} value={dispatchForm.trackingNumber} onChange={(e) => setDispatchForm((f) => ({ ...f, trackingNumber: e.target.value }))} /></Field>
          <Field label="AWB number"><input className={inputClass} value={dispatchForm.awbNumber} onChange={(e) => setDispatchForm((f) => ({ ...f, awbNumber: e.target.value }))} /></Field>
        </div>
        <button className={`${buttonClass} mt-4`} onClick={saveDispatch} disabled={!selectedIssue}>Create dispatch</button>
      </section>
      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Dispatch and receipt tracking</h2><Field label="Dispatch"><select className={inputClass} value={selectedDispatch?.id ?? ""} onChange={(e) => setDispatchId(e.target.value)}>{dispatches.map((entry) => <option key={entry.id} value={entry.id}>{entry.id} · {entry.status}</option>)}</select></Field></div>
        {dispatches.length ? <div className="mt-3 space-y-2">{dispatches.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"><div><p className="font-semibold">{entry.id} · {entry.method}</p><p className="text-xs text-slate-500">Issue {entry.issueId} · {entry.destination} · Expected {entry.expectedDeliveryDate}</p></div><div className="flex items-center gap-2"><StatusBadge>{entry.status}</StatusBadge>{entry.status !== "Receipt Confirmed" && <select aria-label={`Update ${entry.id} dispatch status`} className={`${inputClass} w-40`} value={entry.status} onChange={(e) => { const result = updateDispatchStatus(document, entry.id, e.target.value as (typeof DISPATCH_STATUSES)[number], "Coordinator"); if (result.error) { setError(result.error) } else { const err = commitWorkflow(result.document); if (err) setError(err); else setSuccess("Dispatch status updated.") } }}>{DISPATCH_STATUSES.filter((status) => status !== "Receipt Confirmed").map((status) => <option key={status}>{status}</option>)}</select>}</div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Create a dispatch from an issued record to begin receipt tracking.</p>}
        {selectedDispatch && selectedDispatch.status !== "Receipt Confirmed" && <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-semibold">Confirm receipt</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Received by" required><input className={inputClass} value={receiver} onChange={(e) => setReceiver(e.target.value)} /></Field><Field label="Condition at receipt"><select className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value as SampleCondition)}>{SAMPLE_CONDITIONS.map((value) => <option key={value}>{value}</option>)}</select></Field></div><div className="mt-4 space-y-3">{document.issues.find((issue) => issue.id === selectedDispatch.issueId)?.lines.map((line) => { const already = document.receipts.filter((receipt) => receipt.dispatchId === selectedDispatch.id).flatMap((receipt) => receipt.lines).filter((entry) => entry.itemId === line.itemId).reduce((sum, entry) => sum + entry.receivedQuantity, 0); const remaining = Math.max(0, line.quantity - already); return <div key={line.itemId} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[2fr_1fr_1fr_2fr] sm:items-end"><div><p className="font-semibold">{line.name}</p><p className="text-xs text-slate-500">Issued {line.quantity} · received {already} · outstanding {remaining}</p></div><Field label="Received"><input type="number" min={0} max={remaining} className={inputClass} value={received[line.itemId] ?? remaining} onChange={(e) => setReceived((current) => ({ ...current, [line.itemId]: Math.min(remaining, Math.max(0, Number(e.target.value) || 0)) }))} /></Field><Field label="Damaged"><input type="number" min={0} max={received[line.itemId] ?? remaining} className={inputClass} value={damaged[line.itemId] ?? 0} onChange={(e) => setDamaged((current) => ({ ...current, [line.itemId]: Math.min(received[line.itemId] ?? remaining, Math.max(0, Number(e.target.value) || 0)) }))} /></Field><Field label="Discrepancy notes"><input className={inputClass} value={discrepancyNotes[line.itemId] ?? ""} onChange={(e) => setDiscrepancyNotes((current) => ({ ...current, [line.itemId]: e.target.value }))} /></Field></div>})}</div><Field label="Receipt notes"><textarea className={`${textAreaClass} mt-2`} value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} /></Field><button className={`${buttonClass} mt-3`} onClick={saveReceipt}>Confirm receipt</button></div>}
      </section>
    </StageLayout>
  )
}

export function ReviewsApprovalsPage() {
  const document = useWorkflow()
  const requests = document.requests.filter((request) => request.status !== "Draft")
  const [request, setRequestId] = useSelectedRequest(requests)
  const reviews = document.reviews.filter((review) => review.requestId === request?.id)
  const reviewers = [...new Set([request?.requester, request?.assignedCoordinator, ...reviews.flatMap((entry) => entry.cycles.map((cycle) => cycle.reviewer))].filter((name): name is string => Boolean(name)))]
  const [reviewId, setReviewId] = React.useState("")
  const review = reviews.find((entry) => entry.id === reviewId) ?? reviews[0]
  const cycle = latestCycle(review)
  const [reviewer, setReviewer] = React.useState("")
  const [reviewerRole, setReviewerRole] = React.useState<ReviewerRole>("Client")
  const [decision, setDecision] = React.useState<ReviewDecision>("Approved")
  const [comments, setComments] = React.useState("")
  const [feedback, setFeedback] = React.useState("")
  const [followUp, setFollowUp] = React.useState<ReviewFollowUp>("None")
  const [returnInstruction, setReturnInstruction] = React.useState<"Return required" | "Retention approved" | "Coordinator decision">("Return required")
  const [nextReviewDate, setNextReviewDate] = React.useState("")
  const [dueDate, setDueDate] = React.useState(today())
  const [finalApproval, setFinalApproval] = React.useState<"Approved" | "Rejected" | "Changes Required" | "Not Required">("Approved")
  const [approvedBy, setApprovedBy] = React.useState("")
  const [finalComments, setFinalComments] = React.useState("")
  const [coordinator, setCoordinator] = React.useState("")
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")

  const submitReview = () => {
    setError("")
    setSuccess("")
    if (!request || !review) return setError("Select a confirmed received sample.")
    const result = recordReviewDecision(document, { requestId: request.id, reviewId: review.id, reviewer, reviewerRole, reviewDate: today(), dueDate, nextReviewDate, decision, comments, feedback, followUp, returnInstruction })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Review decision and history recorded; coordinator notified.")
  }
  const beginReview = () => {
    setError("")
    setSuccess("")
    if (!review) return setError("Select a confirmed received sample.")
    const result = startReview(document, { reviewId: review.id, reviewer, reviewerRole, dueDate })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Review started and saved as a draft.")
  }
  const submitFinal = () => {
    setError("")
    setSuccess("")
    if (!review) return setError("Select a review record.")
    const result = recordFinalApproval(document, {
      reviewId: review.id,
      finalApproval,
      decisionDate: today(),
      approvedBy,
      coordinator: coordinator || request?.assignedCoordinator || "",
      finalComments,
    })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Final decision recorded.")
  }

  return (
    <StageLayout stage={4} title="Reviews & approvals" subtitle="Only confirmed receipts appear here. Record separate sample decisions, preserve revision cycles, and route the final outcome to the coordinator.">
      <Feedback error={error} success={success} />
      <section className={cardClass}>
        <RequestSelect requests={requests} selectedId={request?.id} onChange={setRequestId} />
        {request && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><strong>{request.project}</strong> · {request.id} · {request.requester}</div>}
      </section>
      <section className={cardClass}>
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <Field label="Received sample" required><select className={inputClass} value={review?.id ?? ""} onChange={(e) => setReviewId(e.target.value)}><option value="">Select received sample</option>{reviews.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.code} · received {entry.receivedQuantity}</option>)}</select></Field>
          {review && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>Request {review.requestId}</span><span>·</span><span>Issued {review.issuedQuantity}</span><span>·</span><span>Received {review.receivedQuantity}</span><StatusBadge>{cycle?.status ?? "Awaiting Review"}</StatusBadge></div>}
        </div>
        {!reviews.length && <p className="mt-4 text-sm text-slate-500">No confirmed received samples are ready for review yet.</p>}
        {review && <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold">Sample review & feedback</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reviewer" required><select className={inputClass} value={reviewer} onChange={(e) => setReviewer(e.target.value)}><option value="">Select an authorized reviewer</option>{reviewers.map((name) => <option key={name}>{name}</option>)}</select></Field>
              <Field label="Reviewer role"><select className={inputClass} value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value as ReviewerRole)}>{REVIEWER_ROLES.map((value) => <option key={value}>{value}</option>)}</select></Field>
              <Field label="Review due date" required><input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
              <Field label="Review decision" required><select className={inputClass} value={decision} onChange={(e) => setDecision(e.target.value as ReviewDecision)}>{REVIEW_DECISIONS.map((value) => <option key={value}>{value}</option>)}</select></Field>
              <Field label="Follow-up"><select className={inputClass} value={followUp} onChange={(e) => setFollowUp(e.target.value as ReviewFollowUp)}>{REVIEW_FOLLOW_UPS.map((value) => <option key={value}>{value}</option>)}</select></Field>
              <Field label="Return instruction"><select className={inputClass} value={returnInstruction} onChange={(e) => setReturnInstruction(e.target.value as typeof returnInstruction)}><option>Return required</option><option>Retention approved</option><option>Coordinator decision</option></select></Field>
              {decision === "Deferred" && <Field label="Next review date" required><input type="date" className={inputClass} value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} /></Field>}
            </div>
            <Field label="Reviewer comments"><textarea className={textAreaClass} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
            {(decision === "Revision Required" || followUp === "Resubmit") && <Field label="Required changes" required><textarea className={textAreaClass} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>}
            <div className="flex flex-wrap gap-2"><button className={secondaryButtonClass} onClick={beginReview}>Start review / save draft</button><button className={buttonClass} onClick={submitReview}>Record review decision</button></div>
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold">Final decision</h3>
            {cycle ? <div className="rounded-lg bg-slate-50 p-3 text-sm"><p>Latest cycle {cycle.cycle}: <strong>{cycle.decision || "Awaiting review"}</strong> · {cycle.finalApproval}</p><p className="mt-1 text-slate-500">{cycle.feedback || cycle.comments || "No comments recorded."}</p></div> : <p className="text-sm text-slate-500">Record a review decision before finalizing.</p>}
            <Field label="Final decision"><select className={inputClass} value={finalApproval} onChange={(e) => setFinalApproval(e.target.value as typeof finalApproval)}><option>Approved</option><option>Rejected</option><option>Changes Required</option><option>Not Required</option></select></Field>
            {finalApproval !== "Not Required" && <Field label="Decision recorded by"><input className={inputClass} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></Field>}
            <Field label="Next responsible coordinator"><input className={inputClass} value={coordinator || request?.assignedCoordinator || ""} onChange={(e) => setCoordinator(e.target.value)} /></Field>
            <Field label="Final comments"><textarea className={textAreaClass} value={finalComments} onChange={(e) => setFinalComments(e.target.value)} /></Field>
            <button className={secondaryButtonClass} onClick={submitFinal} disabled={!cycle?.decision}>Record final decision</button>
            <div className="border-t border-slate-100 pt-3"><p className="text-sm font-semibold">Review history</p>{review.cycles.length ? <ol className="mt-2 space-y-2">{review.cycles.map((entry) => <li key={entry.cycle} className="text-sm"><StatusBadge>{entry.decision || entry.status}</StatusBadge><span className="ml-2">Cycle {entry.cycle} · {entry.reviewer} · {entry.reviewDate}</span><p className="mt-1 text-xs text-slate-500">{entry.feedback || entry.comments || "No feedback"}</p></li>)}</ol> : <p className="mt-2 text-xs text-slate-500">No decisions recorded.</p>}</div>
          </div>
        </div>}
      </section>
    </StageLayout>
  )
}

function ReturnPlanForm({
  requestId,
  sample,
  readOnly,
}: {
  requestId: string
  sample: ClosureSample
  readOnly: boolean
}) {
  const document = useWorkflow()
  const inventory = useInventory()
  const [returnRequired, setReturnRequired] = React.useState(sample.returnRequired)
  const [expectedReturnDate, setExpectedReturnDate] = React.useState(sample.expectedReturnDate)
  const [returnedQuantity, setReturnedQuantity] = React.useState(sample.returnedQuantity)
  const [receivedBackQuantity, setReceivedBackQuantity] = React.useState(sample.receivedBackQuantity)
  const [condition, setCondition] = React.useState<ReturnCondition>(sample.conditionAtReturn || "Good")
  const [verifiedBy, setVerifiedBy] = React.useState(sample.verifiedBy)
  const [inspectionNotes, setInspectionNotes] = React.useState(sample.inspectionNotes)
  const [actualReturnDate, setActualReturnDate] = React.useState(sample.actualReturnDate)
  const [dispositionType, setDispositionType] = React.useState<DispositionType>("Returned")
  const [dispositionQuantity, setDispositionQuantity] = React.useState(1)
  const [dispositionNotes, setDispositionNotes] = React.useState("")
  const [approvedBy, setApprovedBy] = React.useState("")
  const [message, setMessage] = React.useState("")

  const savePlan = () => {
    const result = updateClosureSample(document, requestId, sample.itemId, {
      returnRequired,
      expectedReturnDate,
      returnedQuantity: returnRequired ? returnedQuantity : 0,
    })
    if (result.error) return setMessage(result.error)
    const error = commitWorkflow(result.document)
    setMessage(error ?? "Return plan saved.")
  }
  const verify = () => {
    const result = verifyReturn(document, inventory, requestId, sample.itemId, {
      receivedBackQuantity,
      conditionAtReturn: condition,
      verifiedBy,
      inspectionNotes,
      actualReturnDate,
    })
    if (result.error) return setMessage(result.error)
    const error = commitWithInventory(result.document, result.items)
    setMessage(error ?? "Return verified; inventory updated according to condition.")
  }
  const add = () => {
    const result = addDisposition(document, requestId, sample.itemId, {
      type: dispositionType,
      quantity: dispositionQuantity,
      notes: dispositionNotes,
      approvedBy,
    })
    if (result.error) return setMessage(result.error)
    const error = commitWorkflow(result.document)
    setMessage(error ?? "Disposition recorded.")
    setDispositionNotes("")
  }
  const remainingDisposition = sample.issuedQuantity - dispositionTotal(sample)

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold">{sample.name} <span className="font-normal text-slate-500">· {sample.code}</span></h3><p className="mt-1 text-xs text-slate-500">Issued {sample.issuedQuantity} · received {sample.receivedQuantity} · final review {sample.reviewSummary}</p></div>
        <StatusBadge>{sample.issuedQuantity ? `${sample.issuedQuantity - dispositionTotal(sample)} unaccounted` : "Not issued"}</StatusBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Return required"><select disabled={readOnly} className={inputClass} value={returnRequired ? "Yes" : "No"} onChange={(e) => setReturnRequired(e.target.value === "Yes")}><option>Yes</option><option>No</option></select></Field>
        {returnRequired && <><Field label="Expected return date"><input disabled={readOnly} type="date" className={inputClass} value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} /></Field><Field label="Expected returned quantity"><input disabled={readOnly} type="number" min={0} max={sample.issuedQuantity} className={inputClass} value={returnedQuantity} onChange={(e) => setReturnedQuantity(Math.min(sample.issuedQuantity, Math.max(0, Number(e.target.value) || 0)))} /></Field><Field label="Received back"><input disabled={readOnly} type="number" min={0} max={returnedQuantity} className={inputClass} value={receivedBackQuantity} onChange={(e) => setReceivedBackQuantity(Math.min(returnedQuantity, Math.max(0, Number(e.target.value) || 0)))} /></Field></>}
      </div>
      {returnRequired && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Return condition"><select disabled={readOnly} className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value as ReturnCondition)}>{RETURN_CONDITIONS.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Actual return date"><input disabled={readOnly} type="date" className={inputClass} value={actualReturnDate} onChange={(e) => setActualReturnDate(e.target.value)} /></Field>
        <Field label="Verified by"><input disabled={readOnly} className={inputClass} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} /></Field>
        <Field label="Inspection notes"><input disabled={readOnly} className={inputClass} value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} /></Field>
      </div>}
      {!readOnly && <div className="flex flex-wrap gap-2"><button className={secondaryButtonClass} onClick={savePlan}>Save return plan</button>{returnRequired && <button className={secondaryButtonClass} onClick={verify}>Verify physical return</button>}</div>}
      {returnRequired && <p className="text-xs text-slate-500">Good verified units return to available stock. Damaged or unusable units are quarantined. Stocked: {sample.stockedQuantity} · Quarantined: {sample.quarantinedQuantity}</p>}
      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold">Final disposition · {remainingDisposition} unit(s) remaining</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Disposition"><select disabled={readOnly} className={inputClass} value={dispositionType} onChange={(e) => setDispositionType(e.target.value as DispositionType)}>{DISPOSITION_TYPES.map((value) => <option key={value} value={value}>{value === "Returned" ? "Returned to Stock" : value === "Retained" ? "Retained by Client" : value === "Converted" ? "Converted to Permanent Sample" : value}</option>)}</select></Field>
          <Field label="Quantity"><input disabled={readOnly} type="number" min={1} max={remainingDisposition} className={inputClass} value={dispositionQuantity} onChange={(e) => setDispositionQuantity(Math.max(1, Math.min(remainingDisposition || 1, Number(e.target.value) || 1)))} /></Field>
          {(dispositionType === "Retained" || dispositionType === "Lost") && <Field label="Authorised by"><input disabled={readOnly} className={inputClass} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></Field>}
          <Field label="Disposition notes"><input disabled={readOnly} className={inputClass} value={dispositionNotes} onChange={(e) => setDispositionNotes(e.target.value)} /></Field>
        </div>
        {!readOnly && <button className={`${secondaryButtonClass} mt-3`} onClick={add} disabled={remainingDisposition <= 0}>Add disposition</button>}
        {sample.dispositions.length > 0 && <ul className="mt-3 space-y-2">{sample.dispositions.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"><span>{entry.type === "Returned" ? "Returned to Stock" : entry.type === "Retained" ? "Retained by Client" : entry.type === "Converted" ? "Converted to Permanent Sample" : entry.type} · {entry.quantity} unit(s) {entry.approvedBy && `· Approved by ${entry.approvedBy}`} {entry.notes && `· ${entry.notes}`}</span></li>)}</ul>}
      </div>
      {message && <p role="status" className="text-xs text-slate-600">{message}</p>}
    </div>
  )
}

export function ReturnsClosurePage() {
  const document = useWorkflow()
  const allocation = useAllocation()
  const requests = document.requests.filter((request) => request.status !== "Draft")
  const [request, setRequestId] = useSelectedRequest(requests)
  const record = request ? mergedClosureRecord(document, request.id) : null
  const [closedBy, setClosedBy] = React.useState("")
  const [closureDate, setClosureDate] = React.useState(today())
  const [closureNotes, setClosureNotes] = React.useState("")
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const readOnly = request?.status === "Closed"
  const totals = record ? closureTotals(record) : null
  const blockers = request && record ? closureBlockers({ request, record, document, allocation }).blockers : []

  const cancelPending = () => {
    setError("")
    setSuccess("")
    if (!request) return
    const result = resolvePendingDemand(document, request.id)
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Unissued pending demand cancelled; issued samples remain fully traceable.")
  }
  const close = () => {
    if (!request) return
    setError(""); setSuccess("")
    const result = closeRequest(document, request.id, { closedBy, closureDate, closureNotes }, allocation)
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Request closed. The request is now read-only.")
  }
  const saveDraft = () => {
    setError("")
    setSuccess("")
    if (!request) return
    const result = saveClosureDraft(document, request.id, { closedBy, closureDate, closureNotes })
    if (result.error) return setError(result.error)
    const persistError = commitWorkflow(result.document)
    if (persistError) setError(persistError); else setSuccess("Closure draft saved.")
  }

  return (
    <StageLayout stage={5} title="Returns, reconciliation & closure" subtitle="Reconcile only issued quantities, verify physical returns, record each final disposition, and close when every unit and review is accounted for.">
      <Feedback error={error} success={success} />
      <section className={cardClass}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><RequestSelect requests={requests} selectedId={request?.id} onChange={setRequestId} />{request && <StatusBadge>{request.status}</StatusBadge>}</div>
        {request && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Project", request.project], ["Requester", request.requester], ["Request ID", request.id], ["Sample details", request.sampleDetails],
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div>}
      </section>
      {!request ? <section className={cardClass}><p className="text-sm text-slate-500">No requests are available for reconciliation.</p></section> : <>
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Sample return & final disposition</h2>{request.pendingResolved && <StatusBadge>Pending demand resolved</StatusBadge>}</div>
          {record?.samples.some((sample) => sample.issuedQuantity > 0) ? <div className="mt-4 space-y-4">{record.samples.filter((sample) => sample.issuedQuantity > 0).map((sample) => <ReturnPlanForm key={sample.itemId} requestId={request.id} sample={sample} readOnly={readOnly} />)}</div> : <p className="mt-3 text-sm text-slate-500">No Stage 2 issues exist for this request. Resolve remaining demand before closing.</p>}
        </section>
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Request closure</h2>
          {totals && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{([
            ["Issued", totals.issued], ["Received", totals.received], ["Accounted", totals.accounted], ["Outstanding", totals.outstanding], ["Quarantined", totals.quarantined],
          ] as Array<[string, number]>).map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-xl font-bold ${label === "Outstanding" && value > 0 ? "text-rose-700" : "text-slate-900"}`}>{value}</p></div>)}</div>}
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Closure status</span><StatusBadge>{readOnly ? "Closed" : blockers.length ? "Pending Closure" : "Ready to Close"}</StatusBadge></div>
          {allocation[request.id]?.totals.pending && !request.pendingResolved && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><p>{allocation[request.id].totals.pending} unissued unit(s) are still pending. Cancel that demand before closing, or leave the request open for later stock allocation.</p><button disabled={readOnly} className={`${secondaryButtonClass} mt-2`} onClick={cancelPending}>Cancel unissued pending demand</button></div>}
          {blockers.length > 0 && <div className="mt-4 rounded-lg bg-rose-50 p-3"><p className="text-sm font-semibold text-rose-800">Items to resolve before closure</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Closed by" required><input disabled={readOnly} className={inputClass} value={closedBy} onChange={(e) => setClosedBy(e.target.value)} /></Field>
            <Field label="Closure date" required><input disabled={readOnly} type="date" className={inputClass} value={closureDate} onChange={(e) => setClosureDate(e.target.value)} /></Field>
            <Field label="Closure notes"><input disabled={readOnly} className={inputClass} value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} /></Field>
          </div>
          {!readOnly && <div className="mt-4 flex flex-wrap gap-2"><button className={secondaryButtonClass} onClick={saveDraft}>Save closure draft</button><button className={buttonClass} disabled={blockers.length > 0} onClick={() => { if (window.confirm("Close this request? This action makes its workflow records read-only.")) close() }}>Close request</button></div>}
          {readOnly && <p className="mt-4 text-sm font-semibold text-emerald-700">Closed {request.closedAt ? new Date(request.closedAt).toLocaleString() : ""} · records are read-only.</p>}
          {record?.history.length ? <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold">Closure history</h3><ol className="mt-2 space-y-2">{record.history.slice().reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className="text-xs text-slate-600"><span className="font-medium">{entry.action}</span><span className="ml-2 text-slate-400">{new Date(entry.at).toLocaleString()}</span></li>)}</ol></div> : null}
        </section>
      </>}
    </StageLayout>
  )
}
