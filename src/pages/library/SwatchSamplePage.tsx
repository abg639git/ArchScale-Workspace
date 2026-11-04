import * as React from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Edit2,
  Plus,
  Package,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  X,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { initialItems, type InventoryItem } from "@/pages/products/inventory-data"

type RequestStatus = "Draft" | "Submitted" | "Ready for Select & Issue"

type MaterialRequest = {
  id: string
  project: string
  requester: string
  requestType: string
  sampleDetails: string
  quantity: number
  purpose: string
  priority: "Urgent" | "High" | "Normal" | "Low"
  requiredDate: string
  deliveryAddress: string
  assignedCoordinator: string
  status: RequestStatus
  createdAt: string
  submittedAt?: string
  readyAt?: string
}

const requestTypes = ["Project sample", "Client presentation", "Mock-up", "Replacement"]
const priorities: MaterialRequest["priority"][] = ["Urgent", "High", "Normal", "Low"]
const statusFilters = ["All", "Submitted", "Draft", "Ready for Select & Issue"] as const
const requestsStorageKey = "archscale.samples.stage1.requests"
const stage2RequestStorageKey = "archscale.samples.stage2.currentRequest"
const stage2WorkflowsStorageKey = "archscale.samples.stage2.workflows"
const stage2DispatchesStorageKey = "archscale.samples.stage2.dispatches"
const issuedRequestsStorageKey = "archscale.samples.requests"
const inventoryStorageKey = "archscale.inventory.items"

const sampleConditions = ["Good", "Damaged"]
const sampleIssueStatuses = ["Prepared", "Issued"]

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "mb-1.5 block text-xs font-medium text-foreground"

