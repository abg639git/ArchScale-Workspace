import * as React from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import {
  ArrowRight,
  Check,
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
import { directoryData, type DirectoryEntry } from "@/components/split-view/data"

type RequestStatus = "Draft" | "Submitted" | "Ready for Select & Issue" | "Closed"

type SampleRequestSelection = {
  itemId: string
  name: string
  quantity: number
}

type MaterialRequest = {
  id: string
  project: string
  requester: string
  requestType: string
  sampleDetails: string
  sampleSelections?: SampleRequestSelection[]
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
const statusFilters = ["All", "Submitted", "Draft", "Ready for Select & Issue", "Closed"] as const
const requestsStorageKey = "archscale.samples.stage1.requests"
const stage2RequestStorageKey = "archscale.samples.stage2.currentRequest"
const stage2WorkflowsStorageKey = "archscale.samples.stage2.workflows"
const stage2DispatchesStorageKey = "archscale.samples.stage2.dispatches"
const issuedRequestsStorageKey = "archscale.samples.requests"
const inventoryStorageKey = "archscale.inventory.items"
const stage4ReviewsStorageKey = "archscale.samples.stage4.reviews"
const stage4CoordinatorNotificationsStorageKey = "archscale.samples.stage4.coordinatorNotifications"
const stage5RecordsStorageKey = "archscale.samples.stage5.records"
const stage5StockAdjustmentsStorageKey = "archscale.samples.stage5.stockAdjustments"

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
  if (!request.sampleSelections?.length) return "Select at least one sample."
  const missing = [
    ["Project", request.project],
    ["Requester", request.requester],
    ["Request type", request.requestType],
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
    sampleSelections: [],
    quantity: 0,
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
  const [inventoryItems] = usePersistentState<InventoryItem[]>(inventoryStorageKey, initialItems)
  const [sampleSearch, setSampleSearch] = React.useState("")
  const [isSampleMenuOpen, setIsSampleMenuOpen] = React.useState(false)
  const set = <K extends keyof MaterialRequest,>(key: K, value: MaterialRequest[K]) => {
    onChange({ ...request, [key]: value })
  }
  const selectedSamples = request.sampleSelections ?? []
  const availableSamples = inventoryItems.filter((item) => item.isSample)
  const matchingSamples = availableSamples.filter((item) =>
    `${item.name} ${item.code} ${item.category} ${item.finish} ${item.size}`
      .toLowerCase()
      .includes(sampleSearch.trim().toLowerCase())
  )
  const updateSampleSelections = (samples: SampleRequestSelection[]) => {
    onChange({
      ...request,
      sampleSelections: samples,
      sampleDetails: samples.map((sample) => sample.name).join(", "),
      quantity: samples.reduce((sum, sample) => sum + sample.quantity, 0),
    })
  }
  const toggleSample = (item: InventoryItem) => {
    const selected = selectedSamples.some((sample) => sample.itemId === item.id)
    updateSampleSelections(selected
      ? selectedSamples.filter((sample) => sample.itemId !== item.id)
      : [...selectedSamples, { itemId: item.id, name: item.name, quantity: 1 }])
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
                <div className="sm:col-span-2">
                  <span className={labelClass}>Sample details<span className="ml-1 text-destructive">*</span></span>
                  <div className="relative">
                    <button
                      type="button"
                      aria-expanded={isSampleMenuOpen}
                      onClick={() => setIsSampleMenuOpen((open) => !open)}
                      className={cn(inputClass, "flex items-center justify-between text-left")}
                    >
                      <span className="truncate">{selectedSamples.length ? `${selectedSamples.length} sample${selectedSamples.length === 1 ? "" : "s"} selected` : "Search and select samples"}</span>
                      <Search className="ml-2 size-4 shrink-0 text-muted-foreground" />
                    </button>
                    {isSampleMenuOpen && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background p-2 shadow-lg">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            autoFocus
                            type="search"
                            aria-label="Search catalogue samples"
                            value={sampleSearch}
                            onChange={(event) => setSampleSearch(event.target.value)}
                            placeholder="Search name, code, category..."
                            className={cn(inputClass, "pl-8")}
                          />
                        </div>
                        <div role="group" aria-label="Available catalogue samples" className="mt-2 max-h-52 overflow-y-auto">
                          {matchingSamples.map((item) => {
                            const checked = selectedSamples.some((sample) => sample.itemId === item.id)
                            return (
                              <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted">
                                <input type="checkbox" checked={checked} onChange={() => toggleSample(item)} className="size-4 accent-primary" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{item.name}</span>
                                  <span className="block truncate text-xs text-muted-foreground">{item.code} · {item.category}</span>
                                </span>
                                {checked && <Check className="size-4 text-primary" />}
                              </label>
                            )
                          })}
                          {matchingSamples.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">No catalogue samples match this search.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedSamples.length > 0 && (
                    <div className="mt-2 space-y-2" aria-label="Selected samples">
                      {selectedSamples.map((sample) => (
                        <div key={sample.itemId} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{sample.name}</span>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Quantity
                            <input
                              aria-label={`Requested quantity for ${sample.name}`}
                              type="number"
                              min={1}
                              step={1}
                              value={sample.quantity}
                              onChange={(event) => {
                                const quantity = Number(event.target.value)
                                if (!Number.isInteger(quantity) || quantity < 1) return
                                updateSampleSelections(selectedSamples.map((entry) =>
                                  entry.itemId === sample.itemId ? { ...entry, quantity } : entry
                                ))
                              }}
                              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove ${sample.name}`}
                            onClick={() => updateSampleSelections(selectedSamples.filter((entry) => entry.itemId !== sample.itemId))}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {error === "Select at least one sample." && <p role="alert" className="mt-1 text-xs text-destructive">Select at least one sample.</p>}
                </div>
                <label className="block min-w-0">
                  <span className={labelClass}>Quantity</span>
                  <input aria-label="Total requested quantity" type="number" value={request.quantity} readOnly className={cn(inputClass, "bg-muted")} />
                  <span className="mt-1 block text-xs text-muted-foreground">Total across selected samples.</span>
                </label>
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
          {error && error !== "Select at least one sample." && <p role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
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
    item.isSample &&
    (!activeRequest?.sampleSelections?.length || activeRequest.sampleSelections.some((sample) => sample.itemId === item.id)) &&
    (!query || `${item.name} ${item.code} ${item.category} ${item.finish} ${item.size}`.toLowerCase().includes(query))
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
    if (update.selectedQuantity !== undefined) {
      const requestedSample = activeWorkflow.request.sampleSelections?.find((sample) => sample.itemId === itemId)
      const requestedQuantity = requestedSample?.quantity ?? activeWorkflow.request.quantity
      if (update.selectedQuantity > requestedQuantity) {
        setError(`Selected quantity for ${requestedSample?.name ?? itemId} cannot exceed the ${requestedQuantity} requested.`)
        return
      }
    }
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
    if (activeRequest.sampleSelections?.length && !activeRequest.sampleSelections.some((sample) => sample.itemId === item.id)) {
      setError("This sample was not included in the Stage 1 request.")
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
      const requestedSample = activeWorkflow.request.sampleSelections?.find((sample) => sample.itemId === line.itemId)
      return !item ||
        line.selectedQuantity < 1 ||
        line.selectedQuantity > (requestedSample?.quantity ?? activeWorkflow.request.quantity) ||
        line.selectedQuantity > availableQuantityFor(item, currentItems)
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
                  <div><h2 className="font-semibold">Sample Catalogue</h2><p className="text-sm text-muted-foreground">{activeRequest.sampleSelections?.length ? "Choose only the samples requested in Stage 1 and select their requested quantities." : `Select up to ${activeRequest.quantity} total sample units for this request.`}</p></div>
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
                        const requestedQuantity = activeRequest.sampleSelections?.find((sample) => sample.itemId === line.itemId)?.quantity ?? activeRequest.quantity
                        return (
                          <tr key={line.itemId}>
                            <td className="px-3 py-3"><span className="block font-medium">{line.name}</span><span className="text-xs text-muted-foreground">{line.code} · {line.category}</span></td>
                            <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-1 text-xs font-medium", available >= line.selectedQuantity ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{available >= line.selectedQuantity ? `${available} available` : `Only ${available} available`}</span></td>
                            <td className="px-3 py-3"><input aria-label={`Quantity for ${line.name}`} type="number" min={1} max={Math.min(available, requestedQuantity, activeRequest.quantity - totalBagQuantity + line.selectedQuantity)} value={line.selectedQuantity} disabled={activeWorkflow?.status !== "selection"} onChange={(event) => {
                              const quantity = Number(event.target.value)
                              if (!Number.isInteger(quantity) || quantity < 1) return
                              const otherQuantity = totalBagQuantity - line.selectedQuantity
                              if (otherQuantity + quantity > activeRequest.quantity) {
                                setError(`Total Sample Bag quantity cannot exceed ${activeRequest.quantity}.`)
                                return
                              }
                              if (quantity > requestedQuantity) {
                                setError(`Selected quantity for ${line.name} cannot exceed the ${requestedQuantity} requested.`)
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
  delivery?: Stage3Delivery
}

type Stage3Delivery = {
  pickupLocation: string
  deliveryMethod: string
  deliveryAddress: string
  contactPerson: string
  contactNumber: string
  expectedDeliveryDate: string
  courierName: string
  trackingNumber: string
  dispatchDate: string
  dispatchStatus: string
  receiptStatus: string
  receivedDate: string
  receivedQuantity: number
  receivedCondition: string
  receiptNotes: string
  receiptConfirmedAt?: string
  history: Array<{ action: string; at: string }>
}

const deliveryMethods = ["Courier", "Pickup", "Hand delivery"]
const dispatchStatuses = ["Pending", "Ready for Dispatch", "Dispatched", "In Transit", "Delivered", "Failed"]
const receiptStatuses = ["Pending", "Partially Received", "Fully Received", "Damaged", "Rejected"]
const receivedConditions = ["Good", "Damaged", "Incomplete"]

function createDeliveryDraft(dispatch?: Stage2Dispatch): Stage3Delivery {
  return {
    pickupLocation: "",
    deliveryMethod: "",
    deliveryAddress: dispatch?.request.deliveryAddress ?? "",
    contactPerson: dispatch?.request.requester ?? "",
    contactNumber: "",
    expectedDeliveryDate: "",
    courierName: "",
    trackingNumber: "",
    dispatchDate: "",
    dispatchStatus: "Pending",
    receiptStatus: "Pending",
    receivedDate: "",
    receivedQuantity: 0,
    receivedCondition: "",
    receiptNotes: "",
    history: [],
  }
}

function readStage3Form(form: HTMLFormElement, current: Stage3Delivery): Stage3Delivery {
  const data = new FormData(form)
  const read = (name: string, fallback: string) => String(data.get(name) ?? fallback)
  const quantity = Number(read("Received Quantity", String(current.receivedQuantity)))
  return {
    ...current,
    pickupLocation: read("Pickup Location", current.pickupLocation),
    deliveryMethod: read("Delivery Method", current.deliveryMethod),
    deliveryAddress: read("Delivery Address", current.deliveryAddress),
    contactPerson: read("Contact Person", current.contactPerson),
    contactNumber: read("Contact Number", current.contactNumber),
    expectedDeliveryDate: read("Expected Delivery Date", current.expectedDeliveryDate),
    courierName: read("Courier Name (Optional)", current.courierName),
    trackingNumber: read("Tracking Number (Optional)", current.trackingNumber),
    dispatchDate: read("Dispatch Date", current.dispatchDate),
    dispatchStatus: read("Dispatch Status", current.dispatchStatus),
    receiptStatus: read("Receipt Status", current.receiptStatus),
    receivedDate: read("Received Date", current.receivedDate),
    receivedQuantity: Number.isFinite(quantity) ? quantity : current.receivedQuantity,
    receivedCondition: read("Received Condition", current.receivedCondition),
    receiptNotes: read("Receipt Notes (Optional)", current.receiptNotes),
  }
}

function validateStage3Receipt(delivery: Stage3Delivery, issuedQuantity: number): string | null {
  const required: Array<[string, string]> = [
    ["Pickup Location", delivery.pickupLocation],
    ["Delivery Method", delivery.deliveryMethod],
    ["Delivery Address", delivery.deliveryAddress],
    ["Contact Person", delivery.contactPerson],
    ["Expected Delivery Date", delivery.expectedDeliveryDate],
    ["Dispatch Status", delivery.dispatchStatus],
    ["Receipt Status", delivery.receiptStatus],
    ["Received Condition", delivery.receivedCondition],
  ]
  const missing = required.filter(([, value]) => !value.trim()).map(([label]) => label)
  if (missing.length) return `Complete the required fields: ${missing.join(", ")}.`
  if (delivery.receiptStatus === "Pending") return "Select a receipt status other than Pending before confirming receipt."
  if (!Number.isInteger(delivery.receivedQuantity) || delivery.receivedQuantity < 0 || delivery.receivedQuantity > issuedQuantity) {
    return `Received quantity must be a whole number between 0 and the issued quantity (${issuedQuantity}).`
  }
  if (delivery.receiptStatus === "Fully Received" && delivery.receivedQuantity !== issuedQuantity) {
    return `Fully Received requires the full issued quantity (${issuedQuantity}).`
  }
  if (delivery.receiptStatus === "Partially Received" && (delivery.receivedQuantity <= 0 || delivery.receivedQuantity >= issuedQuantity)) {
    return "Partially Received requires a received quantity greater than zero and less than the issued quantity."
  }
  if ((delivery.receiptStatus === "Damaged" || delivery.receiptStatus === "Rejected") && !delivery.receiptNotes.trim()) {
    return "Add receipt notes for damaged or rejected samples."
  }
  return null
}

function Stage3Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  min,
  multiline = false,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  required?: boolean
  type?: string
  min?: number
  multiline?: boolean
}) {
  const className = cn(inputClass, multiline && "h-auto min-h-20 resize-y py-2")
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
      {multiline
        ? <textarea name={label} required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={className} />
        : <input name={label} required={required} type={type} min={min} step={type === "number" ? "1" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className={className} />}
    </label>
  )
}

function Stage3Select({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
      <select name={label} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Stage3History({ history }: { history: Stage3Delivery["history"] }) {
  if (history.length === 0) return null
  return (
    <section className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Delivery &amp; Receipt History</h3>
      <ul className="mt-2 space-y-2">
        {history.slice().reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="flex flex-wrap justify-between gap-2 text-xs">
            <span>{entry.action}</span>
            <time className="text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at))}</time>
          </li>
        ))}
      </ul>
    </section>
  )
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

export function DeliveryReceiptPage() {
  const [dispatches, setDispatches] = usePersistentState<Stage2Dispatch[]>(stage2DispatchesStorageKey, [])
  const [activeDispatchId, setActiveDispatchId] = React.useState(() => dispatches[0]?.id ?? "")
  const [deliveryError, setDeliveryError] = React.useState("")
  const [deliveryFeedback, setDeliveryFeedback] = React.useState("")
  const activeDispatch = dispatches.find((dispatch) => dispatch.id === activeDispatchId)
  const delivery = activeDispatch?.delivery ?? createDeliveryDraft(activeDispatch)
  const issuedQuantity = activeDispatch?.samples.reduce((sum, line) => sum + line.issuedQuantity, 0) ?? 0
  const outstandingQuantity = Math.max(0, issuedQuantity - (delivery.receivedQuantity || 0))

  const updateDelivery = (update: Partial<Stage3Delivery>) => {
    if (!activeDispatch) return
    const history = update.history ?? (update.dispatchStatus && update.dispatchStatus !== delivery.dispatchStatus
      ? [...delivery.history, { action: `Dispatch status updated to ${update.dispatchStatus}`, at: currentTimestamp() }]
      : delivery.history)
    const updated: Stage2Dispatch = {
      ...activeDispatch,
      delivery: { ...delivery, ...update, history },
    }
    const next = dispatches.map((dispatch) => dispatch.id === updated.id ? updated : dispatch)
    try {
      window.localStorage.setItem(stage2DispatchesStorageKey, JSON.stringify(next))
    } catch {
      setDeliveryError("Delivery updates could not be saved in this browser.")
      return false
    }
    setDispatches(next)
    setDeliveryError("")
    return true
  }

  const saveDeliveryDraft = (form: HTMLFormElement) => {
    if (!activeDispatch) return
    const values = readStage3Form(form, delivery)
    const saved = updateDelivery({
      ...values,
      history: [...delivery.history, { action: "Delivery details saved as draft", at: currentTimestamp() }],
    })
    if (saved) setDeliveryFeedback("Delivery details saved as draft.")
  }

  const confirmReceipt = (form: HTMLFormElement) => {
    if (!activeDispatch) return
    const values = readStage3Form(form, delivery)
    const issueQty = activeDispatch.samples.reduce((sum, line) => sum + line.issuedQuantity, 0)
    const validation = validateStage3Receipt(values, issueQty)
    if (validation) {
      setDeliveryError(validation)
      return
    }
    const updatedDelivery: Stage3Delivery = {
      ...values,
      receiptConfirmedAt: currentTimestamp(),
      history: [...delivery.history, { action: `Receipt confirmed: ${values.receiptStatus}`, at: currentTimestamp() }],
    }
    const next = dispatches.map((dispatch) => dispatch.id === activeDispatch.id
      ? { ...dispatch, delivery: updatedDelivery }
      : dispatch)
    try {
      window.localStorage.setItem(stage2DispatchesStorageKey, JSON.stringify(next))
    } catch {
      setDeliveryError("Receipt confirmation could not be saved in this browser.")
      return
    }
    setDispatches(next)
    setDeliveryError("")
    setDeliveryFeedback(`Receipt confirmed for ${activeDispatch.request.id}.`)
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Stage 3</p>
          <h1 className="mt-1 text-xl font-semibold">Delivery &amp; Receipt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track dispatch progress and confirm received quantities and condition.</p>
        </div>
        <label className="min-w-[220px] text-xs font-medium">
          Stage 2 dispatch
          <select aria-label="Stage 2 dispatch" value={activeDispatchId} onChange={(event) => {
            setActiveDispatchId(event.target.value)
            setDeliveryError("")
            setDeliveryFeedback("")
          }} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" disabled={dispatches.length === 0}>
            <option value="">Select a Stage 2 dispatch</option>
            {dispatches.map((dispatch) => (
              <option key={dispatch.id} value={dispatch.id}>{dispatch.request.id} · {dispatch.request.project}</option>
            ))}
          </select>
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        {!activeDispatch ? (
          <EmptyStage2 message="No Stage 2 dispatches are available yet. Issued samples and their request details will appear here after Stage 2 creates a dispatch." />
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{activeDispatch.id} · Request {activeDispatch.request.id}</p>
                  <h2 className="mt-1 font-semibold">{activeDispatch.request.project}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Requester: {activeDispatch.request.requester} · Coordinator: {activeDispatch.request.assignedCoordinator}</p>
                </div>
                <div className="text-sm">
                  <p><span className="text-muted-foreground">Issued quantity:</span> <strong>{issuedQuantity}</strong></p>
                  <p><span className="text-muted-foreground">Received:</span> <strong>{delivery.receivedQuantity || 0}</strong></p>
                  <p><span className="text-muted-foreground">Outstanding:</span> <strong>{outstandingQuantity}</strong></p>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[500px] text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Issued sample</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Issued quantity</th><th className="px-3 py-2">Condition at issue</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {activeDispatch.samples.map((sample) => (
                      <tr key={sample.itemId}><td className="px-3 py-2">{sample.name}</td><td className="px-3 py-2">{sample.code}</td><td className="px-3 py-2">{sample.issuedQuantity}</td><td className="px-3 py-2">{sample.condition || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {delivery.receiptConfirmedAt ? (
              <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div>
                  <h2 className="font-semibold text-emerald-900">Receipt confirmed · {delivery.receiptStatus}</h2>
                  <p className="mt-1 text-sm text-emerald-900">
                    {delivery.receivedQuantity} received · {outstandingQuantity} outstanding · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(delivery.receiptConfirmedAt))}
                  </p>
                </div>
                <Stage3History history={delivery.history} />
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("archscale:navigate", {
                  detail: { activeRailId: "library", activeItem: "Reviews & Approvals" },
                }))} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                  Continue to Reviews &amp; Approvals<ArrowRight className="size-4" />
                </button>
              </section>
            ) : (
              <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); confirmReceipt(event.currentTarget) }}>
                <section className="rounded-lg border border-border p-4">
                  <h2 className="mb-4 text-base font-semibold">Delivery Information</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Stage3Field label="Pickup Location" value={delivery.pickupLocation} required onChange={(pickupLocation) => updateDelivery({ pickupLocation })} />
                    <Stage3Select label="Delivery Method" value={delivery.deliveryMethod} options={deliveryMethods} required onChange={(deliveryMethod) => updateDelivery({ deliveryMethod, courierName: deliveryMethod === "Courier" ? delivery.courierName : "", trackingNumber: deliveryMethod === "Courier" ? delivery.trackingNumber : "" })} />
                    <Stage3Field label="Delivery Address" value={delivery.deliveryAddress} required onChange={(deliveryAddress) => updateDelivery({ deliveryAddress })} />
                    <Stage3Field label="Contact Person" value={delivery.contactPerson} required onChange={(contactPerson) => updateDelivery({ contactPerson })} />
                    <Stage3Field label="Contact Number" value={delivery.contactNumber} type="tel" onChange={(contactNumber) => updateDelivery({ contactNumber })} />
                    <Stage3Field label="Expected Delivery Date" value={delivery.expectedDeliveryDate} type="date" required onChange={(expectedDeliveryDate) => updateDelivery({ expectedDeliveryDate })} />
                  </div>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <h2 className="mb-4 text-base font-semibold">Dispatch Information</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {delivery.deliveryMethod === "Courier" && (
                      <>
                        <Stage3Field label="Courier Name (Optional)" value={delivery.courierName} onChange={(courierName) => updateDelivery({ courierName })} />
                        <Stage3Field label="Tracking Number (Optional)" value={delivery.trackingNumber} onChange={(trackingNumber) => updateDelivery({ trackingNumber })} />
                      </>
                    )}
                    <Stage3Field label="Dispatch Date" value={delivery.dispatchDate} type="date" onChange={(dispatchDate) => updateDelivery({ dispatchDate })} />
                    <Stage3Select label="Dispatch Status" value={delivery.dispatchStatus} options={dispatchStatuses} required onChange={(dispatchStatus) => updateDelivery({ dispatchStatus })} />
                  </div>
                </section>

                <section className="rounded-lg border border-border p-4">
                  <h2 className="mb-4 text-base font-semibold">Receipt Confirmation</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Stage3Select label="Receipt Status" value={delivery.receiptStatus} options={receiptStatuses} required onChange={(receiptStatus) => updateDelivery({ receiptStatus })} />
                    <Stage3Field label="Received Date" value={delivery.receivedDate} type="date" onChange={(receivedDate) => updateDelivery({ receivedDate })} />
                    <Stage3Field label={`Received Quantity (Issued: ${issuedQuantity})`} value={delivery.receivedQuantity} type="number" min={0} required onChange={(value) => {
                      const receivedQuantity = Number(value)
                      if (Number.isInteger(receivedQuantity) && receivedQuantity >= 0 && receivedQuantity <= issuedQuantity) {
                        updateDelivery({ receivedQuantity })
                        setDeliveryError("")
                      } else {
                        setDeliveryError(`Received quantity must be between 0 and ${issuedQuantity}.`)
                      }
                    }} />
                    <Stage3Select label="Received Condition" value={delivery.receivedCondition} options={receivedConditions} required onChange={(receivedCondition) => updateDelivery({ receivedCondition })} />
                    <div className="sm:col-span-2"><Stage3Field label="Receipt Notes (Optional)" value={delivery.receiptNotes} multiline onChange={(receiptNotes) => updateDelivery({ receiptNotes })} /></div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Outstanding quantity: <strong>{outstandingQuantity}</strong> of {issuedQuantity}</p>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Damaged or rejected receipt statuses require notes. Fully received requires the full issued quantity and a recorded condition.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={(event) => saveDeliveryDraft(event.currentTarget.form!)} className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">Save as Draft</button>
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Confirm Receipt</button>
                  </div>
                </div>
                {deliveryError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{deliveryError}</p>}
                {deliveryFeedback && <p role="status" className="text-sm text-muted-foreground">{deliveryFeedback}</p>}
                <Stage3History history={delivery.history} />
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export function ReviewsApprovalsPage() {
  const [dispatches] = usePersistentState<Stage2Dispatch[]>(stage2DispatchesStorageKey, [])
  const [reviews, setReviews] = usePersistentState<Stage4SampleReview[]>(stage4ReviewsStorageKey, [])
  const [contacts] = usePersistentState<DirectoryEntry[]>("archscale.contacts", directoryData)
  const [activeDispatchId, setActiveDispatchId] = React.useState(() => dispatches[0]?.id ?? "")
  const [sampleId, setSampleId] = React.useState("")
  const [reviewer, setReviewer] = React.useState("")
  const [reviewDate, setReviewDate] = React.useState("")
  const [reviewStatus, setReviewStatus] = React.useState<Stage4ReviewStatus>("Pending Review")
  const [decision, setDecision] = React.useState<Stage4Decision | "">("")
  const [comments, setComments] = React.useState("")
  const [feedback, setFeedback] = React.useState("")
  const [reviewedQuantity, setReviewedQuantity] = React.useState(0)
  const [followUp, setFollowUp] = React.useState<Stage4FollowUp>("No Follow-up")
  const [finalDecision, setFinalDecision] = React.useState<Stage4Decision | "">("")
  const [finalComments, setFinalComments] = React.useState("")
  const [decisionDate, setDecisionDate] = React.useState("")
  const [responsibleCoordinator, setResponsibleCoordinator] = React.useState("")
  const [error, setError] = React.useState("")
  const [message, setMessage] = React.useState("")

  const eligibleDispatches = dispatches.filter((dispatch) => {
    const receipt = dispatch.delivery
    return !!receipt?.receiptConfirmedAt &&
      (receipt.receiptStatus === "Partially Received" || receipt.receiptStatus === "Fully Received") &&
      receipt.receivedCondition !== "Damaged" &&
      receipt.receivedQuantity > 0 &&
      dispatch.samples.some((sample) => sample.issuedQuantity > 0 && sample.condition !== "Damaged")
  })
  const activeDispatch = eligibleDispatches.find((dispatch) => dispatch.id === activeDispatchId)
  const receipt = activeDispatch?.delivery
  const eligibleSamples = activeDispatch?.samples.filter((sample) =>
    sample.issuedQuantity > 0 && sample.condition !== "Damaged"
  ) ?? []
  const activeRecord = reviews.find((record) => record.dispatchId === activeDispatchId && record.sampleId === sampleId)
  const activeCycle = activeRecord?.cycles.at(-1)
  const reviewerContacts = contacts.length ? contacts : directoryData
  const authorizedReviewers = reviewerContacts.filter((contact) =>
    contact.type === "person" &&
    contact.status === "active" &&
    contact.tags.some((tag) => tag.toLowerCase() === "client" || tag.toLowerCase() === "studio")
  )
  const reviewedByOtherSamples = activeDispatchId
    ? reviews.filter((record) => record.dispatchId === activeDispatchId && record.sampleId !== sampleId)
      .reduce((sum, record) => sum + (record.cycles.at(-1)?.reviewedQuantity ?? 0), 0)
    : 0
  const availableReviewQuantity = Math.max(0, (receipt?.receivedQuantity ?? 0) - reviewedByOtherSamples)

  React.useEffect(() => {
    if (activeCycle) {
      setReviewer(activeCycle.reviewer)
      setReviewDate(activeCycle.reviewDate)
      setReviewStatus(activeCycle.status)
      setDecision(activeCycle.decision)
      setComments(activeCycle.comments)
      setFeedback(activeCycle.feedback)
      setReviewedQuantity(activeCycle.reviewedQuantity)
      setFollowUp(activeCycle.followUp)
      setFinalDecision(activeCycle.finalDecision ?? "")
      setFinalComments(activeCycle.finalComments ?? "")
      setDecisionDate(activeCycle.decisionDate ?? "")
      setResponsibleCoordinator(activeCycle.nextResponsibleCoordinator ?? activeDispatch?.request.assignedCoordinator ?? "")
    } else {
      setReviewer("")
      setReviewDate("")
      setReviewStatus("Pending Review")
      setDecision("")
      setComments("")
      setFeedback("")
      setReviewedQuantity(0)
      setFollowUp("No Follow-up")
      setFinalDecision("")
      setFinalComments("")
      setDecisionDate("")
      setResponsibleCoordinator(activeDispatch?.request.assignedCoordinator ?? "")
    }
    setError("")
    setMessage("")
  }, [activeDispatchId, sampleId, reviews, activeDispatch, activeCycle])

  const persistReviews = (nextReviews: Stage4SampleReview[], successMessage: string) => {
    try {
      window.localStorage.setItem(stage4ReviewsStorageKey, JSON.stringify(nextReviews))
    } catch {
      setError("Review updates could not be saved in this browser.")
      return false
    }
    setReviews(nextReviews)
    setError("")
    setMessage(successMessage)
    return true
  }

  const saveReview = (mode: "draft" | "submit" | "complete") => {
    if (!activeDispatch || !receipt || !sampleId) return
    const sample = eligibleSamples.find((entry) => entry.itemId === sampleId)
    if (!sample) return
    const currentRecord = reviews.find((record) => record.dispatchId === activeDispatch.id && record.sampleId === sampleId)
    const currentCycle = currentRecord?.cycles.at(-1)
    if (currentCycle?.status === "Review Completed" || currentCycle?.finalDecision) {
      setError("This review cycle is complete and cannot be changed. Start a revision cycle when applicable.")
      return
    }
    if (!reviewer) {
      setError("Select an authorized client or studio reviewer.")
      return
    }
    if (!reviewedQuantity || !Number.isInteger(reviewedQuantity) || reviewedQuantity > availableReviewQuantity) {
      setError(`Reviewed quantity must be between 1 and ${availableReviewQuantity}, based on confirmed received quantity.`)
      return
    }
    if (mode === "complete") {
      if (!decision) {
        setError("Select a review decision before recording this review.")
        return
      }
      if (decision === "Rejected" && !comments.trim()) {
        setError("Add a rejection reason in Reviewer Comments.")
        return
      }
      if (decision === "Changes Required" && !feedback.trim()) {
        setError("Describe the required changes before completing this review.")
        return
      }
      if (decision === "Changes Required") setFollowUp("Revision Required")
    }
    const cycleNumber = currentRecord?.cycles.length ?? 0
    const cycle: Stage4ReviewCycle = {
      cycle: cycleNumber || 1,
      reviewer,
      reviewDate: reviewDate || new Date().toISOString().slice(0, 10),
      status: mode === "complete" ? "Review Completed" : mode === "submit" ? reviewStatus : "Pending Review",
      isDraft: mode === "draft",
      decision: mode === "complete" ? decision : decision,
      comments,
      feedback,
      reviewedQuantity,
      followUp: decision === "Changes Required" && mode === "complete" ? "Revision Required" : followUp,
      history: [
        ...(currentCycle?.history ?? []),
        { action: mode === "draft" ? "Review saved as draft" : mode === "submit" ? "Submitted for review" : `Review decision recorded: ${decision}`, at: currentTimestamp() },
      ],
    }
    const record: Stage4SampleReview = {
      requestId: activeDispatch.request.id,
      dispatchId: activeDispatch.id,
      project: activeDispatch.request.project,
      sampleId: sample.itemId,
      sampleCode: sample.code,
      sampleName: sample.name,
      issuedQuantity: sample.issuedQuantity,
      receivedQuantity: receipt.receivedQuantity,
      receivedCondition: receipt.receivedCondition,
      receiptStatus: receipt.receiptStatus,
      cycles: currentRecord
        ? [...currentRecord.cycles.slice(0, -1), cycle]
        : [cycle],
    }
    const next = currentRecord
      ? reviews.map((entry) => entry.dispatchId === record.dispatchId && entry.sampleId === record.sampleId ? record : entry)
      : [record, ...reviews]
    persistReviews(next, mode === "draft" ? "Review saved as draft." : mode === "submit" ? "Review submitted." : "Review decision recorded. Final decision is still required.")
  }

  const recordFinalDecision = () => {
    if (!activeRecord || !activeCycle || activeCycle.status !== "Review Completed" || activeCycle.finalDecision) {
      setError("Complete the sample review before recording a final decision.")
      return
    }
    if (!finalDecision || !decisionDate || !responsibleCoordinator.trim()) {
      setError("Final Decision, Decision Date, and Next Responsible Coordinator are required.")
      return
    }
    if ((finalDecision === "Rejected" || finalDecision === "Changes Required") && !finalComments.trim()) {
      setError("Add Final Comments for a rejected or changes-required decision.")
      return
    }
    const finalCycle: Stage4ReviewCycle = {
      ...activeCycle,
      finalDecision,
      finalComments,
      decisionDate,
      nextResponsibleCoordinator: responsibleCoordinator,
      coordinatorNotifiedAt: currentTimestamp(),
      history: [...activeCycle.history, { action: `Final decision recorded: ${finalDecision}; coordinator notified: ${responsibleCoordinator}`, at: currentTimestamp() }],
    }
    const updatedRecord = { ...activeRecord, cycles: [...activeRecord.cycles.slice(0, -1), finalCycle] }
    const next = reviews.map((record) => record.dispatchId === activeRecord.dispatchId && record.sampleId === activeRecord.sampleId ? updatedRecord : record)
    const notification: Stage4CoordinatorNotification = {
      id: `${activeRecord.dispatchId}-${activeRecord.sampleId}-cycle-${activeCycle.cycle}`,
      requestId: activeRecord.requestId,
      dispatchId: activeRecord.dispatchId,
      sampleName: activeRecord.sampleName,
      coordinator: responsibleCoordinator,
      decision: finalDecision,
      comments: finalComments,
      createdAt: finalCycle.coordinatorNotifiedAt!,
      read: false,
    }
    let previous: Array<[string, string | null]> = []
    try {
      previous = [stage4ReviewsStorageKey, stage4CoordinatorNotificationsStorageKey]
        .map((key) => [key, window.localStorage.getItem(key)])
      const currentNotifications = JSON.parse(window.localStorage.getItem(stage4CoordinatorNotificationsStorageKey) ?? "[]") as Stage4CoordinatorNotification[]
      const nextNotifications = [notification, ...currentNotifications.filter((item) => item.id !== notification.id)]
      window.localStorage.setItem(stage4ReviewsStorageKey, JSON.stringify(next))
      window.localStorage.setItem(stage4CoordinatorNotificationsStorageKey, JSON.stringify(nextNotifications))
    } catch {
      try {
        previous.forEach(([key, value]) => {
          if (value === null) window.localStorage.removeItem(key)
          else window.localStorage.setItem(key, value)
        })
      } catch {
        setError("Final decision save failed and browser storage could not be restored.")
        return
      }
      setError("Final decision and coordinator notification could not be saved in this browser.")
      return
    }
    setReviews(next)
    setError("")
    setMessage(`Final decision recorded; a coordinator notification is queued in this browser for ${responsibleCoordinator}.`)
  }

  const startRevisionCycle = () => {
    if (!activeRecord || !activeCycle?.finalDecision) return
    const revisionCycle: Stage4ReviewCycle = {
      cycle: activeRecord.cycles.length + 1,
      reviewer: "",
      reviewDate: "",
      status: "Pending Review",
      decision: "",
      comments: "",
      feedback: "",
      reviewedQuantity: activeCycle.reviewedQuantity,
      followUp: "No Follow-up",
      history: [{ action: `Revision review cycle ${activeRecord.cycles.length + 1} opened; prior decisions retained`, at: currentTimestamp() }],
    }
    const updated = { ...activeRecord, cycles: [...activeRecord.cycles, revisionCycle] }
    persistReviews(reviews.map((record) => record.dispatchId === updated.dispatchId && record.sampleId === updated.sampleId ? updated : record), "New review cycle opened; prior review history is preserved.")
  }

  const nextAction = activeCycle?.finalDecision === "Approved" && activeCycle.followUp === "No Follow-up"
    ? "Continue to Returns & Closure"
    : activeCycle?.finalDecision === "Changes Required" || activeCycle?.followUp === "Revision Required"
      ? "Coordinator follow-up: revision required"
      : activeCycle?.followUp === "Replacement Required"
        ? "Coordinator follow-up: replacement required"
        : activeCycle?.followUp === "Coordinator Action Required" || activeCycle?.finalDecision === "Rejected"
          ? "Coordinator action required"
          : ""

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Stage 4</p>
          <h1 className="mt-1 text-xl font-semibold">Reviews &amp; Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review confirmed received samples, record feedback, and route the next action.</p>
        </div>
        <label className="min-w-[220px] text-xs font-medium">
          Confirmed Stage 3 receipt
          <select aria-label="Confirmed Stage 3 receipt" value={activeDispatchId} onChange={(event) => {
            setActiveDispatchId(event.target.value)
            setSampleId("")
          }} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" disabled={!eligibleDispatches.length}>
            <option value="">Select a confirmed receipt</option>
            {eligibleDispatches.map((dispatch) => <option key={dispatch.id} value={dispatch.id}>{dispatch.request.id} · {dispatch.request.project}</option>)}
          </select>
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        {!eligibleDispatches.length ? (
          <EmptyStage2 message="No confirmed, reviewable Stage 3 receipts are available. Pending, rejected, and damaged receipts are excluded." />
        ) : !activeDispatch || !receipt ? (
          <EmptyStage2 message="Select a confirmed receipt to review its received samples." />
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <h2 className="mb-3 text-base font-semibold">Stage 3 Receipt Summary</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                <ReviewSummary label="Request ID" value={activeDispatch.request.id} />
                <ReviewSummary label="Project" value={activeDispatch.request.project} />
                <ReviewSummary label="Sample details" value={activeDispatch.request.sampleDetails} />
                <ReviewSummary label="Issued quantity" value={String(activeDispatch.samples.reduce((sum, item) => sum + item.issuedQuantity, 0))} />
                <ReviewSummary label="Received quantity" value={String(receipt.receivedQuantity)} />
                <ReviewSummary label="Received condition" value={receipt.receivedCondition} />
                <ReviewSummary label="Receipt status" value={receipt.receiptStatus} />
                <ReviewSummary label="Outstanding" value={String(Math.max(0, activeDispatch.samples.reduce((sum, item) => sum + item.issuedQuantity, 0) - receipt.receivedQuantity))} />
              </dl>
            </section>

            <section className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">1. Review Information</h2>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", activeCycle?.status === "Review Completed" ? "bg-emerald-100 text-emerald-800" : activeCycle?.isDraft ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800")}>
                  {activeCycle?.isDraft ? "Draft" : activeCycle?.status ?? reviewStatus}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ReviewReadOnly label="Project *" value={activeDispatch.request.project} />
                <label className="block text-xs font-medium"><span className={labelClass}>Sample Selection *</span>
                  <select aria-label="Sample Selection" value={sampleId} onChange={(event) => setSampleId(event.target.value)} className={inputClass}>
                    <option value="">Select received sample</option>
                    {eligibleSamples.map((sample) => <option key={sample.itemId} value={sample.itemId}>{sample.name} · {sample.code} · issued {sample.issuedQuantity}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium"><span className={labelClass}>Reviewer *</span>
                  <select aria-label="Reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} className={inputClass}>
                    <option value="">Select authorized reviewer</option>
                    {authorizedReviewers.map((contact) => <option key={contact.id} value={contact.name}>{contact.name} · {contact.tags.filter((tag) => ["client", "studio"].includes(tag.toLowerCase())).join("/")}</option>)}
                  </select>
                </label>
                <ReviewInput label="Review Date" type="date" value={reviewDate} onChange={setReviewDate} />
                <label className="block text-xs font-medium"><span className={labelClass}>Review Status</span>
                  <select aria-label="Review Status" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as Stage4ReviewStatus)} className={inputClass}>
                    {reviewStatuses.map((status) => <option key={status} disabled={status === "Review Completed"}>{status}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border p-4">
              <h2 className="text-base font-semibold">2. Sample Review &amp; Feedback</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs font-medium"><span className={labelClass}>Review Decision *</span>
                  <select aria-label="Review Decision" value={decision} onChange={(event) => setDecision(event.target.value as Stage4Decision | "")} className={inputClass}>
                    <option value="">Select review decision</option>{reviewDecisions.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <ReviewInput label="Reviewed Quantity *" type="number" min={0} max={availableReviewQuantity} value={reviewedQuantity || ""} onChange={(value) => setReviewedQuantity(Number(value))} />
                <ReviewTextarea label="Reviewer Comments" value={comments} onChange={setComments} />
                {(decision === "Changes Required" || decision === "Rejected") && <ReviewTextarea label="Feedback / Required Changes" value={feedback} onChange={setFeedback} />}
              </div>
              {sampleId && <p className="text-xs text-muted-foreground">Review quantity remaining from this receipt: {availableReviewQuantity} of {receipt.receivedQuantity} received.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => saveReview("draft")} disabled={!sampleId || activeCycle?.status === "Review Completed" || !!activeCycle?.finalDecision} className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-40">Save as Draft</button>
                <button type="button" onClick={() => saveReview("submit")} disabled={!sampleId || activeCycle?.status === "Review Completed" || !!activeCycle?.finalDecision} className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-40">Submit for Review</button>
                <button type="button" onClick={() => saveReview("complete")} disabled={!sampleId || activeCycle?.status === "Review Completed" || !!activeCycle?.finalDecision} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40">Record Review Decision</button>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border p-4">
              <h2 className="text-base font-semibold">3. Follow-up Actions</h2>
              <label className="block max-w-md text-xs font-medium"><span className={labelClass}>Follow-up</span>
                <select aria-label="Follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value as Stage4FollowUp)} disabled={decision === "Changes Required"} className={inputClass}>
                  {followUps.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              {decision === "Rejected" && <p className="text-sm text-amber-800">A rejection reason is required and will be included in the coordinator notification when the final decision is recorded.</p>}
              {decision === "Changes Required" && <p className="text-sm text-amber-800">Revision Required will be created when this review decision is recorded.</p>}
              {followUp === "Replacement Required" && <p className="text-sm text-muted-foreground">Replacement follow-up will remain linked to request {activeDispatch.request.id}.</p>}
              {followUp === "Coordinator Action Required" && <p className="text-sm text-muted-foreground">The next action will be routed to the assigned coordinator.</p>}
            </section>

            <section className="space-y-4 rounded-lg border border-border p-4">
              <h2 className="text-base font-semibold">4. Final Decision</h2>
              {activeCycle?.finalDecision ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">{activeCycle.finalDecision}</span><span className="text-sm text-muted-foreground">Recorded {activeCycle.decisionDate} · Coordinator notification recorded for {activeCycle.nextResponsibleCoordinator}</span></div>
                  <p className="text-sm">{activeCycle.finalComments || "No final comments."}</p>
                  <p className="text-sm font-medium">{nextAction}</p>
                  {activeCycle.finalDecision === "Approved" && activeCycle.followUp === "No Follow-up" && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("archscale:navigate", { detail: { activeRailId: "library", activeItem: "Returns & Closure" } }))} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Continue to Returns &amp; Closure</button>}
                  {(activeCycle.finalDecision === "Changes Required" || activeCycle.followUp === "Revision Required") && <button type="button" onClick={startRevisionCycle} className="h-9 rounded-md border border-input px-3 text-sm font-medium">Start revision review cycle</button>}
                </div>
              ) : (
                <>
                  {!activeCycle || activeCycle.status !== "Review Completed" ? <p className="text-sm text-muted-foreground">Record a review decision before entering the separate final decision.</p> : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block text-xs font-medium"><span className={labelClass}>Final Decision</span>
                        <select aria-label="Final Decision" value={finalDecision} onChange={(event) => setFinalDecision(event.target.value as Stage4Decision | "")} className={inputClass}>
                          <option value="">Select final decision</option>{finalDecisions.map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </label>
                      <ReviewInput label="Decision Date" type="date" value={decisionDate} onChange={setDecisionDate} />
                      <label className="block text-xs font-medium"><span className={labelClass}>Next Responsible Coordinator</span>
                        <select aria-label="Next Responsible Coordinator" value={responsibleCoordinator} onChange={(event) => setResponsibleCoordinator(event.target.value)} className={inputClass}>
                          <option value="">Select coordinator</option><option>{activeDispatch.request.assignedCoordinator}</option>
                        </select>
                      </label>
                      <ReviewTextarea label="Final Comments" value={finalComments} onChange={setFinalComments} />
                      <button type="button" onClick={recordFinalDecision} className="h-9 self-end rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Record Final Decision &amp; Queue Coordinator Notification</button>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="space-y-2 rounded-lg border border-border p-4">
              <h2 className="text-base font-semibold">Sample Review History</h2>
              {activeRecord?.cycles.length ? activeRecord.cycles.map((cycle) => (
                <div key={cycle.cycle} className="rounded-md bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2"><strong>Cycle {cycle.cycle} · {cycle.isDraft ? "Draft" : cycle.status}</strong><span>{cycle.decision || "No decision"}{cycle.finalDecision ? ` · Final: ${cycle.finalDecision}` : ""}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">Reviewer: {cycle.reviewer || "—"} · {cycle.reviewDate || "No review date"} · Quantity: {cycle.reviewedQuantity}</p>
                  {cycle.comments && <p className="mt-2 text-sm">{cycle.comments}</p>}
                  {cycle.feedback && <p className="mt-1 text-sm">Required changes: {cycle.feedback}</p>}
                  {cycle.finalComments && <p className="mt-1 text-sm">Final comments: {cycle.finalComments}</p>}
                  {cycle.history.map((entry, index) => <p key={`${entry.at}-${index}`} className="mt-1 text-xs text-muted-foreground">{entry.action} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at))}</p>)}
                </div>
              )) : <p className="text-sm text-muted-foreground">No review history for this sample yet.</p>}
            </section>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </main>
    </div>
  )
}

type Stage4Decision = "Approved" | "Rejected" | "Changes Required"
type Stage4ReviewStatus = "Pending Review" | "Under Review" | "Review Completed"
type Stage4FollowUp = "No Follow-up" | "Revision Required" | "Replacement Required" | "Coordinator Action Required"
type Stage4ReviewCycle = {
  cycle: number
  reviewer: string
  reviewDate: string
  status: Stage4ReviewStatus
  isDraft?: boolean
  decision: Stage4Decision | ""
  comments: string
  feedback: string
  reviewedQuantity: number
  followUp: Stage4FollowUp
  finalDecision?: Stage4Decision
  finalComments?: string
  decisionDate?: string
  nextResponsibleCoordinator?: string
  coordinatorNotifiedAt?: string
  history: Array<{ action: string; at: string }>
}
type Stage4SampleReview = {
  requestId: string
  dispatchId: string
  project: string
  sampleId: string
  sampleCode: string
  sampleName: string
  issuedQuantity: number
  receivedQuantity: number
  receivedCondition: string
  receiptStatus: string
  cycles: Stage4ReviewCycle[]
}
type Stage4CoordinatorNotification = {
  id: string
  requestId: string
  dispatchId: string
  sampleName: string
  coordinator: string
  decision: Stage4Decision
  comments: string
  createdAt: string
  read: boolean
}

const reviewStatuses: Stage4ReviewStatus[] = ["Pending Review", "Under Review", "Review Completed"]
const reviewDecisions: Stage4Decision[] = ["Approved", "Rejected", "Changes Required"]
const finalDecisions: Stage4Decision[] = ["Approved", "Rejected", "Changes Required"]
const followUps: Stage4FollowUp[] = ["No Follow-up", "Revision Required", "Replacement Required", "Coordinator Action Required"]

function ReviewSummary({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "—"}</dd></div>
}

function ReviewReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-muted/30 px-3 py-2"><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-sm font-medium">{value || "—"}</span></div>
}

function ReviewInput({
  label, value, onChange, type = "text", min, max, disabled = false,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  min?: number
  max?: number
  disabled?: boolean
}) {
  return <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>{label}</span><input aria-label={label} type={type} min={min} max={max} step={type === "number" ? "1" : undefined} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, disabled && "cursor-not-allowed bg-muted")} /></label>
}

function ReviewTextarea({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>{label}</span><textarea aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={2} className={cn(inputClass, "h-auto min-h-20 resize-y py-2", disabled && "cursor-not-allowed bg-muted")} /></label>
}

type Stage5Disposition = "Returned to Stock" | "Damaged" | "Lost" | "Retained by Client" | "Consumed" | "Converted to Permanent Sample"
type Stage5SampleDisposition = {
  id: string
  disposition: Stage5Disposition | ""
  quantity: number
  notes: string
}
type Stage5SampleRecord = {
  sampleId: string
  sampleCode: string
  sampleName: string
  issuedQuantity: number
  finalReviewDecision: Stage4Decision
  sampleStatus: string
  returnRequired: "Yes" | "No"
  expectedReturnDate: string
  actualReturnDate: string
  returnedQuantity: number
  returnStatus: "Pending" | "Return Arranged" | "Partially Returned" | "Fully Returned" | "Not Required"
  condition: "Good" | "Damaged" | "Incomplete" | ""
  returnNotes: string
  receivedBackQuantity: number
  verifiedReceivedBackQuantity: number
  receivedDate: string
  verifiedBy: string
  inspectionNotes: string
  stockedQuantity: number
  stockUpdateStatus: string
  verifiedCondition: "Good" | "Damaged" | "Incomplete" | ""
  receiptVerifiedAt?: string
  dispositions: Stage5SampleDisposition[]
}
type Stage5ClosureRecord = {
  request: MaterialRequest
  dispatchId: string
  project: string
  samples: Stage5SampleRecord[]
  closureStatus: "Pending Closure" | "Ready to Close" | "Closed"
  closureDate: string
  closedBy: string
  closureNotes: string
  closedAt?: string
  history: Array<{ action: string; at: string }>
}
type Stage5StockAdjustment = {
  id: string
  requestId: string
  dispatchId: string
  sampleId: string
  sampleName: string
  quantity: number
  reason: string
  createdAt: string
}

const returnStatuses: Stage5SampleRecord["returnStatus"][] = ["Pending", "Return Arranged", "Partially Returned", "Fully Returned", "Not Required"]
const returnConditions: NonNullable<Stage5SampleRecord["condition"]>[] = ["Good", "Damaged", "Incomplete"]
const finalDispositions: Stage5Disposition[] = ["Returned to Stock", "Damaged", "Lost", "Retained by Client", "Consumed", "Converted to Permanent Sample"]

function hasFinalReviewForAllIssuedSamples(dispatch: Stage2Dispatch, reviews: Stage4SampleReview[]): boolean {
  const issued = dispatch.samples.filter((sample) => sample.issuedQuantity > 0)
  return issued.length > 0 &&
    Boolean(dispatch.delivery?.receiptConfirmedAt) &&
    issued.every((sample) => reviews.some((review) =>
      review.dispatchId === dispatch.id &&
      review.sampleId === sample.itemId &&
      Boolean(review.cycles.at(-1)?.finalDecision)
    ))
}

function createStage5Record(dispatch: Stage2Dispatch, reviews: Stage4SampleReview[]): Stage5ClosureRecord {
  const samples = dispatch.samples.filter((sample) => sample.issuedQuantity > 0).map((sample): Stage5SampleRecord => {
    const review = reviews.find((entry) => entry.dispatchId === dispatch.id && entry.sampleId === sample.itemId)
    const latestDecision = review?.cycles.at(-1)?.finalDecision ?? "Changes Required"
    return {
      sampleId: sample.itemId,
      sampleCode: sample.code,
      sampleName: sample.name,
      issuedQuantity: sample.issuedQuantity,
      finalReviewDecision: latestDecision,
      sampleStatus: `Issued · ${dispatch.delivery?.receiptStatus ?? "Receipt pending"} · ${latestDecision}`,
      returnRequired: "Yes",
      expectedReturnDate: dispatch.expectedReturnDate,
      actualReturnDate: "",
      returnedQuantity: 0,
      returnStatus: "Pending",
      condition: "",
      returnNotes: "",
      receivedBackQuantity: 0,
      verifiedReceivedBackQuantity: 0,
      receivedDate: "",
      verifiedBy: "",
      inspectionNotes: "",
      stockedQuantity: 0,
      stockUpdateStatus: "Not updated",
      verifiedCondition: "",
      dispositions: [],
    }
  })
  return {
    request: dispatch.request,
    dispatchId: dispatch.id,
    project: dispatch.request.project,
    samples,
    closureStatus: "Pending Closure",
    closureDate: "",
    closedBy: "",
    closureNotes: "",
    history: [],
  }
}

function stage5Totals(record: Stage5ClosureRecord) {
  return record.samples.reduce((totals, sample) => {
    const accounted = sample.dispositions.reduce((sum, entry) => sum + entry.quantity, 0)
    return {
      issued: totals.issued + sample.issuedQuantity,
      returned: totals.returned + sample.receivedBackQuantity,
      accounted: totals.accounted + accounted,
      outstanding: totals.outstanding + Math.max(0, sample.issuedQuantity - accounted),
    }
  }, { issued: 0, returned: 0, accounted: 0, outstanding: 0 })
}

function isStage5ReadyToClose(record: Stage5ClosureRecord): boolean {
  return record.samples.length > 0 && record.samples.every((sample) => {
    const dispositionTotal = sample.dispositions.reduce((sum, entry) => sum + entry.quantity, 0)
    const returnedToStock = sample.dispositions
      .filter((entry) => entry.disposition === "Returned to Stock")
      .reduce((sum, entry) => sum + entry.quantity, 0)
    const returnIsVerified = sample.returnRequired === "No"
      ? sample.returnedQuantity === 0 && sample.receivedBackQuantity === 0
      : sample.returnedQuantity <= sample.issuedQuantity &&
        sample.receivedBackQuantity === sample.returnedQuantity &&
        (sample.receivedBackQuantity === 0 || (
          Boolean(sample.receiptVerifiedAt) &&
          sample.verifiedReceivedBackQuantity === sample.receivedBackQuantity &&
          Boolean(sample.actualReturnDate) &&
          Boolean(sample.receivedDate) &&
          Boolean(sample.verifiedBy.trim()) &&
          Boolean(sample.condition) &&
          (sample.condition !== "Good" || sample.stockedQuantity === sample.receivedBackQuantity)
        ))
    return dispositionTotal === sample.issuedQuantity &&
      sample.dispositions.every((entry) => Boolean(entry.disposition) && Number.isInteger(entry.quantity) && entry.quantity > 0) &&
      returnedToStock === sample.stockedQuantity &&
      returnIsVerified
  })
}

export function ReturnsClosurePage() {
  const [dispatches] = usePersistentState<Stage2Dispatch[]>(stage2DispatchesStorageKey, [])
  const [reviews] = usePersistentState<Stage4SampleReview[]>(stage4ReviewsStorageKey, [])
  const [requests, setRequests] = usePersistentState<MaterialRequest[]>(requestsStorageKey, [])
  const [records, setRecords] = usePersistentState<Stage5ClosureRecord[]>(stage5RecordsStorageKey, [])
  const [items, setItems] = usePersistentState<InventoryItem[]>(inventoryStorageKey, initialItems)
  const [adjustments, setAdjustments] = usePersistentState<Stage5StockAdjustment[]>(stage5StockAdjustmentsStorageKey, [])
  const [activeDispatchId, setActiveDispatchId] = React.useState("")
  const [record, setRecord] = React.useState<Stage5ClosureRecord | null>(null)
  const [error, setError] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [confirmClose, setConfirmClose] = React.useState(false)

  const eligibleDispatches = dispatches.filter((dispatch) => hasFinalReviewForAllIssuedSamples(dispatch, reviews))

  const selectedDispatch = eligibleDispatches.find((dispatch) => dispatch.id === activeDispatchId)
  const closed = record?.closureStatus === "Closed"
  const totals = record ? stage5Totals(record) : { issued: 0, returned: 0, accounted: 0, outstanding: 0 }
  const readyToClose = record ? isStage5ReadyToClose(record) : false

  const updateSample = (sampleId: string, update: Partial<Stage5SampleRecord>) => {
    if (!record || closed) return
    setRecord({
      ...record,
      samples: record.samples.map((sample) => sample.sampleId === sampleId ? { ...sample, ...update } : sample),
    })
    setError("")
    setMessage("")
  }

  const saveDraft = () => {
    if (!record || closed) return
    const next: Stage5ClosureRecord = {
      ...record,
      closureStatus: isStage5ReadyToClose(record) ? "Ready to Close" : "Pending Closure",
      history: [...record.history, { action: "Return and disposition details saved as draft", at: currentTimestamp() }],
    }
    try {
      const nextRecords = [next, ...records.filter((entry) => entry.dispatchId !== next.dispatchId)]
      window.localStorage.setItem(stage5RecordsStorageKey, JSON.stringify(nextRecords))
      setRecords(nextRecords)
      setRecord(next)
      setError("")
      setMessage(`${next.request.id} saved as a draft.`)
    } catch {
      setError("Stage 5 draft could not be saved in this browser.")
    }
  }

  const verifyReturnReceipt = (sampleId: string) => {
    if (!record || closed) return
    const sample = record.samples.find((entry) => entry.sampleId === sampleId)
    if (!sample) return
    if (sample.returnRequired !== "Yes") {
      setError("Mark Return Required as Yes before recording a return receipt.")
      return
    }
    if (!Number.isInteger(sample.receivedBackQuantity) ||
      sample.receivedBackQuantity < sample.verifiedReceivedBackQuantity ||
      sample.receivedBackQuantity > sample.returnedQuantity || sample.receivedBackQuantity > sample.issuedQuantity) {
      setError(`Received Back Quantity for ${sample.sampleName} must not exceed the returned or issued quantity.`)
      return
    }
    if (sample.receivedBackQuantity > 0 && (!sample.receivedDate || !sample.actualReturnDate || !sample.verifiedBy.trim() || !sample.condition)) {
      setError(`Enter the actual return date, received date, verifier, and condition for ${sample.sampleName}.`)
      return
    }
    if (sample.verifiedReceivedBackQuantity > 0 && sample.condition !== sample.verifiedCondition) {
      setError(`The verified condition for ${sample.sampleName} cannot be changed after a return receipt is recorded.`)
      return
    }
    if (sample.receivedBackQuantity === sample.verifiedReceivedBackQuantity && sample.receiptVerifiedAt) {
      setMessage(`The current return quantity for ${sample.sampleName} has already been verified.`)
      return
    }
    if (sample.receivedBackQuantity === 0) {
      setError(`Enter a received-back quantity greater than zero to verify a physical return for ${sample.sampleName}.`)
      return
    }
    const goodStockDelta = sample.condition === "Good" && sample.receivedBackQuantity > sample.stockedQuantity
      ? sample.receivedBackQuantity - sample.stockedQuantity
      : 0

    let currentItems = items
    let currentAdjustments = adjustments
    try {
      const savedItems = window.localStorage.getItem(inventoryStorageKey)
      if (savedItems !== null) currentItems = JSON.parse(savedItems) as InventoryItem[]
      const savedAdjustments = window.localStorage.getItem(stage5StockAdjustmentsStorageKey)
      if (savedAdjustments !== null) currentAdjustments = JSON.parse(savedAdjustments) as Stage5StockAdjustment[]
    } catch {
      setError("Current inventory or stock adjustment history could not be read; no return was verified.")
      return
    }
    const stockAdjustmentId = `${record.dispatchId}-${sample.sampleId}-return-${sample.verifiedReceivedBackQuantity}-${sample.receivedBackQuantity}`
    if (goodStockDelta > 0 && currentAdjustments.some((entry) => entry.id === stockAdjustmentId)) {
      setError(`This return quantity for ${sample.sampleName} has already been applied to stock. Refresh the page before recording another return.`)
      return
    }
    if (goodStockDelta > 0 && !currentItems.some((item) => item.id === sample.sampleId)) {
      setError(`${sample.sampleName} no longer exists in the inventory catalogue; stock was not updated.`)
      return
    }

    const at = currentTimestamp()
    const verifiedSample: Stage5SampleRecord = {
      ...sample,
      verifiedReceivedBackQuantity: sample.receivedBackQuantity,
      verifiedCondition: sample.condition,
      stockedQuantity: sample.stockedQuantity + goodStockDelta,
      stockUpdateStatus: goodStockDelta > 0
        ? "Updated"
        : sample.receivedBackQuantity > 0 && sample.condition !== "Good"
          ? "Verified - not added to stock"
          : sample.receiptVerifiedAt
            ? sample.stockUpdateStatus
            : "No stock change",
      receiptVerifiedAt: at,
    }
    const nextRecord: Stage5ClosureRecord = {
      ...record,
      samples: record.samples.map((entry) => entry.sampleId === sampleId ? verifiedSample : entry),
      closureStatus: "Pending Closure",
      history: [...record.history, {
        action: `${sample.receivedBackQuantity} returned unit(s) verified for ${sample.sampleName}${goodStockDelta > 0 ? `; ${goodStockDelta} good unit(s) returned to stock` : "; no stock added"}`,
        at,
      }],
    }
    const nextRecords = [nextRecord, ...records.filter((entry) => entry.dispatchId !== record.dispatchId)]
    const nextAdjustments = goodStockDelta > 0
      ? [{
          id: stockAdjustmentId,
          requestId: record.request.id,
          dispatchId: record.dispatchId,
          sampleId: sample.sampleId,
          sampleName: sample.sampleName,
          quantity: goodStockDelta,
          reason: "Verified good sample return",
          createdAt: at,
        }, ...currentAdjustments]
      : currentAdjustments
    const nextItems = goodStockDelta > 0
      ? currentItems.map((item) => item.id === sample.sampleId ? { ...item, stock: item.stock + goodStockDelta } : item)
      : currentItems
    const keys = [stage5RecordsStorageKey, inventoryStorageKey, stage5StockAdjustmentsStorageKey]
    const previous = keys.map((key) => [key, window.localStorage.getItem(key)] as const)
    try {
      window.localStorage.setItem(stage5RecordsStorageKey, JSON.stringify(nextRecords))
      if (goodStockDelta > 0) {
        window.localStorage.setItem(inventoryStorageKey, JSON.stringify(nextItems))
        window.localStorage.setItem(stage5StockAdjustmentsStorageKey, JSON.stringify(nextAdjustments))
      }
    } catch {
      try {
        previous.forEach(([key, value]) => {
          if (value === null) window.localStorage.removeItem(key)
          else window.localStorage.setItem(key, value)
        })
      } catch {
        setError("Return verification failed and browser storage could not be restored.")
        return
      }
      setError("Return verification and stock update could not be saved; no success was recorded.")
      return
    }
    setRecord(nextRecord)
    setRecords(nextRecords)
    if (goodStockDelta > 0) {
      setItems(nextItems)
      setAdjustments(nextAdjustments)
    }
    setError("")
    setMessage(goodStockDelta > 0
      ? `${goodStockDelta} verified good unit(s) of ${sample.sampleName} returned to available stock.`
      : `Return receipt verified for ${sample.sampleName}; no available stock was added.`)
  }

  const closeRequest = () => {
    if (!record || closed) return
    if (!readyToClose) {
      setError("Cannot close this request until all issued quantities have verified returns where applicable and a final disposition.")
      return
    }
    if (!record.closedBy.trim() || !record.closureDate) {
      setError("Enter Closed By and Closure Date before closing the request.")
      return
    }
    const at = currentTimestamp()
    const nextRecord: Stage5ClosureRecord = {
      ...record,
      closureStatus: "Closed",
      history: [...record.history, { action: `Request closed by ${record.closedBy}`, at }],
      closedAt: at,
    }
    const nextRecords = [nextRecord, ...records.filter((entry) => entry.dispatchId !== record.dispatchId)]
    const nextRequests = requests.map((request) => request.id === record.request.id
      ? { ...request, status: "Closed" as const, closedAt: at }
      : request)
    const keys = [stage5RecordsStorageKey, requestsStorageKey]
    const previous = keys.map((key) => [key, window.localStorage.getItem(key)] as const)
    try {
      window.localStorage.setItem(stage5RecordsStorageKey, JSON.stringify(nextRecords))
      window.localStorage.setItem(requestsStorageKey, JSON.stringify(nextRequests))
    } catch {
      try {
        previous.forEach(([key, value]) => {
          if (value === null) window.localStorage.removeItem(key)
          else window.localStorage.setItem(key, value)
        })
      } catch {
        setError("Request closure failed and browser storage could not be restored.")
        return
      }
      setError("Request closure could not be saved; the request remains open.")
      return
    }
    setRecord(nextRecord)
    setRecords(nextRecords)
    setRequests(nextRequests)
    setConfirmClose(false)
    setError("")
    setMessage(`${record.request.id} is closed. Its Stage 1 request status has been updated.`)
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Stage 5</p>
          <h1 className="mt-1 text-xl font-semibold">Returns &amp; Closure</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verify sample returns, account for every issued unit, and close the original request.</p>
        </div>
        <label className="min-w-[220px] text-xs font-medium">
          Reviewed Stage 4 request
          <select aria-label="Reviewed Stage 4 request" value={activeDispatchId} onChange={(event) => {
            const dispatchId = event.target.value
            const dispatch = eligibleDispatches.find((entry) => entry.id === dispatchId)
            setActiveDispatchId(dispatchId)
            setRecord(dispatch
              ? records.find((entry) => entry.dispatchId === dispatch.id) ?? createStage5Record(dispatch, reviews)
              : null)
            setError("")
            setMessage("")
            setConfirmClose(false)
          }} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" disabled={!eligibleDispatches.length}>
            <option value="">Select a reviewed request</option>
            {eligibleDispatches.map((dispatch) => <option key={dispatch.id} value={dispatch.id}>{dispatch.request.id} · {dispatch.request.project}</option>)}
          </select>
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        {!record || !selectedDispatch ? (
          <EmptyStage2 message={eligibleDispatches.length
            ? "Select a reviewed Stage 4 request to manage its issued samples."
            : "No Stage 2 dispatch is ready for closure. A request appears here after Stage 3 receipt confirmation and a recorded Stage 4 final decision for each issued sample."} />
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{record.request.id} · {record.project}</p>
                  <p className="mt-1 text-sm">Requester: {record.request.requester} · Coordinator: {record.request.assignedCoordinator}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{record.request.sampleDetails}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", closed ? "bg-emerald-100 text-emerald-800" : readyToClose ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800")}>{closed ? "Closed" : readyToClose ? "Ready to Close" : "Pending Closure"}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReviewReadOnly label="Stage 2 issued quantity" value={String(totals.issued)} />
                <ReviewReadOnly label="Stage 3 received quantity" value={String(selectedDispatch.delivery?.receivedQuantity ?? 0)} />
                <ReviewReadOnly label="Stage 4 final decisions" value={record.samples.map((sample) => `${sample.sampleName}: ${sample.finalReviewDecision}`).join("; ")} />
                <ReviewReadOnly label="Request status" value={record.request.status} />
              </dl>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <h2 className="font-semibold">1. Sample Return</h2>
                <p className="text-sm text-muted-foreground">Record return arrangements and quantities for issued sample references.</p>
              </div>
              <div className="space-y-3">
                {record.samples.map((sample) => (
                  <article key={sample.sampleId} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><h3 className="font-medium">{sample.sampleName}</h3><p className="text-xs text-muted-foreground">{sample.sampleCode} · {sample.sampleId}</p></div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">{sample.sampleStatus}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ReviewReadOnly label="Issued quantity" value={String(sample.issuedQuantity)} />
                      <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>Return Required</span><select disabled={closed || Boolean(sample.receiptVerifiedAt)} value={sample.returnRequired} onChange={(event) => {
                        const returnRequired = event.target.value as Stage5SampleRecord["returnRequired"]
                        updateSample(sample.sampleId, returnRequired === "No"
                          ? { returnRequired, returnStatus: "Not Required", returnedQuantity: 0, actualReturnDate: "", condition: "", returnNotes: "", receivedBackQuantity: 0, receivedDate: "", verifiedBy: "", inspectionNotes: "" }
                          : { returnRequired, returnStatus: "Pending" })
                      }} className={inputClass}><option value="Yes">Yes</option><option value="No">No</option></select></label>
                      {sample.returnRequired === "Yes" ? <>
                        <ReviewInput label="Expected Return Date" value={sample.expectedReturnDate} type="date" disabled={closed} onChange={(value) => updateSample(sample.sampleId, { expectedReturnDate: value })} />
                        <ReviewInput label="Actual Return Date" value={sample.actualReturnDate} type="date" disabled={closed} onChange={(value) => updateSample(sample.sampleId, { actualReturnDate: value })} />
                        <ReviewInput label="Returned Quantity" value={sample.returnedQuantity} type="number" min={sample.verifiedReceivedBackQuantity} max={sample.issuedQuantity} disabled={closed} onChange={(value) => {
                          const quantity = Number(value)
                          if (!Number.isInteger(quantity) || quantity < sample.verifiedReceivedBackQuantity || quantity > sample.issuedQuantity) return
                          updateSample(sample.sampleId, { returnedQuantity: quantity, returnStatus: quantity === 0 ? "Pending" : quantity === sample.issuedQuantity ? "Fully Returned" : "Partially Returned" })
                        }} />
                        <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>Return Status</span><select disabled={closed} value={sample.returnStatus} onChange={(event) => updateSample(sample.sampleId, { returnStatus: event.target.value as Stage5SampleRecord["returnStatus"] })} className={inputClass}>{returnStatuses.filter((status) => status !== "Not Required").map((status) => <option key={status} disabled={(status === "Pending" && sample.returnedQuantity > 0) || (status === "Partially Returned" && (sample.returnedQuantity === 0 || sample.returnedQuantity >= sample.issuedQuantity)) || (status === "Fully Returned" && sample.returnedQuantity !== sample.issuedQuantity)}>{status}</option>)}</select></label>
                        <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>Condition</span><select disabled={closed || sample.verifiedReceivedBackQuantity > 0} value={sample.condition} onChange={(event) => updateSample(sample.sampleId, { condition: event.target.value as Stage5SampleRecord["condition"] })} className={inputClass}><option value="">Select condition</option>{returnConditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
                        <ReviewReadOnly label="Outstanding return quantity" value={String(Math.max(0, sample.issuedQuantity - sample.returnedQuantity))} />
                      </> : <ReviewReadOnly label="Return Status" value="Not Required" />}
                    </div>
                    {sample.returnRequired === "Yes" && <div className="mt-3"><ReviewTextarea label="Return Notes" value={sample.returnNotes} disabled={closed} onChange={(value) => updateSample(sample.sampleId, { returnNotes: value })} /></div>}
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div><h2 className="font-semibold">2. Return Receipt &amp; Inventory Update</h2><p className="text-sm text-muted-foreground">Only verified good-condition returns increase available stock. Each stock addition is logged and duplicate verification does not add it again.</p></div>
              {record.samples.map((sample) => (
                <article key={sample.sampleId} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{sample.sampleName}</h3><span className={cn("rounded-full px-2 py-1 text-xs", sample.stockUpdateStatus === "Updated" ? "bg-emerald-100 text-emerald-800" : "bg-muted")}>{sample.stockUpdateStatus}</span></div>
                  {sample.returnRequired === "Yes" ? <>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ReviewInput label="Received Back Quantity" value={sample.receivedBackQuantity} type="number" min={sample.verifiedReceivedBackQuantity} max={sample.returnedQuantity} disabled={closed} onChange={(value) => {
                        const quantity = Number(value)
                        if (!Number.isInteger(quantity) || quantity < sample.verifiedReceivedBackQuantity || quantity > sample.returnedQuantity) return
                        updateSample(sample.sampleId, { receivedBackQuantity: quantity })
                      }} />
                      <ReviewInput label="Received Date" value={sample.receivedDate} type="date" disabled={closed} onChange={(value) => updateSample(sample.sampleId, { receivedDate: value })} />
                      <ReviewInput label="Verified By" value={sample.verifiedBy} disabled={closed} onChange={(value) => updateSample(sample.sampleId, { verifiedBy: value })} />
                      <ReviewReadOnly label="Added to available stock" value={String(sample.stockedQuantity)} />
                    </div>
                    <div className="mt-3"><ReviewTextarea label="Inspection Notes" value={sample.inspectionNotes} disabled={closed} onChange={(value) => updateSample(sample.sampleId, { inspectionNotes: value })} /></div>
                    {!closed && <button type="button" onClick={() => verifyReturnReceipt(sample.sampleId)} disabled={sample.receivedBackQuantity === 0 || sample.receivedBackQuantity === sample.verifiedReceivedBackQuantity && sample.receiptVerifiedAt !== undefined} className="mt-3 h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">{sample.receiptVerifiedAt ? "Verify additional return" : "Verify return & update stock"}</button>}
                    {sample.receiptVerifiedAt && <p className="mt-2 text-xs text-muted-foreground">Verified {formatRequestDate(sample.receivedDate)} by {sample.verifiedBy}. {sample.verifiedReceivedBackQuantity} unit(s) physically received.</p>}
                  </> : <p className="mt-2 text-sm text-muted-foreground">No return receipt is required for this sample.</p>}
                </article>
              ))}
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div><h2 className="font-semibold">3. Final Disposition</h2><p className="text-sm text-muted-foreground">Account for every issued unit. Dispositions are tracked separately for each sample.</p></div>
              {record.samples.map((sample) => {
                const dispositionTotal = sample.dispositions.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <article key={sample.sampleId} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-medium">{sample.sampleName}</h3><p className="text-xs text-muted-foreground">{sample.issuedQuantity} issued · {dispositionTotal} accounted · {Math.max(0, sample.issuedQuantity - dispositionTotal)} outstanding</p></div><span className="text-xs text-muted-foreground">Final review: {sample.finalReviewDecision}</span></div>
                    {sample.dispositions.map((entry) => (
                      <div key={entry.id} className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.4fr_0.7fr_1.5fr_auto]">
                        <label className="block min-w-0 text-xs font-medium"><span className={labelClass}>Final Disposition</span><select disabled={closed} value={entry.disposition} onChange={(event) => updateSample(sample.sampleId, { dispositions: sample.dispositions.map((item) => item.id === entry.id ? { ...item, disposition: event.target.value as Stage5Disposition | "" } : item) })} className={inputClass}><option value="">Select disposition</option>{finalDispositions.map((disposition) => <option key={disposition}>{disposition}</option>)}</select></label>
                        <ReviewInput label="Quantity" value={entry.quantity} type="number" min={1} max={sample.issuedQuantity} disabled={closed} onChange={(value) => {
                          const quantity = Number(value)
                          if (!Number.isInteger(quantity) || quantity < 1) return
                          const otherTotal = dispositionTotal - entry.quantity
                          if (otherTotal + quantity > sample.issuedQuantity) {
                            setError(`Disposition quantities for ${sample.sampleName} cannot exceed the issued quantity.`)
                            return
                          }
                          updateSample(sample.sampleId, { dispositions: sample.dispositions.map((item) => item.id === entry.id ? { ...item, quantity } : item) })
                        }} />
                        <ReviewInput label="Disposition Notes" value={entry.notes} disabled={closed} onChange={(value) => updateSample(sample.sampleId, { dispositions: sample.dispositions.map((item) => item.id === entry.id ? { ...item, notes: value } : item) })} />
                        {!closed && <button type="button" aria-label={`Remove ${entry.disposition} disposition for ${sample.sampleName}`} onClick={() => updateSample(sample.sampleId, { dispositions: sample.dispositions.filter((item) => item.id !== entry.id) })} className="h-10 rounded-md border border-input px-3 text-sm hover:bg-accent">Remove</button>}
                      </div>
                    ))}
                    {!closed && <button type="button" onClick={() => updateSample(sample.sampleId, { dispositions: [...sample.dispositions, { id: `${sample.sampleId}-${Date.now()}`, disposition: "", quantity: 0, notes: "" }] })} disabled={dispositionTotal >= sample.issuedQuantity || sample.dispositions.some((entry) => !entry.disposition)} className="mt-3 h-8 rounded-md border border-input px-3 text-xs font-medium hover:bg-accent disabled:opacity-40"><Plus className="mr-1 inline size-3.5" />Add disposition</button>}
                  </article>
                )
              })}
            </section>

            <section className="space-y-3 rounded-lg border border-border p-4">
              <div><h2 className="font-semibold">4. Request Closure</h2><p className="text-sm text-muted-foreground">Close only after each issued quantity is dispositioned and all physical returns are verified.</p></div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReviewReadOnly label="Total Issued Quantity" value={String(totals.issued)} />
                <ReviewReadOnly label="Total Returned Quantity" value={String(totals.returned)} />
                <ReviewReadOnly label="Total Accounted Quantity" value={String(totals.accounted)} />
                <ReviewReadOnly label="Outstanding Quantity" value={String(totals.outstanding)} />
              </dl>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ReviewReadOnly label="Closure Status" value={closed ? "Closed" : readyToClose ? "Ready to Close" : "Pending Closure"} />
                <ReviewInput label="Closure Date" value={record.closureDate} type="date" disabled={closed} onChange={(value) => setRecord({ ...record, closureDate: value })} />
                <ReviewInput label="Closed By" value={record.closedBy} disabled={closed} onChange={(value) => setRecord({ ...record, closedBy: value })} />
              </div>
              <ReviewTextarea label="Closure Notes" value={record.closureNotes} disabled={closed} onChange={(value) => setRecord({ ...record, closureNotes: value })} />
              {!closed && <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={saveDraft} className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">Save as Draft</button>
                <button type="button" onClick={() => {
                  if (!readyToClose) {
                    setError("Cannot close this request until every issued quantity is accounted for and all returns are verified.")
                    return
                  }
                  setError("")
                  setConfirmClose(true)
                }} disabled={!readyToClose} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Close Request</button>
              </div>}
              {closed && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">This request is closed and read-only.</p>}
              {confirmClose && !closed && <div role="alertdialog" aria-modal="true" aria-labelledby="stage5-close-confirm-title" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <h3 id="stage5-close-confirm-title" className="font-semibold">Confirm request closure</h3>
                <p className="mt-1 text-sm">This closes {record.request.id} and updates its original Stage 1 request. The record will become read-only.</p>
                <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setConfirmClose(false)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">Cancel</button><button type="button" onClick={closeRequest} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Confirm Closure</button></div>
              </div>}
              {record.history.length > 0 && <div className="border-t border-border pt-3"><h3 className="text-sm font-semibold">Closure History</h3><ul className="mt-2 space-y-1">{record.history.map((entry, index) => <li key={`${entry.at}-${index}`} className="text-xs text-muted-foreground">{entry.action} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at))}</li>)}</ul></div>}
            </section>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </main>
    </div>
  )
}
