import * as React from "react"
import { Download, RefreshCw, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type LocalRequest = {
  id?: string
  organization?: string
  project?: string
  assignedTo?: string
  requiredDate?: string
  returnBy?: string
  issuedQuantity?: number
  receiptStatus?: string
  dispatchStatus?: string
  closed?: boolean
  samples?: { code?: string; name?: string; category?: string; issuedQuantity?: number }[]
}

type IssuedReportRow = {
  id: string
  organization: string
  project: string
  assignedTo: string
  material: string
  code: string
  category: string
  quantity: number
  requiredDate: string
  returnBy: string
  status: string
}

const reportStorageKey = "archscale.samples.requests"
const reportStatuses = ["All statuses", "Pending", "In transit", "Received", "Closed"]

function readIssuedRows(): IssuedReportRow[] {
  try {
    const stored = window.localStorage.getItem(reportStorageKey)
    if (!stored) return []
    const requests = JSON.parse(stored) as LocalRequest[]
    return requests.flatMap((request) => {
      const status = request.closed
        ? "Closed"
        : request.receiptStatus === "Received"
          ? "Received"
          : request.dispatchStatus === "In transit" || request.dispatchStatus === "Delivered"
            ? "In transit"
            : "Pending"
      return (request.samples ?? [])
        .filter((sample) => Number(sample.issuedQuantity) > 0)
        .map((sample) => ({
          id: request.id ?? "",
          organization: request.organization ?? "",
          project: request.project ?? "",
          assignedTo: request.assignedTo ?? "",
          material: sample.name ?? "",
          code: sample.code ?? "",
          category: sample.category ?? "",
          quantity: Number(sample.issuedQuantity) || 0,
          requiredDate: request.requiredDate ?? "",
          returnBy: request.returnBy ?? "",
          status,
        }))
    })
  } catch {
    return []
  }
}

const formatDate = (date: string) => {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`))
}

export function IssuedReportPage() {
  const [rows, setRows] = React.useState(readIssuedRows)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("All statuses")
  const query = search.trim().toLowerCase()
  const filteredRows = rows.filter((row) => {
    const matchesSearch = !query || `${row.id} ${row.organization} ${row.project} ${row.material} ${row.code} ${row.assignedTo}`.toLowerCase().includes(query)
    return matchesSearch && (status === "All statuses" || row.status === status)
  })
  const totalUnits = filteredRows.reduce((sum, row) => sum + row.quantity, 0)

  const exportCsv = () => {
    if (filteredRows.length === 0) return
    const fields = ["Request ID", "Organization", "Project", "Material", "Code", "Category", "Issued quantity", "Required date", "Return by", "Assigned to", "Status"]
    const values = filteredRows.map((row) => [row.id, row.organization, row.project, row.material, row.code, row.category, String(row.quantity), row.requiredDate, row.returnBy, row.assignedTo, row.status])
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
    const csv = [fields, ...values].map((line) => line.map(quote).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "archscale-issued-report.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 p-3 sm:p-4 xl:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Products · Inventory</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">Issued report</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRows(readIssuedRows())} aria-label="Refresh issued report" className="flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCw className="size-3.5" /></button>
            <button type="button" onClick={exportCsv} disabled={filteredRows.length === 0} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"><Download className="size-3.5" />Export CSV</button>
          </div>
        </header>

        <section aria-label="Issued report summary" className="grid grid-cols-2 rounded-md border border-border bg-card sm:grid-cols-3">
          <ReportSummary label="Issued lines" value={filteredRows.length} />
          <ReportSummary label="Issued units" value={totalUnits} />
          <ReportSummary label="Requests" value={new Set(filteredRows.map((row) => row.id)).size} />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search issued report" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, project, material or code" className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <select aria-label="Filter report by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2.5 text-xs">
            {reportStatuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead className="bg-slate-800 text-white">
              <tr className="h-8 text-left text-[9px] uppercase tracking-wide text-white/80">
                <th className="px-3">Request</th><th className="px-3">Organization / Project</th><th className="px-3">Material</th><th className="px-3">Issued</th><th className="px-3">Required</th><th className="px-3">Return by</th><th className="px-3">Assigned to</th><th className="px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row, index) => (
                <tr key={`${row.id}-${row.code}-${index}`} className="h-12 hover:bg-muted/30">
                  <td className="px-3 font-medium">{row.id}</td>
                  <td className="px-3"><span className="block font-medium">{row.organization}</span><span className="text-[10px] text-muted-foreground">{row.project}</span></td>
                  <td className="px-3"><span className="block">{row.material}</span><span className="text-[10px] text-muted-foreground">{row.code} · {row.category}</span></td>
                  <td className="px-3 tabular-nums">{row.quantity}</td><td className="px-3">{formatDate(row.requiredDate)}</td><td className="px-3">{formatDate(row.returnBy)}</td><td className="px-3">{row.assignedTo}</td>
                  <td className="px-3"><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", row.status === "Closed" ? "bg-emerald-100 text-emerald-800" : row.status === "Received" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800")}>{row.status}</span></td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center"><p className="text-xs font-medium">No issued sample records</p><p className="mt-1 text-[10px] text-muted-foreground">Issued report data appears after a sample request is issued in Swatch &amp; Sample.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-muted-foreground">Report reflects locally saved Swatch &amp; Sample requests in this browser; no server report source is configured.</p>
      </main>
    </div>
  )
}

function ReportSummary({ label, value }: { label: string; value: number }) {
  return <div className="border-border px-3 py-2 not-last:border-r"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p></div>
}