function createRequestId(requests: MaterialRequest[]): string {
  const year = new Date().getFullYear()
  const prefix = `MR-${year}-`
  const lastNumber = requests.reduce((largest, request) => {
    if (!request.id.startsWith(prefix)) return largest
    const number = Number(request.id.slice(prefix.length))
    return Number.isInteger(number) ? Math.max(largest, number) : largest
  }, 0)
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`
}

function statusStyle(status: RequestStatus): string {
  if (status === "Draft") return "bg-slate-100 text-slate-700"
  if (status === "Submitted") return "bg-amber-100 text-amber-800"
  return "bg-emerald-100 text-emerald-800"
}

function formatRequestDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

function currentTimestamp(): string {
  return new Date().toISOString()
}

function validateRequest(request: MaterialRequest): string | null {
  const missing = [
    ["Project", request.project],
    ["Requester", request.requester],
    ["Request type", request.requestType],
    ["Sample details", request.sampleDetails],
    ["Required date", request.requiredDate],
    ["Delivery address", request.deliveryAddress],
    ["Assigned coordinator", request.assignedCoordinator],
  ].filter(([, value]) => !value.trim()).map(([label]) => label)

  if (missing.length) return `Complete the required fields: ${missing.join(", ")}.`
  if (!Number.isInteger(request.quantity) || request.quantity < 1) {
    return "Quantity must be a whole number greater than zero."
  }
  return null
}

function emptyRequest(id: string): MaterialRequest {
  return {
    id,
    project: "",
    requester: "",
    requestType: requestTypes[0],
    sampleDetails: "",
    quantity: 1,
    purpose: "",
    priority: "Normal",
    requiredDate: "",
    deliveryAddress: "",
    assignedCoordinator: "",
    status: "Draft",
    createdAt: new Date().toISOString(),
  }
}

function RequestField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  multiline = false,
  options,
  min,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  required?: boolean
  multiline?: boolean
  options?: string[]
  min?: number
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
      {options ? (
        <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : multiline ? (
        <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={cn(inputClass, "h-auto min-h-20 resize-y py-2")} />
      ) : (
        <input required={required} type={type} min={min} step={type === "number" ? "1" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  )
}

function RequestForm({
  request,
  onChange,
  onSaveDraft,
  onSubmit,
  onCancel,
  error,
}: {
  request: MaterialRequest
  onChange: (value: MaterialRequest) => void
  onSaveDraft: () => void
  onSubmit: () => void
  onCancel: () => void
  error: string
}) {
  const set = <K extends keyof MaterialRequest,>(key: K, value: MaterialRequest[K]) => {
    onChange({ ...request, [key]: value })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="sample-request-form-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{request.id}</p>
            <h2 id="sample-request-form-title" className="mt-1 text-lg font-semibold">{request.status === "Draft" ? "Request details" : "New sample request"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Save a draft to continue later, or submit it for coordinator review.</p>
          </div>
          <button type="button" aria-label="Close request form" onClick={onCancel} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </header>
        <form id="sample-request-form" className="min-h-0 flex-1 overflow-y-auto p-5" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold">Request information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RequestField label="Project" value={request.project} onChange={(value) => set("project", value)} required />
                <RequestField label="Requester" value={request.requester} onChange={(value) => set("requester", value)} required />
                <RequestField label="Request type" value={request.requestType} options={requestTypes} onChange={(value) => set("requestType", value)} required />
                <RequestField label="Priority" value={request.priority} options={priorities} onChange={(value) => set("priority", value as MaterialRequest["priority"])} />
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-semibold">Sample information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><RequestField label="Sample details" value={request.sampleDetails} onChange={(value) => set("sampleDetails", value)} required multiline /></div>
                <RequestField label="Quantity" type="number" min={1} value={request.quantity} onChange={(value) => set("quantity", Number(value))} required />
                <RequestField label="Purpose" value={request.purpose} onChange={(value) => set("purpose", value)} multiline />
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-semibold">Request requirements</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RequestField label="Required date" type="date" value={request.requiredDate} onChange={(value) => set("requiredDate", value)} required />
                <RequestField label="Assigned coordinator" value={request.assignedCoordinator} onChange={(value) => set("assignedCoordinator", value)} required />
                <div className="sm:col-span-2"><RequestField label="Delivery address" value={request.deliveryAddress} onChange={(value) => set("deliveryAddress", value)} required multiline /></div>
              </div>
            </section>
          </div>
          {error && <p role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        </form>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onCancel} className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">Cancel</button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSaveDraft} className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">Save Draft</button>
            <button type="submit" form="sample-request-form" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"><Send className="size-4" />Submit Request</button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export function SwatchSamplePage() {
  const [requests, setRequests] = usePersistentState<MaterialRequest[]>(requestsStorageKey, [])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<(typeof statusFilters)[number]>("All")
  const [editing, setEditing] = React.useState<MaterialRequest | null>(null)
  const [selected, setSelected] = React.useState<MaterialRequest | null>(null)
  const [formError, setFormError] = React.useState("")
  const [feedback, setFeedback] = React.useState("")

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditing(null)
        setSelected(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const visibleRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "All" || request.status === statusFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [
      request.id,
      request.project,
      request.requester,
      request.requestType,
      request.sampleDetails,
      request.assignedCoordinator,
    ].join(" ").toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })

  const startNewRequest = () => {
    setFormError("")
    setEditing(emptyRequest(createRequestId(requests)))
  }

  const saveDraft = () => {
    if (!editing) return
    const saved = { ...editing, status: "Draft" as const }
    setRequests((current) => current.some((request) => request.id === saved.id)
      ? current.map((request) => request.id === saved.id ? saved : request)
      : [saved, ...current])
    setEditing(null)
    setFormError("")
    setFeedback(`${saved.id} saved as a draft.`)
  }

  const submitRequest = () => {
    if (!editing) return
    const validation = validateRequest(editing)
    if (validation) {
      setFormError(validation)
      return
    }
    const submittedAt = new Date().toISOString()
    const submitted: MaterialRequest = { ...editing, status: "Submitted", submittedAt }
    setRequests((current) => current.some((request) => request.id === submitted.id)
      ? current.map((request) => request.id === submitted.id ? submitted : request)
      : [submitted, ...current])
    setEditing(null)
    setFormError("")
    setFeedback(`${submitted.id} submitted to ${submitted.assignedCoordinator} for review.`)
  }

  const confirmReady = (request: MaterialRequest) => {
    const currentRequest = requests.find((item) => item.id === request.id)
    if (!currentRequest || currentRequest.status !== "Submitted") {
      setFeedback("This request is no longer available for coordinator review.")
      return
    }

    const ready: MaterialRequest = {
      ...currentRequest,
      status: "Ready for Select & Issue",
      readyAt: new Date().toISOString(),
    }
    const nextRequests = requests.map((item) => item.id === ready.id ? ready : item)
    const previousRequests = window.localStorage.getItem(requestsStorageKey)
    const previousHandoff = window.localStorage.getItem(stage2RequestStorageKey)
    try {
      window.localStorage.setItem(requestsStorageKey, JSON.stringify(nextRequests))
      window.localStorage.setItem(stage2RequestStorageKey, JSON.stringify(ready))
    } catch {
      try {
        if (previousRequests === null) window.localStorage.removeItem(requestsStorageKey)
        else window.localStorage.setItem(requestsStorageKey, previousRequests)
        if (previousHandoff === null) window.localStorage.removeItem(stage2RequestStorageKey)
        else window.localStorage.setItem(stage2RequestStorageKey, previousHandoff)
      } catch {
        setFeedback("The handoff could not be saved, and browser storage could not be restored.")
        return
      }
      setFeedback("The handoff could not be saved because browser storage is unavailable.")
      return
    }
    setRequests(nextRequests)
    setSelected(ready)
    window.dispatchEvent(new CustomEvent("archscale:navigate", {
      detail: { activeRailId: "library", activeItem: "Select & Issue" },
    }))
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Stage 1</p>
          <h1 className="mt-1 text-xl font-semibold">Sample Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create requests, track submissions, and review requests assigned to a coordinator.</p>
        </div>
        <button type="button" onClick={startNewRequest} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"><Plus className="size-4" />New Request</button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        {statusFilters.map((status) => {
          const count = status === "All" ? requests.length : requests.filter((request) => request.status === status).length
          return (
            <button key={status} type="button" onClick={() => setStatusFilter(status)} className={cn("inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors", statusFilter === status ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-background text-foreground hover:bg-muted")}>
              {status}<span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", statusFilter === status ? "bg-white/15" : "bg-muted")}>{count}</span>
            </button>
          )
        })}
      </div>

      <section className="min-h-0 flex-1 overflow-auto p-5">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <label className="relative block w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, project, requester..." className={cn(inputClass, "pl-9")} />
            </label>
            <span className="text-xs text-muted-foreground">{visibleRequests.length} of {requests.length} requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Sample details</th>
                  <th className="px-4 py-3 font-semibold">Requester</th>
                  <th className="px-4 py-3 font-semibold">Coordinator</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Required date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRequests.map((request) => (
                  <tr key={request.id} tabIndex={0} role="button" onClick={() => setSelected(request)} onKeyDown={(event) => { if (event.key === "Enter") setSelected(request) }} className="cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <td className="px-4 py-4"><span className="font-semibold">{request.id}</span><span className={cn("mt-1 block w-fit rounded px-2 py-0.5 text-[10px] font-medium uppercase", request.priority === "Urgent" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{request.priority}</span></td>
                    <td className="px-4 py-4">{request.project || "—"}</td>
                    <td className="max-w-56 truncate px-4 py-4">{request.sampleDetails || "Details not entered"}<span className="block text-xs text-muted-foreground">{request.quantity} requested</span></td>
                    <td className="px-4 py-4">{request.requester || "—"}</td>
                    <td className="px-4 py-4">{request.assignedCoordinator || "—"}</td>
                    <td className="px-4 py-4"><span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", statusStyle(request.status))}>{request.status === "Draft" ? <Edit2 className="size-3" /> : request.status === "Submitted" ? <Clock3 className="size-3" /> : <CheckCircle2 className="size-3" />}{request.status}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatRequestDate(request.requiredDate)}</td>
                  </tr>
                ))}
                {visibleRequests.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center"><p className="font-medium">{requests.length ? "No requests match these filters" : "No sample requests yet"}</p><p className="mt-1 text-sm text-muted-foreground">{requests.length ? "Try a different search or status." : "Create a request or save a draft to begin."}</p>{!requests.length && <button type="button" onClick={startNewRequest} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus className="size-4" />New Request</button>}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {feedback && <p role="status" className="mt-3 text-sm text-muted-foreground">{feedback}</p>}
      </section>

      {editing && (
        <RequestForm
          request={editing}
          onChange={(value) => { setEditing(value); setFormError("") }}
          onSaveDraft={saveDraft}
          onSubmit={submitRequest}
          onCancel={() => { setEditing(null); setFormError("") }}
          error={formError}
        />
      )}

      {selected && (
        <RequestDetails
          request={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            if (selected.status !== "Draft") return
            setEditing(selected)
            setSelected(null)
            setFormError("")
          }}
          onConfirmReady={() => confirmReady(selected)}
        />
      )}
    </div>
  )
}

function RequestDetails({
  request,
  onClose,
  onEdit,
  onConfirmReady,
}: {
  request: MaterialRequest
  onClose: () => void
  onEdit: () => void
  onConfirmReady: () => void
}) {
  const isDraft = request.status === "Draft"
  const isReviewable = request.status === "Submitted"
  const [reviewError, setReviewError] = React.useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="sample-request-details-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 id="sample-request-details-title" className="text-lg font-semibold">{request.id}</h2><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusStyle(request.status))}>{request.status}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{request.project || "Project not set"} · Requested by {request.requester || "not set"}</p>
          </div>
          <button type="button" aria-label="Close request details" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Request information</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                ["Project", request.project],
                ["Requester", request.requester],
                ["Request type", request.requestType],
                ["Sample details", request.sampleDetails],
                ["Quantity", String(request.quantity)],
                ["Purpose", request.purpose],
                ["Priority", request.priority],
                ["Required date", formatRequestDate(request.requiredDate)],
                ["Delivery address", request.deliveryAddress],
                ["Assigned coordinator", request.assignedCoordinator],
                ["Created", new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.createdAt))],
                ["Submitted", request.submittedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.submittedAt)) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || "—"}</dd></div>
              ))}
            </dl>
          </section>
          {isReviewable && (
            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">Coordinator review</h3>
              <p className="mt-1 text-sm text-muted-foreground">Assigned coordinator: {request.assignedCoordinator}. Confirm when this request is ready to proceed to Select &amp; Issue.</p>
              {reviewError && <p role="alert" className="mt-3 text-sm text-rose-700">{reviewError}</p>}
              <button type="button" onClick={() => {
                const validation = validateRequest(request)
                if (validation) {
                  setReviewError(`Request details need attention before proceeding: ${validation}`)
                  return
                }
                onConfirmReady()
              }} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><CheckCircle2 className="size-4" />Confirm ready for Select &amp; Issue<ArrowRight className="size-4" /></button>
            </section>
          )}
          {request.status === "Ready for Select & Issue" && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Coordinator confirmed this request ready for Select &amp; Issue on {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.readyAt ?? request.createdAt))}.</p>
          )}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">Close</button>
          {isDraft && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Edit2 className="size-4" />Edit draft</button>}
        </footer>
      </section>
    </div>
  )
}

export function SelectIssuePage() {
  const [requests] = usePersistentState<MaterialRequest[]>(requestsStorageKey, [])
  const [items, setItems] = usePersistentState<InventoryItem[]>(inventoryStorageKey, initialItems)
  const [workflows, setWorkflows] = usePersistentState<Stage2Workflow[]>(stage2WorkflowsStorageKey, [])
  const [dispatches, setDispatches] = usePersistentState<Stage2Dispatch[]>(stage2DispatchesStorageKey, [])
  const [activeRequestId, setActiveRequestId] = React.useState("")
  const [section, setSection] = React.useState<"Catalogue" | "Sample Bag" | "Sample Issue">("Catalogue")
  const [search, setSearch] = React.useState("")
  const [error, setError] = React.useState("")
  const [feedback, setFeedback] = React.useState("")

  const eligibleRequests = requests.filter((request) => request.status === "Ready for Select & Issue")
  const activeWorkflow = workflows.find((workflow) => workflow.request.id === activeRequestId)
  const activeRequest = eligibleRequests.find((request) => request.id === activeRequestId)
    ?? activeWorkflow?.request
  const query = search.trim().toLowerCase()
  const catalogue = items.filter((item) =>
    item.isSample && (!query || `${item.name} ${item.code} ${item.category} ${item.finish} ${item.size}`.toLowerCase().includes(query))
  )

  const reservedQuantityFor = (itemId: string) => workflows.reduce((sum, workflow) =>
    workflow.status === "reserved" || workflow.status === "prepared"
      ? sum + workflow.samples.reduce((lineSum, line) =>
        line.itemId === itemId && line.reservedAt ? lineSum + line.reservedQuantity : lineSum, 0)
      : sum, 0)

  const availableQuantityFor = (item: InventoryItem, stockItems = items) =>
    Math.max(0, (stockItems.find((entry) => entry.id === item.id)?.stock ?? 0) - reservedQuantityFor(item.id))

  const persistWorkflows = (next: Stage2Workflow[], message: string) => {
    try {
      window.localStorage.setItem(stage2WorkflowsStorageKey, JSON.stringify(next))
    } catch {
      setError("Stage 2 changes could not be saved in this browser.")
      return false
    }
    setWorkflows(next)
    setError("")
    setFeedback(message)
    return true
  }

  const openRequest = (request: MaterialRequest) => {
    setActiveRequestId(request.id)
    setSection("Catalogue")
    setSearch("")
    setError("")
    setFeedback("")
  }

  const updateLine = (itemId: string, update: Partial<Stage2SampleLine>) => {
    if (!activeWorkflow || activeWorkflow.status !== "selection") return
    const next = workflows.map((workflow) => workflow.request.id === activeWorkflow.request.id
      ? { ...workflow, samples: workflow.samples.map((line) => line.itemId === itemId ? { ...line, ...update } : line) }
      : workflow)
    persistWorkflows(next, "")
  }

  const addSample = (item: InventoryItem) => {
    if (!activeRequest || (activeWorkflow && activeWorkflow.status !== "selection")) return
    const workflow = activeWorkflow ?? {
      request: activeRequest,
      samples: [],
      status: "selection" as const,
      createdAt: currentTimestamp(),
    }
    const existing = workflow.samples.find((line) => line.itemId === item.id)
    if (existing) {
      setError("This sample is already in the Sample Bag. Update its quantity there.")
      return
    }
    if (workflow.samples.reduce((sum, line) => sum + line.selectedQuantity, 0) + 1 > activeRequest.quantity) {
      setError(`The Sample Bag cannot exceed the request quantity of ${activeRequest.quantity}.`)
      return
    }
    const line: Stage2SampleLine = {
      itemId: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      finish: item.finish,
      size: item.size,
      selectedQuantity: 1,
      stockLocation: getInventoryLocation(item),
      reservedQuantity: 0,
      issuedQuantity: 0,
      condition: "",
      issueStatus: "",
    }
    const nextWorkflow = { ...workflow, samples: [...workflow.samples, line] }
    const next = activeWorkflow
      ? workflows.map((entry) => entry.request.id === activeRequest.id ? nextWorkflow : entry)
      : [nextWorkflow, ...workflows]
    if (persistWorkflows(next, `${item.name} added to the Sample Bag.`)) setSection("Sample Bag")
  }

  const reserveSamples = () => {
    if (!activeWorkflow || activeWorkflow.status !== "selection" || activeWorkflow.samples.length === 0) return
    let currentItems = items
    try {
      const savedItems = window.localStorage.getItem(inventoryStorageKey)
      if (savedItems !== null) currentItems = JSON.parse(savedItems) as InventoryItem[]
    } catch {
      setError("Current inventory could not be read; stock was not reserved.")
      return
    }
    const totalSelected = activeWorkflow.samples.reduce((sum, line) => sum + line.selectedQuantity, 0)
    if (totalSelected > activeWorkflow.request.quantity) {
      setError(`Selected quantity cannot exceed the request quantity of ${activeWorkflow.request.quantity}.`)
      return
    }
    const insufficient = activeWorkflow.samples.find((line) => {
      const item = currentItems.find((entry) => entry.id === line.itemId)
      return !item || line.selectedQuantity < 1 || line.selectedQuantity > availableQuantityFor(item, currentItems)
    })
    if (insufficient) {
      setError(`${insufficient.name} does not have enough available stock. Update the Sample Bag quantities and try again.`)
      return
    }
    setItems(currentItems)
    const reservedAt = currentTimestamp()
    const nextWorkflow: Stage2Workflow = {
      ...activeWorkflow,
      status: "reserved",
      reservedAt,
      samples: activeWorkflow.samples.map((line) => ({
        ...line,
        reservedQuantity: line.selectedQuantity,
        reservedAt,
        issuedQuantity: 0,
      })),
    }
    const next = workflows.map((workflow) => workflow.request.id === activeRequestId ? nextWorkflow : workflow)
    if (persistWorkflows(next, "Stock checked and selected quantities reserved.")) setSection("Sample Issue")
  }

  const markPrepared = () => {
    if (!activeWorkflow || activeWorkflow.status !== "reserved") return
    const nextWorkflow = { ...activeWorkflow, status: "prepared" as const, preparedAt: currentTimestamp() }
    const next = workflows.map((workflow) => workflow.request.id === activeRequestId ? nextWorkflow : workflow)
    persistWorkflows(next, "Reserved samples marked as prepared.")
  }

  const createDispatch = (form: HTMLFormElement) => {
    if (!activeWorkflow || activeWorkflow.status !== "prepared") return
    const formData = new FormData(form)
    const expectedReturnDate = String(formData.get("expectedReturnDate") ?? "").trim()
    if (!expectedReturnDate) {
      setError("Enter the expected return date before creating the dispatch request.")
      return
    }
    const samples = activeWorkflow.samples.map((line) => ({
      ...line,
      issuedQuantity: Number(formData.get(`issued-${line.itemId}`)),
      condition: String(formData.get(`condition-${line.itemId}`) ?? ""),
      issueStatus: String(formData.get(`issueStatus-${line.itemId}`) ?? ""),
    }))
    const invalidLine = samples.find((line) =>
      !Number.isInteger(line.issuedQuantity) ||
      line.issuedQuantity < 0 ||
      line.issuedQuantity > line.reservedQuantity ||
      (line.issuedQuantity > 0 && (!line.condition || !line.issueStatus))
    )
    if (invalidLine) {
      setError(`${invalidLine.name} has an invalid issue quantity or is missing its condition or issue status.`)
      return
    }
    if (!samples.some((line) => line.issuedQuantity > 0)) {
      setError("Enter an issued quantity greater than zero for at least one sample.")
      return
    }
    if (dispatches.some((dispatch) => dispatch.request.id === activeWorkflow.request.id)) {
      setError("A dispatch request already exists for this sample request.")
      return
    }

    const createdAt = currentTimestamp()
    const dispatch: Stage2Dispatch = {
      id: `DSP-${activeWorkflow.request.id}`,
      request: activeWorkflow.request,
      samples: samples.filter((line) => line.issuedQuantity > 0),
      expectedReturnDate,
      createdAt,
      status: "Pending dispatch",
    }
    const nextWorkflow: Stage2Workflow = {
      ...activeWorkflow,
      samples,
      expectedReturnDate,
      dispatchedAt: createdAt,
      dispatchId: dispatch.id,
      status: "dispatched",
    }
    const nextWorkflows = workflows.map((workflow) => workflow.request.id === activeRequestId ? nextWorkflow : workflow)
    const nextDispatches = [dispatch, ...dispatches]
    const issuedByItem = new Map(samples.map((line) => [line.itemId, line.issuedQuantity]))
    const currentItems = items.map((item) => ({
      ...item,
      stock: Math.max(0, item.stock - (issuedByItem.get(item.id) ?? 0)),
    }))
    const issuedReportEntry = {
      id: activeWorkflow.request.id,
      organization: "",
      project: activeWorkflow.request.project,
      assignedTo: activeWorkflow.request.assignedCoordinator,
      requiredDate: activeWorkflow.request.requiredDate,
      returnBy: expectedReturnDate,
      issuedQuantity: dispatch.samples.reduce((sum, line) => sum + line.issuedQuantity, 0),
      dispatchStatus: "Pending",
      samples: dispatch.samples.map((line) => ({
        code: line.code,
        name: line.name,
        category: line.category,
        issuedQuantity: line.issuedQuantity,
      })),
      stage2DispatchId: dispatch.id,
      stage2Dispatch: dispatch,
    }
    let previousValues: Array<[string, string | null]> = []
    try {
      previousValues = [stage2WorkflowsStorageKey, stage2DispatchesStorageKey, issuedRequestsStorageKey, inventoryStorageKey]
        .map((key) => [key, window.localStorage.getItem(key)])
      const existingReports = JSON.parse(window.localStorage.getItem(issuedRequestsStorageKey) ?? "[]") as Array<{ id?: string }>
      const nextReports = [
        issuedReportEntry,
        ...existingReports.filter((entry) => entry.id !== issuedReportEntry.id),
      ]
      window.localStorage.setItem(stage2WorkflowsStorageKey, JSON.stringify(nextWorkflows))
      window.localStorage.setItem(stage2DispatchesStorageKey, JSON.stringify(nextDispatches))
      window.localStorage.setItem(issuedRequestsStorageKey, JSON.stringify(nextReports))
      window.localStorage.setItem(inventoryStorageKey, JSON.stringify(currentItems))
    } catch {
      try {
        previousValues.forEach(([key, value]) => {
          if (value === null) window.localStorage.removeItem(key)
          else window.localStorage.setItem(key, value)
        })
      } catch {
        setError("Dispatch creation failed and browser storage could not be restored.")
        return
      }
      setError("Dispatch request could not be saved because browser storage is unavailable.")
      return
    }
    setWorkflows(nextWorkflows)
    setDispatches(nextDispatches)
    setItems(currentItems)
    setError("")
    setFeedback(`${dispatch.id} is ready for the dispatch team or pickup arrangement.`)
    window.dispatchEvent(new CustomEvent("archscale:navigate", {
      detail: { activeRailId: "library", activeItem: "Delivery & Receipt" },
    }))
  }

  const totalBagQuantity = activeWorkflow?.samples.reduce((sum, line) => sum + line.selectedQuantity, 0) ?? 0
  const stepButton = (name: typeof section, icon: React.ReactNode, count?: number) => (
    <button type="button" onClick={() => { setSection(name); setError("") }} className={cn(
      "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium",
      section === name ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-background hover:bg-muted",
    )}>
      {icon}{name}{count === undefined ? null : <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs">{count}</span>}
    </button>
  )

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Stage 2</p>
          <h1 className="mt-1 text-xl font-semibold">Select &amp; Issue Samples</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select catalogue samples, reserve stock, prepare issues, and create dispatch requests.</p>
        </div>
        <label className="min-w-[220px] text-xs font-medium">
          Reviewed request
          <select aria-label="Reviewed request" value={activeRequestId} onChange={(event) => {
            const request = eligibleRequests.find((entry) => entry.id === event.target.value)
            if (request) openRequest(request)
            else setActiveRequestId("")
          }} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" disabled={eligibleRequests.length === 0}>
            <option value="">Select a Stage 1 reviewed request</option>
            {eligibleRequests.map((request) => (
              <option key={request.id} value={request.id}>{request.id} · {request.project}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
        {stepButton("Catalogue", <Package className="size-4" />)}
        {stepButton("Sample Bag", <ShoppingBag className="size-4" />, activeWorkflow?.samples.length ?? 0)}
        {stepButton("Sample Issue", <Send className="size-4" />)}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        {!activeRequest ? (
          <EmptyStage2 message="No requests are ready for Select & Issue. A request appears here after its assigned coordinator confirms it in Stage 1." />
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{activeRequest.id} · {activeRequest.status}</p>
                  <h2 className="mt-1 font-semibold">{activeRequest.project}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Requester: {activeRequest.requester} · Coordinator: {activeRequest.assignedCoordinator}</p>
                  <p className="mt-2 text-sm">{activeRequest.sampleDetails}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Request quantity</dt><dd className="font-medium">{activeRequest.quantity}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Required date</dt><dd className="font-medium">{formatRequestDate(activeRequest.requiredDate)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Request type</dt><dd className="font-medium">{activeRequest.requestType}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Delivery address</dt><dd className="font-medium">{activeRequest.deliveryAddress}</dd></div>
                </dl>
              </div>
            </section>

            {section === "Catalogue" && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-semibold">Sample Catalogue</h2><p className="text-sm text-muted-foreground">Select up to {activeRequest.quantity} total sample units for this request.</p></div>
                  <label className="relative block w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input aria-label="Search sample catalogue" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, code, category..." className={cn(inputClass, "pl-9")} />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {catalogue.map((item) => {
                    const available = availableQuantityFor(item)
                    const alreadySelected = activeWorkflow?.samples.some((line) => line.itemId === item.id) ?? false
                    return (
                      <article key={item.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start gap-3">
                          <span className="size-10 shrink-0 rounded-md border border-border" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                            <p className="text-xs text-muted-foreground">{item.code} · {item.category}</p>
                            <p className="mt-1 text-xs">{item.finish} · {item.size}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className={cn("rounded-full px-2 py-1 text-xs font-medium", available > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                            {available > 0 ? `Available · ${available}` : "Out of stock"}
                          </span>
                          <button type="button" disabled={available < 1 || alreadySelected || activeWorkflow?.status !== undefined && activeWorkflow.status !== "selection"} onClick={() => addSample(item)} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
                            {alreadySelected ? "In Sample Bag" : "Add sample"}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                  {catalogue.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No catalogue samples match this search.</p>}
                </div>
              </section>
            )}

            {section === "Sample Bag" && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-semibold">Sample Bag</h2><p className="text-sm text-muted-foreground">{totalBagQuantity} of {activeRequest.quantity} requested units selected.</p></div>
                  {activeWorkflow?.status === "selection" && <button type="button" onClick={reserveSamples} disabled={!activeWorkflow.samples.length} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40">Check stock &amp; reserve</button>}
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Sample</th><th className="px-3 py-2">Availability</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Stock location</th><th className="px-3 py-2">Action</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {(activeWorkflow?.samples ?? []).map((line) => {
                        const item = items.find((entry) => entry.id === line.itemId)
                        const available = item ? availableQuantityFor(item) : 0
                        return (
                          <tr key={line.itemId}>
                            <td className="px-3 py-3"><span className="block font-medium">{line.name}</span><span className="text-xs text-muted-foreground">{line.code} · {line.category}</span></td>
                            <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-1 text-xs font-medium", available >= line.selectedQuantity ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{available >= line.selectedQuantity ? `${available} available` : `Only ${available} available`}</span></td>
                            <td className="px-3 py-3"><input aria-label={`Quantity for ${line.name}`} type="number" min={1} max={Math.min(available, activeRequest.quantity - totalBagQuantity + line.selectedQuantity)} value={line.selectedQuantity} disabled={activeWorkflow?.status !== "selection"} onChange={(event) => {
                              const quantity = Number(event.target.value)
                              if (!Number.isInteger(quantity) || quantity < 1) return
                              const otherQuantity = totalBagQuantity - line.selectedQuantity
                              if (otherQuantity + quantity > activeRequest.quantity) {
                                setError(`Total Sample Bag quantity cannot exceed ${activeRequest.quantity}.`)
                                return
                              }
                              if (quantity > available) {
                                setError(`Only ${available} units of ${line.name} are available.`)
                                return
                              }
                              setError("")
                              updateLine(line.itemId, { selectedQuantity: quantity })
                            }} className="h-8 w-20 rounded-md border border-input px-2 text-sm disabled:bg-muted" /></td>
                            <td className="px-3 py-3">
                              {getInventoryLocations(item).length ? (
                                <select aria-label={`Stock location for ${line.name}`} disabled={activeWorkflow?.status !== "selection"} value={line.stockLocation} onChange={(event) => updateLine(line.itemId, { stockLocation: event.target.value })} className="h-8 max-w-40 rounded-md border border-input bg-background px-2 text-xs">
                                  <option value="">Select location</option>{getInventoryLocations(item).map((location) => <option key={location}>{location}</option>)}
                                </select>
                              ) : <span className="text-xs text-muted-foreground">No locations configured</span>}
                            </td>
                            <td className="px-3 py-3">{activeWorkflow?.status === "selection" && <button type="button" aria-label={`Remove ${line.name}`} onClick={() => {
                              const next = workflows.map((workflow) => workflow.request.id === activeRequestId
                                ? { ...workflow, samples: workflow.samples.filter((entry) => entry.itemId !== line.itemId) }
                                : workflow)
                              persistWorkflows(next, `${line.name} removed from the Sample Bag.`)
                            }} className="inline-flex h-8 items-center gap-1 rounded border border-input px-2 text-xs hover:bg-accent"><Trash2 className="size-3.5" />Remove</button>}</td>
                          </tr>
                        )
                      })}
                      {!activeWorkflow?.samples.length && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No samples selected yet. Browse the catalogue to add samples.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {section === "Sample Issue" && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-semibold">Reserve &amp; Prepare</h2>
                  <p className="text-sm text-muted-foreground">Available quantities are calculated from inventory stock minus active reservations.</p>
                </div>
                {!activeWorkflow?.samples.length ? (
                  <EmptyStage2 message="Add samples to the Sample Bag before reserving or issuing." />
                ) : activeWorkflow.status === "selection" ? (
                  <div className="rounded-lg border border-border p-5">
                    <p className="text-sm">Review the Sample Bag quantities, then check stock and reserve them before preparation.</p>
                    <button type="button" onClick={() => setSection("Sample Bag")} className="mt-3 h-9 rounded-md border border-input px-3 text-sm hover:bg-accent">Review Sample Bag</button>
                  </div>
                ) : activeWorkflow.status === "reserved" ? (
                  <div className="space-y-3 rounded-lg border border-border p-5">
                    <p className="text-sm">Reserved quantities are held for this request. Confirm when samples have been prepared.</p>
                    <SampleQuantitySummary lines={activeWorkflow.samples} />
                    <button type="button" onClick={markPrepared} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Mark samples prepared</button>
                  </div>
                ) : activeWorkflow.status === "prepared" ? (
                  <form className="space-y-4 rounded-lg border border-border p-5" onSubmit={(event) => { event.preventDefault(); createDispatch(event.currentTarget) }}>
                    <p className="text-sm">Enter actual issued quantities. Each quantity must be no greater than the reserved quantity.</p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Sample</th><th className="px-3 py-2">Reserved</th><th className="px-3 py-2">Actual issued</th><th className="px-3 py-2">Condition</th><th className="px-3 py-2">Issue status</th></tr></thead>
                        <tbody className="divide-y divide-border">
                          {activeWorkflow.samples.map((line) => (
                            <tr key={line.itemId}>
                              <td className="px-3 py-3 font-medium">{line.name}<span className="block text-xs text-muted-foreground">{line.code}</span></td>
                              <td className="px-3 py-3">{line.reservedQuantity}</td>
                              <td className="px-3 py-3"><input aria-label={`Issued quantity for ${line.name}`} name={`issued-${line.itemId}`} type="number" min={0} defaultValue={line.reservedQuantity} className="h-8 w-20 rounded-md border border-input px-2" /></td>
                              <td className="px-3 py-3"><select aria-label={`Condition for ${line.name}`} name={`condition-${line.itemId}`} defaultValue="" className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Select condition</option>{sampleConditions.map((value) => <option key={value}>{value}</option>)}</select></td>
                              <td className="px-3 py-3"><select aria-label={`Issue status for ${line.name}`} name={`issueStatus-${line.itemId}`} defaultValue="" className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Select status</option>{sampleIssueStatuses.map((value) => <option key={value}>{value}</option>)}</select></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <label className="block max-w-xs text-xs font-medium">Expected return date<input aria-label="Expected return date" name="expectedReturnDate" type="date" required className={cn(inputClass, "mt-1")} /></label>
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Condition and Issue Status options are initial suggestions pending business confirmation. No stock locations are present in the current inventory data.</p>
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Record issue &amp; create dispatch</button>
                  </form>
                ) : (
                  <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="font-semibold text-emerald-900">Dispatch request created</h3>
                    <p className="text-sm text-emerald-900">{activeWorkflow.dispatchId} · Expected return {formatRequestDate(activeWorkflow.expectedReturnDate)}</p>
                    <p className="text-sm text-emerald-900">Samples are ready for the dispatch team or pickup arrangement. Delivery and receipt have not been marked.</p>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("archscale:navigate", { detail: { activeRailId: "library", activeItem: "Delivery & Receipt" } }))} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Continue to Delivery &amp; Receipt</button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {feedback && <p role="status" className="mt-4 text-sm text-muted-foreground">{feedback}</p>}
      </main>
    </div>
  )
}

type Stage2SampleLine = {
  itemId: string
  code: string
  name: string
  category: string
  finish: string
  size: string
  selectedQuantity: number
  stockLocation: string
  reservedQuantity: number
  reservedAt?: string
  issuedQuantity: number
  condition: string
  issueStatus: string
}

type Stage2Workflow = {
  request: MaterialRequest
  samples: Stage2SampleLine[]
  status: "selection" | "reserved" | "prepared" | "dispatched"
  createdAt: string
  reservedAt?: string
  preparedAt?: string
  expectedReturnDate?: string
  dispatchedAt?: string
  dispatchId?: string
}

type Stage2Dispatch = {
  id: string
  request: MaterialRequest
  samples: Stage2SampleLine[]
  expectedReturnDate: string
  createdAt: string
  status: "Pending dispatch"
}

function getInventoryLocations(item?: InventoryItem): string[] {
  if (!item) return []
  const source = item as InventoryItem & { location?: unknown; stockLocation?: unknown; locations?: unknown }
  const values = [source.location, source.stockLocation, source.locations]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
  return [...new Set(values)]
}

function getInventoryLocation(item: InventoryItem): string {
  return getInventoryLocations(item)[0] ?? ""
}

function EmptyStage2({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{message}</div>
}

function SampleQuantitySummary({ lines }: { lines: Stage2SampleLine[] }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {lines.map((line) => <li key={line.itemId} className="flex justify-between gap-3 px-3 py-2 text-sm"><span>{line.name}</span><span>{line.reservedQuantity} reserved</span></li>)}
    </ul>
  )
}

function EmptySampleStagePage() {
  return <div className="min-h-0 w-full flex-1 bg-background" />
}

export function DeliveryReceiptPage() {
  return <EmptySampleStagePage />
}

export function ReviewsApprovalsPage() {
  return <EmptySampleStagePage />
}

export function ReturnsClosurePage() {
  return <EmptySampleStagePage />
}
