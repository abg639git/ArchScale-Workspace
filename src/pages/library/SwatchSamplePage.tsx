import * as React from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Image,
  LayoutGrid,
  List,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Truck,
  UserRound,
  X,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type WorkflowStage = "request" | "issue" | "delivery" | "review" | "return"
type Priority = "Urgent" | "High" | "Normal" | "Low"
type OrganizationType = "Client" | "Studio"

type SampleLine = {
  code: string
  name: string
  category: string
  color: string
  requestedQuantity: number
  issuedQuantity: number
}

type WorkflowRequest = {
  id: string
  organization: string
  organizationType: OrganizationType
  project: string
  requester: string
  requestType: string
  sampleDetails: string
  quantity: number
  purpose: string
  priority: Priority
  requiredDate: string
  deliveryAddress: string
  assignedTo: string
  stage: WorkflowStage
  status: string
  samples: SampleLine[]
  availability: string
  stockLocation: string
  condition: string
  issuedQuantity: number
  returnBy: string
  issueStatus: string
  dispatchRequestCreated: boolean
  pickupLocation: string
  deliveryMethod: string
  contactPerson: string
  expectedDate: string
  courier: string
  trackingNumber: string
  dispatchStatus: string
  receiptStatus: string
  receivedQuantity: number
  receivedCondition: string
  reviewer: string
  decision: string
  reviewComments: string
  followUp: string
  finalApproval: boolean
  returnStatus: string
  returnedQuantity: number
  returnCondition: string
  finalDisposition: string
  stockUpdated: boolean
  closed: boolean
}

type StageSeed = {
  id: string
  organization: string
  organizationType: OrganizationType
  project: string
  requester: string
  assignedTo: string
  sampleIndex: number
  quantity: number
  dayOffset: number
  priority: Priority
  stage: WorkflowStage
}

const stages: { id: WorkflowStage; label: string; action: string; tint: string }[] = [
  { id: "request", label: "Sample Request", action: "Enter details", tint: "bg-slate-50" },
  { id: "issue", label: "Select & Issue", action: "Issue material", tint: "bg-orange-50/60" },
  { id: "delivery", label: "Delivery & Receipt", action: "Confirm receipt", tint: "bg-violet-50/50" },
  { id: "review", label: "Reviews & Approvals", action: "Record decision", tint: "bg-rose-50/50" },
  { id: "return", label: "Returns & Closure", action: "Complete return", tint: "bg-emerald-50/50" },
]

const sampleCatalogue = [
  { code: "BAG-3107", name: "Linen Weave Fabric, Sand", category: "Fabric", color: "#cdb993", stock: 24, location: "Studio Library" },
  { code: "BAG-3102", name: "Oak Laminate, Natural", category: "Laminate", color: "#c8a06e", stock: 18, location: "Material Library" },
  { code: "BAG-3110", name: "Calacatta Oro Marble", category: "Stone", color: "#e6e2d5", stock: 6, location: "Stone Archive" },
  { code: "BAG-3101", name: "Brushed Brass Handle", category: "Hardware", color: "#b18d35", stock: 40, location: "Hardware Store" },
  { code: "BAG-3105", name: "Walnut Veneer Plank", category: "Veneer", color: "#6e4c36", stock: 12, location: "Material Library" },
  { code: "BAG-3108", name: "Terrazzo Tile, Mint", category: "Tile", color: "#a9c5b2", stock: 9, location: "Tile Archive" },
  { code: "BAG-3112", name: "Fluted Glass Panel", category: "Glass", color: "#b9d1d2", stock: 7, location: "Studio Library" },
  { code: "BAG-3114", name: "Ceramic Mosaic", category: "Tile", color: "#84a9c0", stock: 21, location: "Tile Archive" },
]

const teamMembers = ["Jasmine Kaur", "John Doe", "Ritik Verma", "Karan Mehra", "Neha Kulkarni"]
const reviewers = ["Jasmine Kaur", "John Doe", "Ritik Verma", "Karan Mehra"]
const stagePosition: Record<WorkflowStage, number> = {
  request: 0,
  issue: 1,
  delivery: 2,
  review: 3,
  return: 4,
}

const dateOffset = (offset: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const today = dateOffset(0)

const makeRequest = (seed: StageSeed): WorkflowRequest => {
  const sample = sampleCatalogue[seed.sampleIndex % sampleCatalogue.length]
  const requestedSampleQuantity = Math.min(2, seed.quantity)
  const issuedQuantity = stagePosition[seed.stage] > 0 ? requestedSampleQuantity : 0
  const receivedQuantity = stagePosition[seed.stage] > 1 ? issuedQuantity : 0
  const returnedQuantity = stagePosition[seed.stage] > 3 ? issuedQuantity : 0

  return {
    ...seed,
    requestType: "Project sample",
    sampleDetails: sample.name,
    purpose: "Material review for the current project package.",
    requiredDate: dateOffset(seed.dayOffset),
    deliveryAddress: "Project site, Mumbai, India",
    status: seed.stage === "request" ? "Submitted" : "In progress",
    samples: [{
      code: sample.code,
      name: sample.name,
      category: sample.category,
      color: sample.color,
      requestedQuantity: requestedSampleQuantity,
      issuedQuantity,
    }],
    availability: "Available",
    stockLocation: sample.location,
    condition: "Good",
    issuedQuantity,
    returnBy: dateOffset(14),
    issueStatus: issuedQuantity ? "Issued" : "Not issued",
    dispatchRequestCreated: stagePosition[seed.stage] > 0,
    pickupLocation: sample.location,
    deliveryMethod: "Courier",
    contactPerson: seed.requester,
    expectedDate: dateOffset(2),
    courier: "Blue Dart",
    trackingNumber: "BD-482619",
    dispatchStatus: receivedQuantity ? "Delivered" : "In transit",
    receiptStatus: receivedQuantity ? "Received" : "Pending",
    receivedQuantity,
    receivedCondition: "Good",
    reviewer: "Jasmine Kaur",
    decision: stagePosition[seed.stage] > 2 ? "Approved" : "Pending",
    reviewComments: "",
    followUp: "None",
    finalApproval: stagePosition[seed.stage] > 2,
    returnStatus: returnedQuantity ? "Received" : "Awaiting return",
    returnedQuantity,
    returnCondition: "Good",
    finalDisposition: returnedQuantity ? "Returned to stock" : "Pending",
    stockUpdated: false,
    closed: false,
  }
}

const createDemoRequests = (): WorkflowRequest[] => [
  makeRequest({ id: "REQ-2612", organization: "Mehra Constructions", organizationType: "Client", project: "Savanna Residence", requester: "Karan Mehra", assignedTo: "Jasmine Kaur", sampleIndex: 0, quantity: 2, dayOffset: -7, priority: "High", stage: "request" }),
  makeRequest({ id: "REQ-2614", organization: "Greenleaf Architects", organizationType: "Studio", project: "After Hours Office", requester: "Neha Kulkarni", assignedTo: "John Doe", sampleIndex: 5, quantity: 4, dayOffset: 3, priority: "Normal", stage: "request" }),
  makeRequest({ id: "REQ-2611", organization: "Studio Anand Associates", organizationType: "Studio", project: "Solitude House", requester: "Neha Kulkarni", assignedTo: "Ritik Verma", sampleIndex: 4, quantity: 5, dayOffset: -2, priority: "Urgent", stage: "issue" }),
  makeRequest({ id: "REQ-2613", organization: "Kaveri Interiors", organizationType: "Studio", project: "Pyramid Tower", requester: "John Doe", assignedTo: "Karan Mehra", sampleIndex: 3, quantity: 7, dayOffset: 4, priority: "High", stage: "issue" }),
  makeRequest({ id: "REQ-2610", organization: "Mehra Constructions", organizationType: "Client", project: "Zuri Hotel", requester: "Karan Mehra", assignedTo: "Jasmine Kaur", sampleIndex: 6, quantity: 1, dayOffset: -4, priority: "High", stage: "delivery" }),
  makeRequest({ id: "REQ-2615", organization: "Greenleaf Architects", organizationType: "Studio", project: "Wildcrest Villas", requester: "Ritik Verma", assignedTo: "John Doe", sampleIndex: 0, quantity: 2, dayOffset: 5, priority: "Normal", stage: "delivery" }),
  makeRequest({ id: "REQ-2608", organization: "Terra Partners", organizationType: "Client", project: "Savanna Residence", requester: "Karan Mehra", assignedTo: "Ritik Verma", sampleIndex: 0, quantity: 3, dayOffset: -1, priority: "Normal", stage: "review" }),
  makeRequest({ id: "REQ-2606", organization: "Studio Anand Associates", organizationType: "Studio", project: "After Hours Office", requester: "Neha Kulkarni", assignedTo: "Jasmine Kaur", sampleIndex: 5, quantity: 8, dayOffset: -3, priority: "High", stage: "review" }),
  makeRequest({ id: "REQ-2604", organization: "Kaveri Interiors", organizationType: "Studio", project: "Pyramid Tower", requester: "John Doe", assignedTo: "Karan Mehra", sampleIndex: 1, quantity: 3, dayOffset: 1, priority: "Low", stage: "return" }),
  makeRequest({ id: "REQ-2602", organization: "Mehra Constructions", organizationType: "Client", project: "Zuri Hotel", requester: "Karan Mehra", assignedTo: "Jasmine Kaur", sampleIndex: 2, quantity: 2, dayOffset: 2, priority: "Normal", stage: "return" }),
]

const createDemoStockLevels = (): Record<string, number> => {
  const levels = Object.fromEntries(sampleCatalogue.map((sample) => [sample.code, sample.stock]))
  for (const request of createDemoRequests()) {
    if (stagePosition[request.stage] === 0 || request.closed) continue
    for (const sample of request.samples) {
      levels[sample.code] = Math.max(0, (levels[sample.code] ?? 0) - sample.issuedQuantity)
    }
  }
  return levels
}

const priorityStyles: Record<Priority, string> = {
  Urgent: "bg-rose-100 text-rose-700",
  High: "bg-orange-100 text-orange-800",
  Normal: "bg-slate-100 text-slate-700",
  Low: "bg-muted text-muted-foreground",
}

const formatDate = (date: string) => {
  if (!date) return "Not set"
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`))
}

export function SwatchSamplePage() {
  const [requests, setRequests] = usePersistentState("archscale.samples.requests", createDemoRequests)
  const [stockLevels, setStockLevels] = usePersistentState("archscale.samples.stock", createDemoStockLevels)
  const [view, setView] = React.useState<"board" | "all">("board")
  const [activeStage, setActiveStage] = React.useState<WorkflowStage | "all">("all")
  const [search, setSearch] = React.useState("")
  const [activeRequestId, setActiveRequestId] = React.useState<string | null>(null)
  const [nextRequestNumber, setNextRequestNumber] = usePersistentState("archscale.samples.nextRequest", 2616)
  const [isResettingDemo, setIsResettingDemo] = React.useState(false)
  const [feedback, setFeedback] = React.useState("")

  const query = search.trim().toLowerCase()
  const visibleRequests = requests.filter((request) => {
    const matchesStage = activeStage === "all" || request.stage === activeStage
    const matchesSearch = !query ||
      `${request.id} ${request.organization} ${request.project} ${request.requester} ${request.sampleDetails} ${request.samples.map((sample) => `${sample.name} ${sample.code}`).join(" ")} ${request.stage} ${request.status} ${request.assignedTo} ${request.courier} ${request.trackingNumber} ${request.reviewer} ${request.decision} ${request.returnStatus} ${request.finalDisposition}`.toLowerCase().includes(query)
    return matchesStage && matchesSearch
  })
  const activeRequest = requests.find((request) => request.id === activeRequestId) ?? null

  const stageColumns: { label: string; render: (request: WorkflowRequest) => React.ReactNode }[] = activeStage === "all"
    ? [
        { label: "Stage", render: (request) => stages[stagePosition[request.stage]].label },
        { label: "Sample details", render: (request) => request.sampleDetails || "No samples selected" },
        { label: "Required", render: (request) => formatDate(request.requiredDate) },
      ]
    : activeStage === "request"
      ? [
          { label: "Requester", render: (request) => request.requester || "Not set" },
          { label: "Requested samples", render: (request) => `${request.sampleDetails || "No samples selected"} · ${request.quantity} requested` },
          { label: "Required", render: (request) => formatDate(request.requiredDate) },
        ]
      : activeStage === "issue"
        ? [
            { label: "Sample bag", render: (request) => request.samples.length ? request.samples.map((sample) => `${sample.name} (${sample.code})`).join(", ") : "No samples selected" },
            { label: "Availability", render: (request) => `${request.availability} · ${request.stockLocation}` },
            { label: "Quantity", render: (request) => `${request.issuedQuantity} of ${request.quantity} issued` },
          ]
        : activeStage === "delivery"
          ? [
              { label: "Dispatch", render: (request) => `${request.courier || "No courier"}${request.trackingNumber ? ` · ${request.trackingNumber}` : ""}` },
              { label: "Receipt", render: (request) => `${request.receiptStatus} · ${request.receivedQuantity} of ${request.issuedQuantity} received` },
              { label: "Expected", render: (request) => formatDate(request.expectedDate) },
            ]
          : activeStage === "review"
            ? [
                { label: "Reviewer", render: (request) => request.reviewer || "Not assigned" },
                { label: "Decision", render: (request) => `${request.decision}${request.finalApproval ? " · Final approval" : ""}` },
                { label: "Follow-up", render: (request) => request.followUp || "None" },
              ]
            : [
                { label: "Return due", render: (request) => formatDate(request.returnBy) },
                { label: "Return status", render: (request) => `${request.returnStatus} · ${request.returnedQuantity} of ${request.issuedQuantity} returned` },
                { label: "Condition / disposition", render: (request) => `${request.returnCondition} · ${request.finalDisposition}` },
              ]

  const updateRequest = (updated: WorkflowRequest, nextStage?: WorkflowStage) => {
    const saved = nextStage ? { ...updated, stage: nextStage } : updated
    const previous = requests.find((request) => request.id === saved.id)
    const isIssuing = previous?.stage === "issue" && saved.stage === "delivery"
    const isReturningToStock = previous?.stage === "return" && !previous.closed && saved.closed && saved.finalDisposition === "Returned to stock"

    if (isIssuing || isReturningToStock) {
      setStockLevels((current) => {
        const next = { ...current }
        for (const sample of saved.samples) {
          const quantity = isIssuing ? sample.issuedQuantity : Math.min(sample.issuedQuantity, saved.returnedQuantity)
          next[sample.code] = Math.max(0, (next[sample.code] ?? 0) + (isIssuing ? -quantity : quantity))
        }
        return next
      })
    }

    setRequests((current) => current.map((request) => request.id === saved.id ? saved : request))
    setActiveRequestId(null)
  }

  const createRequest = () => {
    const id = `REQ-${nextRequestNumber}`
    setNextRequestNumber((number) => number + 1)
    const request: WorkflowRequest = {
      id,
      organization: "",
      organizationType: "Client",
      project: "",
      requester: "",
      requestType: "Project sample",
      sampleDetails: "",
      quantity: 1,
      purpose: "",
      priority: "Normal",
      requiredDate: "",
      deliveryAddress: "",
      assignedTo: teamMembers[0],
      stage: "request",
      status: "Draft",
      samples: [],
      availability: "Available",
      stockLocation: "Studio Library",
      condition: "Good",
      issuedQuantity: 0,
      returnBy: "",
      issueStatus: "Not issued",
      dispatchRequestCreated: false,
      pickupLocation: "",
      deliveryMethod: "Courier",
      contactPerson: "",
      expectedDate: "",
      courier: "",
      trackingNumber: "",
      dispatchStatus: "Not dispatched",
      receiptStatus: "Pending",
      receivedQuantity: 0,
      receivedCondition: "Good",
      reviewer: reviewers[0],
      decision: "Pending",
      reviewComments: "",
      followUp: "None",
      finalApproval: false,
      returnStatus: "Awaiting return",
      returnedQuantity: 0,
      returnCondition: "Good",
      finalDisposition: "Pending",
      stockUpdated: false,
      closed: false,
    }
    setRequests((current) => [request, ...current])
    setActiveStage("all")
    setView("board")
    setActiveRequestId(id)
  }

  const moveBack = (request: WorkflowRequest) => {
    const previous = stages[Math.max(0, stagePosition[request.stage] - 1)].id
    if (request.stage === "delivery" && request.dispatchRequestCreated) {
      setStockLevels((current) => {
        const next = { ...current }
        for (const sample of request.samples) {
          next[sample.code] = (next[sample.code] ?? 0) + sample.issuedQuantity
        }
        return next
      })
    }
    setRequests((current) => current.map((item) => item.id === request.id
      ? {
          ...item,
          stage: previous,
          status: "In progress",
          ...(request.stage === "delivery" ? {
            issuedQuantity: 0,
            issueStatus: "Not issued",
            dispatchRequestCreated: false,
            receivedQuantity: 0,
            receiptStatus: "Pending",
            samples: item.samples.map((sample) => ({ ...sample, issuedQuantity: 0 })),
          } : {}),
        }
      : item))
  }

  const resetDemo = () => {
    setRequests(createDemoRequests())
    setStockLevels(createDemoStockLevels())
    setSearch("")
    setActiveStage("all")
    setView("board")
    setActiveRequestId(null)
    setNextRequestNumber(2616)
    setIsResettingDemo(false)
    setFeedback("Demo workflow restored.")
  }

  const refreshSavedData = () => {
    try {
      const savedRequests = window.localStorage.getItem("archscale.samples.requests")
      const savedStock = window.localStorage.getItem("archscale.samples.stock")
      const savedNumber = window.localStorage.getItem("archscale.samples.nextRequest")
      if (savedRequests !== null) setRequests(JSON.parse(savedRequests) as WorkflowRequest[])
      if (savedStock !== null) setStockLevels(JSON.parse(savedStock) as Record<string, number>)
      if (savedNumber !== null) setNextRequestNumber(JSON.parse(savedNumber) as number)
      setFeedback("Saved sample workflow reloaded from this browser.")
    } catch {
      setFeedback("Saved workflow data could not be read; current session data remains available.")
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Library</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight">Swatch &amp; Sample</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={refreshSavedData}
              aria-label="Refresh saved sample requests"
              title="Refresh saved sample requests"
              className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={createRequest}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f45a1e] px-3 text-xs font-medium text-white transition-colors hover:bg-[#df4c13]"
            >
              <Plus className="size-3.5" />
              New sample request
            </button>
          </div>
        </header>

        <div className="flex shrink-0 flex-col gap-1 border-b border-border pb-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Request view" className="flex shrink-0 items-center rounded-md bg-muted p-0.5">
              <button type="button" onClick={() => setView("board")} aria-pressed={view === "board"} className={viewClass(view === "board")}>
                <LayoutGrid aria-hidden="true" className="size-3.5" />
                Board
              </button>
              <button type="button" onClick={() => setView("all")} aria-pressed={view === "all"} className={viewClass(view === "all")}>
                <List aria-hidden="true" className="size-3.5" />
                List
              </button>
            </div>
            <label className="relative w-full sm:max-w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search sample requests"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests..."
                className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-2 text-[11px] outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>
          <nav aria-label="Filter by workflow stage" className="flex min-w-0 items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveStage("all")}
              aria-pressed={activeStage === "all"}
              className={navClass(activeStage === "all")}
            >
              All requests
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                {requests.length}
              </span>
            </button>
            {stages.map((stage) => (
              <button
                type="button"
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                aria-pressed={activeStage === stage.id}
                className={navClass(activeStage === stage.id)}
              >
                {stage.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                  {requests.filter((request) => request.stage === stage.id).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {view === "board" ? (
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1">
            <div className="flex h-full min-w-max items-start gap-2.5">
              {stages.filter((stage) => activeStage === "all" || stage.id === activeStage).map((stage) => {
                const stageRequests = visibleRequests.filter((request) => request.stage === stage.id)
                return (
                  <section key={stage.id} aria-label={`${stage.label} column`} className={cn("flex h-full max-h-full w-[252px] flex-col overflow-hidden rounded-md border border-border/80 sm:w-[268px]", stage.tint)}>
                    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-2.5 py-2">
                      <h2 className="truncate text-[11px] font-semibold">{stage.label}</h2>
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] tabular-nums">
                        {stageRequests.length}
                      </span>
                    </header>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                      {stageRequests.map((request) => (
                        <RequestCard key={request.id} request={request} onOpen={() => setActiveRequestId(request.id)} onMoveBack={() => moveBack(request)} />
                      ))}
                      {stageRequests.length === 0 && (
                        <p className="rounded border border-dashed border-border/80 bg-background/50 px-2 py-5 text-center text-[10px] text-muted-foreground">
                          No requests in this stage
                        </p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[860px] border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white">
                <tr className="h-8 text-left text-[10px] uppercase tracking-wide text-white/80">
                  <th className="px-3">Request</th>
                  <th className="px-3">Organization / Project</th>
                  {stageColumns.map((column) => <th key={column.label} className="px-3">{column.label}</th>)}
                  <th className="px-3">Priority</th>
                  <th className="px-3">Assigned to</th>
                  <th className="px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRequests.map((request) => (
                  <tr key={request.id} className="h-12 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3"><span className="font-medium">{request.id}</span></td>
                    <td className="px-3"><span className="block font-medium">{request.organization || "New organization"}</span><span className="text-[10px] text-muted-foreground">{request.project || "Project not set"}</span></td>
                    {stageColumns.map((column) => <td key={column.label} className="max-w-56 px-3">{column.render(request)}</td>)}
                    <td className="px-3"><PriorityBadge priority={request.priority} /></td>
                    <td className="whitespace-nowrap px-3">{request.assignedTo || "Not assigned"}</td>
                    <td className="px-3"><button type="button" onClick={() => setActiveRequestId(request.id)} className="whitespace-nowrap rounded bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-slate-700">{request.closed ? "View closure" : stages[stagePosition[request.stage]].action}</button></td>
                  </tr>
                ))}
                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan={stageColumns.length + 5} className="p-8 text-center text-xs text-muted-foreground">
                      {query
                        ? "No requests match your search in this view."
                        : activeStage === "all"
                          ? "No sample requests yet. Create a request to get started."
                          : `No requests are in ${stages[stagePosition[activeStage]].label}.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-[9px] text-muted-foreground">
          <div><p>Demo workflow · Changes are saved in this browser.</p><p>No backend is connected.</p>{feedback && <p role="status" className="mt-1">{feedback}</p>}</div>
          <button type="button" onClick={() => setIsResettingDemo(true)} className="rounded border border-input px-2 py-1 text-[9px] hover:bg-accent">Reset demo data</button>
        </footer>
      </main>

      {activeRequest && (
        <WorkflowDialog
          key={activeRequest.id}
          request={activeRequest}
          stockLevels={stockLevels}
          onClose={() => setActiveRequestId(null)}
          onSave={updateRequest}
        />
      )}
      {isResettingDemo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsResettingDemo(false) }}><section role="alertdialog" aria-modal="true" aria-labelledby="reset-samples-title" className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-2xl"><h2 id="reset-samples-title" className="text-sm font-semibold">Reset demo workflow?</h2><p className="mt-1 text-xs text-muted-foreground">This replaces locally saved sample requests and stock with the original demo data.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsResettingDemo(false)} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="button" onClick={resetDemo} className="h-8 rounded bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">Reset demo data</button></div></section></div>}
    </div>
  )
}

function navClass(active: boolean) {
  return cn(
    "flex h-8 shrink-0 items-center whitespace-nowrap border-b-2 px-2 text-[10px] transition-colors",
    active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
  )
}

function viewClass(active: boolean) {
  return cn(
    "flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 text-[10px] transition-colors",
    active ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium", priorityStyles[priority])}>{priority}</span>
}

function RequestCard({
  request,
  onOpen,
  onMoveBack,
}: {
  request: WorkflowRequest
  onOpen: () => void
  onMoveBack: () => void
}) {
  const stage = stages[stagePosition[request.stage]]
  const overdue = Boolean(request.requiredDate && request.requiredDate < today && !request.closed)
  const isComplete = request.closed
  const stageIndex = stagePosition[request.stage]
  const progress = isComplete ? 100 : Math.min(95, stageIndex * 25 + 10)
  const progressText = request.stage === "request"
    ? `0 of ${request.quantity} issued`
    : request.stage === "issue"
      ? `${request.issuedQuantity} of ${request.quantity} issued`
      : request.stage === "delivery"
        ? `${request.receivedQuantity} of ${request.issuedQuantity} received`
        : request.stage === "review"
          ? `${request.receivedQuantity} of ${request.issuedQuantity} reviewed`
          : `${request.returnedQuantity} of ${request.issuedQuantity} returned`

  return (
    <article className="rounded-md border border-border bg-card p-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-[11px] font-semibold leading-4">{request.organization || "New organization"}</h3>
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium", request.organizationType === "Client" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700")}>
              {request.organizationType}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold">{request.id}</span>
            <span className="text-muted-foreground">Due {formatDate(request.requiredDate)}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`More actions for ${request.id}`} className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onOpen}>Open workflow</DropdownMenuItem>
            <DropdownMenuItem disabled={stageIndex === 0 || request.closed} onSelect={onMoveBack}>Move to previous stage</DropdownMenuItem>
            {request.closed && <DropdownMenuItem onSelect={onOpen}>View closure details</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-1 truncate text-[10px] text-muted-foreground">{request.project || "Project not set"}</p>

      <div className="mt-2 flex items-center justify-between gap-1">
        {overdue ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-medium text-rose-700">
            <AlertTriangle className="size-3" /> {Math.max(1, Math.ceil((new Date(`${today}T12:00:00`).getTime() - new Date(`${request.requiredDate}T12:00:00`).getTime()) / 86400000))}d overdue
          </span>
        ) : <span className="text-[9px] text-muted-foreground">Required {formatDate(request.requiredDate)}</span>}
        <PriorityBadge priority={request.priority} />
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-2">
        {request.samples[0] ? (
          <div
            role="img"
            aria-label={`Material preview: ${request.samples[0].name}`}
            className="relative size-10 shrink-0 overflow-hidden rounded border border-border"
            style={{
              backgroundColor: request.samples[0].color,
              backgroundImage: "linear-gradient(135deg, rgb(255 255 255 / 0.55), transparent 42%, rgb(0 0 0 / 0.12)), repeating-linear-gradient(45deg, transparent 0 5px, rgb(255 255 255 / 0.16) 5px 6px)",
            }}
          >
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/35 px-1 text-[7px] text-white">
              {request.samples[0].category}
            </span>
          </div>
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted text-muted-foreground">
            <Image aria-hidden="true" className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px]">{request.sampleDetails || request.samples.map((sample) => sample.name).join(", ") || "Samples not selected"}</p>
          {request.samples[0] && <p className="truncate text-[9px] text-muted-foreground">{request.samples[0].code}</p>}
        </div>
        <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-2">
        <div className="h-1 rounded-full bg-muted">
          <div className="h-full rounded-full bg-slate-900 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between gap-1 text-[9px] text-muted-foreground">
          <span>{progressText}</span>
          <span className="inline-flex items-center gap-1"><UserRound className="size-3" />{request.assignedTo}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
        <button type="button" onClick={onOpen} className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded bg-slate-900 px-2 text-[10px] font-medium text-white transition-colors hover:bg-slate-700">
          {request.closed ? <CheckCircle2 className="size-3" /> : <ChevronRight className="size-3" />}
          <span className="truncate">{request.closed ? "View closure" : stage.action}</span>
        </button>
        <span className="flex h-7 shrink-0 items-center rounded border border-border px-1.5 text-[9px] text-muted-foreground">{request.status}</span>
      </div>
    </article>
  )
}

function FormField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block min-w-0 space-y-1", className)}>
      <span className="block text-[10px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

const controlClass = "h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/30"
const textareaClass = "min-h-16 w-full resize-y rounded border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"

function TextControl({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
  required?: boolean
  min?: number
}) {
  return (
    <FormField label={label}>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={min} className={controlClass} />
    </FormField>
  )
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label}>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </FormField>
  )
}

function TextareaControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label}>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className={textareaClass} />
    </FormField>
  )
}

function WorkflowDialog({
  request,
  stockLevels,
  onClose,
  onSave,
}: {
  request: WorkflowRequest
  stockLevels: Record<string, number>
  onClose: () => void
  onSave: (request: WorkflowRequest, nextStage?: WorkflowStage) => void
}) {
  const [draft, setDraft] = React.useState(request)
  const [selectedCode, setSelectedCode] = React.useState(sampleCatalogue[0].code)
  const [bagQuantity, setBagQuantity] = React.useState("1")
  const [validationMessage, setValidationMessage] = React.useState("")
  const stage = stages[stagePosition[draft.stage]]

  const update = <K extends keyof WorkflowRequest,>(key: K, value: WorkflowRequest[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setValidationMessage("")
  }

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const addSample = () => {
    const material = sampleCatalogue.find((item) => item.code === selectedCode)
    const quantity = Math.max(1, Number(bagQuantity) || 1)
    if (!material) return
    const alreadySelected = draft.samples.find((sample) => sample.code === material.code)?.requestedQuantity ?? 0
    if (alreadySelected + quantity > (stockLevels[material.code] ?? 0)) {
      return setValidationMessage(`Only ${stockLevels[material.code] ?? 0} units of ${material.name} are currently available.`)
    }
    setDraft((current) => {
      const existing = current.samples.find((sample) => sample.code === material.code)
      const samples = existing
        ? current.samples.map((sample) => sample.code === material.code
          ? { ...sample, requestedQuantity: sample.requestedQuantity + quantity }
          : sample)
        : [...current.samples, { ...material, requestedQuantity: quantity, issuedQuantity: 0 }]
      const sampleBagTotal = samples.reduce((total, sample) => total + sample.requestedQuantity, 0)
      return {
        ...current,
        samples,
        sampleDetails: samples.map((sample) => sample.name).join(", "),
        issuedQuantity: Math.min(current.quantity, sampleBagTotal),
      }
    })
    setValidationMessage("")
  }

  const removeSample = (code: string) => {
    setDraft((current) => {
      const samples = current.samples.filter((sample) => sample.code !== code)
      return {
        ...current,
        samples,
        sampleDetails: samples.map((sample) => sample.name).join(", "),
      }
    })
    setValidationMessage("")
  }

  const advance = (nextStage: WorkflowStage, updateValues: Partial<WorkflowRequest> = {}) => {
    onSave({ ...draft, ...updateValues }, nextStage)
  }

  const currentStageIndex = stagePosition[draft.stage]
  const sampleBagTotal = draft.samples.reduce((total, sample) => total + sample.requestedQuantity, 0)
  const canClose = draft.returnStatus !== "Awaiting return" && draft.finalDisposition !== "Pending" &&
    (draft.finalDisposition !== "Returned to stock" || draft.returnedQuantity >= draft.issuedQuantity)

  const actionForStage = () => {
    if (draft.stage === "request") {
      return <>
        <button type="button" onClick={() => onSave({ ...draft, status: "Draft" })} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Save as Draft</button>
        <button type="button" onClick={() => advance("issue", { status: "Submitted" })} disabled={!draft.organization.trim() || !draft.project.trim() || !draft.requester.trim() || !draft.sampleDetails.trim()} className="inline-flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-40"><Send className="size-3" />Submit Request</button>
      </>
    }
    if (draft.stage === "issue") {
      return <>
        <button type="button" onClick={() => onSave(draft)} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Save progress</button>
        <button type="button" onClick={() => {
          if (draft.samples.length === 0) return setValidationMessage("Add at least one catalogue sample to the Sample Bag.")
          if (draft.availability === "Unavailable") return setValidationMessage("Select an available sample or update its stock availability before issuing.")
          const issued = draft.issuedQuantity || Math.min(draft.quantity, sampleBagTotal)
          if (issued > draft.quantity || issued > sampleBagTotal) return setValidationMessage("Issued quantity cannot exceed the request or the Sample Bag quantity.")
          let remainingToIssue = issued
          const issuedSamples = draft.samples.map((sample) => {
            const issuedFromLine = Math.min(sample.requestedQuantity, remainingToIssue)
            remainingToIssue -= issuedFromLine
            return { ...sample, issuedQuantity: issuedFromLine }
          })
          const unavailableSample = issuedSamples.find((sample) => sample.issuedQuantity > (stockLevels[sample.code] ?? 0))
          if (unavailableSample) return setValidationMessage(`Only ${stockLevels[unavailableSample.code] ?? 0} units of ${unavailableSample.name} remain in stock.`)
          advance("delivery", {
            issuedQuantity: issued,
            issueStatus: issued < draft.quantity ? "Partial" : "Issued",
            dispatchRequestCreated: true,
            samples: issuedSamples,
            status: "Dispatch requested",
          })
        }} disabled={draft.availability === "Unavailable"} className="inline-flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-40"><Package className="size-3" />Reserve &amp; create dispatch</button>
      </>
    }
    if (draft.stage === "delivery") {
      return <>
        <button type="button" onClick={() => onSave(draft)} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Save delivery</button>
        <button type="button" onClick={() => {
          if (draft.receiptStatus !== "Received") return setValidationMessage("Set Receipt Status to Received before confirming delivery.")
          if (draft.receivedQuantity < 1 || draft.receivedQuantity > draft.issuedQuantity) return setValidationMessage("Received quantity must be between 1 and the issued quantity.")
          advance("review", { dispatchStatus: "Delivered", status: "Received" })
        }} className="inline-flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-700"><Truck className="size-3" />Confirm receipt</button>
      </>
    }
    if (draft.stage === "review") {
      return <>
        <button type="button" onClick={() => onSave(draft)} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Save review</button>
        <button type="button" onClick={() => {
          if (draft.decision !== "Approved" || !draft.finalApproval) return setValidationMessage("Record an Approved decision and confirm final approval to continue.")
          advance("return", { status: "Approved" })
        }} className="inline-flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-700"><ClipboardCheck className="size-3" />Approve &amp; continue</button>
      </>
    }
    return <>
      <button type="button" onClick={() => onSave(draft)} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Save return</button>
      <button type="button" onClick={() => {
        if (!canClose) return setValidationMessage("Verify the return status, quantity, and final disposition before closing.")
        onSave({ ...draft, closed: true, status: "Closed", stockUpdated: draft.finalDisposition === "Returned to stock" })
      }} disabled={!canClose} className="inline-flex h-8 items-center gap-1.5 rounded bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-40"><Check className="size-3" />Complete &amp; close</button>
    </>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 backdrop-blur-[2px] sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="workflow-dialog-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{stage.label} · {draft.id}</p>
            <h2 id="workflow-dialog-title" className="mt-1 truncate text-base font-semibold">{draft.organization || "New sample request"}</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{draft.project || "Project details required"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workflow" className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
          <div className="mb-4 grid grid-cols-5 gap-1" aria-label="Workflow progress">
            {stages.map((item, index) => (
              <div key={item.id} className="min-w-0">
                <div className={cn("h-1 rounded-full", index <= currentStageIndex ? "bg-primary" : "bg-muted")} />
                <p className={cn("mt-1 hidden truncate text-[9px] sm:block", index === currentStageIndex ? "font-semibold text-foreground" : "text-muted-foreground")}>{item.label}</p>
              </div>
            ))}
          </div>

          {draft.stage === "request" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextControl label="Organization / Client / Studio" value={draft.organization} onChange={(value) => update("organization", value)} required />
              <SelectControl label="Organization type" value={draft.organizationType} options={["Client", "Studio"]} onChange={(value) => update("organizationType", value as OrganizationType)} />
              <TextControl label="Project" value={draft.project} onChange={(value) => update("project", value)} required />
              <TextControl label="Requester" value={draft.requester} onChange={(value) => update("requester", value)} required />
              <section className="space-y-2 rounded-md border border-border p-3 sm:col-span-2">
                <div>
                  <h3 className="text-xs font-semibold">Requested samples</h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Choose catalogue samples to add them to this request.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_88px_auto]">
                  <select aria-label="Catalogue sample" value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} className={controlClass}>
                    {sampleCatalogue.map((sample) => <option key={sample.code} value={sample.code}>{sample.name} · {sample.code} · {stockLevels[sample.code] ?? 0} available</option>)}
                  </select>
                  <input aria-label="Sample quantity" type="number" min="1" value={bagQuantity} onChange={(event) => setBagQuantity(event.target.value)} className={controlClass} />
                  <button type="button" onClick={addSample} className="inline-flex h-8 items-center justify-center gap-1 rounded border border-input px-2 text-[10px] font-medium hover:bg-accent"><Plus className="size-3" />Add sample</button>
                </div>
                <div className="divide-y divide-border">
                  {draft.samples.map((sample) => (
                    <div key={sample.code} className="flex items-center gap-2 py-2 text-[10px]">
                      <span className="size-7 shrink-0 rounded border border-border" style={{ backgroundColor: sample.color }} />
                      <span className="min-w-0 flex-1 truncate">{sample.name} <span className="text-muted-foreground">{sample.code}</span></span>
                      <span className="text-muted-foreground">Qty {sample.requestedQuantity}</span>
                      <button type="button" aria-label={`Remove ${sample.name}`} onClick={() => removeSample(sample.code)} className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="size-3" /></button>
                    </div>
                  ))}
                  {draft.samples.length === 0 && <p className="py-2 text-[10px] text-muted-foreground">No samples selected. Choose a catalogue sample above.</p>}
                </div>
              </section>
              <TextControl label="Quantity" type="number" min={1} value={draft.quantity} onChange={(value) => update("quantity", Math.max(1, Number(value) || 1))} required />
              <SelectControl label="Request Type" value={draft.requestType} options={["Project sample", "Client presentation", "Mock-up", "Replacement"]} onChange={(value) => update("requestType", value)} />
              <SelectControl label="Priority" value={draft.priority} options={["Urgent", "High", "Normal", "Low"]} onChange={(value) => update("priority", value as Priority)} />
              <SelectControl label="Assigned To" value={draft.assignedTo} options={teamMembers} onChange={(value) => update("assignedTo", value)} />
              <SelectControl label="Status" value={draft.status} options={["Draft", "Submitted", "In review"]} onChange={(value) => update("status", value)} />
              <TextControl label="Required date" type="date" value={draft.requiredDate} onChange={(value) => update("requiredDate", value)} required />
              <TextareaControl label="Purpose" value={draft.purpose} onChange={(value) => update("purpose", value)} />
              <TextareaControl label="Delivery address" value={draft.deliveryAddress} onChange={(value) => update("deliveryAddress", value)} />
            </div>
          )}

          {draft.stage === "issue" && (
            <div className="space-y-4">
              <section className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div><h3 className="text-xs font-semibold">Sample Bag</h3><p className="mt-0.5 text-[10px] text-muted-foreground">Select catalogue materials and quantities for this request.</p></div>
                  <span className="rounded bg-muted px-2 py-1 text-[10px]">{sampleBagTotal} requested</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_88px_auto]">
                  <select aria-label="Catalogue sample" value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} className={controlClass}>
                    {sampleCatalogue.map((sample) => <option key={sample.code} value={sample.code}>{sample.name} · {sample.code} · {stockLevels[sample.code] ?? 0} available</option>)}
                  </select>
                  <input aria-label="Sample bag quantity" type="number" min="1" value={bagQuantity} onChange={(event) => setBagQuantity(event.target.value)} className={controlClass} />
                  <button type="button" onClick={addSample} className="inline-flex h-8 items-center justify-center gap-1 rounded border border-input px-2 text-[10px] font-medium hover:bg-accent"><Plus className="size-3" />Add sample</button>
                </div>
                <div className="mt-2 divide-y divide-border">
                  {draft.samples.map((sample) => (
                    <div key={sample.code} className="flex items-center gap-2 py-2 text-[10px]">
                      <span className="size-5 shrink-0 rounded border border-border" style={{ backgroundColor: sample.color }} />
                      <span className="min-w-0 flex-1 truncate">{sample.name} <span className="text-muted-foreground">{sample.code}</span></span>
                      <label className="flex items-center gap-1 text-muted-foreground">Qty <input type="number" min="1" value={sample.requestedQuantity} onChange={(event) => update("samples", draft.samples.map((item) => item.code === sample.code ? { ...item, requestedQuantity: Math.max(1, Number(event.target.value) || 1) } : item))} className="h-7 w-14 rounded border border-input bg-background px-1 text-foreground" /></label>
                      <button type="button" aria-label={`Remove ${sample.name}`} onClick={() => removeSample(sample.code)} className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="size-3" /></button>
                    </div>
                  ))}
                  {draft.samples.length === 0 && <p className="py-3 text-center text-[10px] text-muted-foreground">No samples in the bag yet.</p>}
                </div>
              </section>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectControl label="Availability" value={draft.availability} options={["Available", "Partial", "Unavailable"]} onChange={(value) => update("availability", value)} />
                <SelectControl label="Stock Location" value={draft.stockLocation} options={[...new Set(sampleCatalogue.map((sample) => sample.location))]} onChange={(value) => update("stockLocation", value)} />
                <SelectControl label="Condition" value={draft.condition} options={["Good", "New", "Damaged", "Needs inspection"]} onChange={(value) => update("condition", value)} />
                <SelectControl label="Issue Status" value={draft.issueStatus} options={["Not issued", "Reserved", "Issued", "Partial"]} onChange={(value) => update("issueStatus", value)} />
                <TextControl label="Issued quantity" type="number" min={0} value={draft.issuedQuantity} onChange={(value) => update("issuedQuantity", Math.max(0, Number(value) || 0))} />
                <TextControl label="Return date" type="date" value={draft.returnBy} onChange={(value) => update("returnBy", value)} />
              </div>
              <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2 text-[10px] text-muted-foreground">
                <Package className="size-3.5 shrink-0" /> Stock is checked against the local catalogue preview. Reserve &amp; create dispatch records the issue in this page session.
              </div>
            </div>
          )}

          {draft.stage === "delivery" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextControl label="Pickup location" value={draft.pickupLocation} onChange={(value) => update("pickupLocation", value)} />
              <SelectControl label="Delivery Method" value={draft.deliveryMethod} options={["Courier", "Studio pickup", "Project delivery", "Internal transfer"]} onChange={(value) => update("deliveryMethod", value)} />
              <TextareaControl label="Delivery address" value={draft.deliveryAddress} onChange={(value) => update("deliveryAddress", value)} />
              <TextControl label="Contact person" value={draft.contactPerson} onChange={(value) => update("contactPerson", value)} />
              <TextControl label="Expected date" type="date" value={draft.expectedDate} onChange={(value) => update("expectedDate", value)} />
              {draft.deliveryMethod === "Courier" && <>
                <TextControl label="Courier" value={draft.courier} onChange={(value) => update("courier", value)} />
                <TextControl label="Tracking details" value={draft.trackingNumber} onChange={(value) => update("trackingNumber", value)} />
              </>}
              <SelectControl label="Dispatch Status" value={draft.dispatchStatus} options={["Not dispatched", "Ready for pickup", "In transit", "Delivered", "Delivery exception"]} onChange={(value) => update("dispatchStatus", value)} />
              <SelectControl label="Receipt Status" value={draft.receiptStatus} options={["Pending", "Received", "Partially received", "Rejected"]} onChange={(value) => update("receiptStatus", value)} />
              <TextControl label="Received quantity" type="number" min={0} value={draft.receivedQuantity} onChange={(value) => update("receivedQuantity", Math.max(0, Number(value) || 0))} />
              <SelectControl label="Received condition" value={draft.receivedCondition} options={["Good", "Damaged", "Incomplete", "Needs inspection"]} onChange={(value) => update("receivedCondition", value)} />
              {draft.dispatchRequestCreated && <p className="flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800 sm:col-span-2"><CheckCircle2 className="size-3.5" /> Dispatch request created locally · {draft.trackingNumber || "Tracking not assigned"}</p>}
            </div>
          )}

          {draft.stage === "review" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextControl label="Project" value={draft.project} onChange={(value) => update("project", value)} />
              <SelectControl label="Reviewer" value={draft.reviewer} options={reviewers} onChange={(value) => update("reviewer", value)} />
              <div className="rounded border border-border p-2.5 sm:col-span-2">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">Samples for review</p>
                <div className="flex flex-wrap gap-2">
                  {draft.samples.map((sample) => <span key={sample.code} className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[10px]"><span className="size-3 rounded-sm" style={{ backgroundColor: sample.color }} />{sample.name} · {sample.issuedQuantity} issued</span>)}
                </div>
              </div>
              <SelectControl label="Decision" value={draft.decision} options={["Pending", "Approved", "Revise", "Replace", "Rejected"]} onChange={(value) => update("decision", value)} />
              <SelectControl label="Follow-up" value={draft.followUp} options={["None", "Revision required", "Replacement required", "Resubmit for review"]} onChange={(value) => update("followUp", value)} />
              <TextareaControl label="Comments" value={draft.reviewComments} onChange={(value) => update("reviewComments", value)} />
              <FormField label="Final approval">
                <select aria-label="Final approval" value={draft.finalApproval ? "Approved" : "Awaiting approval"} onChange={(event) => update("finalApproval", event.target.value === "Approved")} className={controlClass}>
                  <option>Awaiting approval</option><option>Approved</option>
                </select>
              </FormField>
            </div>
          )}

          {draft.stage === "return" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-3 text-[10px] sm:grid-cols-4">
                <div><p className="text-muted-foreground">Issued</p><p className="mt-1 font-semibold">{draft.issuedQuantity}</p></div>
                <div><p className="text-muted-foreground">Received</p><p className="mt-1 font-semibold">{draft.receivedQuantity}</p></div>
                <div><p className="text-muted-foreground">Return due</p><p className="mt-1 font-semibold">{formatDate(draft.returnBy)}</p></div>
                <div><p className="text-muted-foreground">Stock update</p><p className="mt-1 font-semibold">{draft.stockUpdated ? "Updated" : "Pending"}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectControl label="Return Status" value={draft.returnStatus} options={["Awaiting return", "Return arranged", "In transit", "Received", "Partially received", "Not returned"]} onChange={(value) => update("returnStatus", value)} />
                <SelectControl label="Condition" value={draft.returnCondition} options={["Good", "Damaged", "Needs inspection", "Not applicable"]} onChange={(value) => update("returnCondition", value)} />
                <TextControl label="Returned quantity" type="number" min={0} value={draft.returnedQuantity} onChange={(value) => update("returnedQuantity", Math.max(0, Number(value) || 0))} />
                <SelectControl label="Final Disposition" value={draft.finalDisposition} options={["Pending", "Returned to stock", "Damaged", "Lost", "Retained", "Consumed", "Converted"]} onChange={(value) => update("finalDisposition", value)} />
              </div>
              {draft.returnStatus === "Received" && draft.finalDisposition === "Returned to stock" && draft.returnedQuantity >= draft.issuedQuantity && (
                <p className="flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"><CheckCircle2 className="size-3.5" />All issued quantities are accounted for. Stock will be updated when this request is closed.</p>
              )}
              {draft.finalDisposition !== "Pending" && draft.finalDisposition !== "Returned to stock" && (
                <p className="rounded bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Disposition recorded as {draft.finalDisposition}. Confirm the returned quantity before closing.</p>
              )}
            </div>
          )}

          {validationMessage && <p role="alert" className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{validationMessage}</p>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border p-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {draft.stage === "return" ? <RotateCcw className="size-3.5" /> : draft.stage === "delivery" ? <Truck className="size-3.5" /> : draft.stage === "review" ? <ClipboardCheck className="size-3.5" /> : <Package className="size-3.5" />}
            Stage {currentStageIndex + 1} of 5
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-[11px] font-medium hover:bg-accent">Cancel</button>
            {actionForStage()}
          </div>
        </footer>
      </section>
    </div>
  )
}
