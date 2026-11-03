import * as React from "react"
import { Building2, Pencil, Plus, RefreshCw, Search, Trash2, X } from "@/components/ui/icons"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { cn } from "@/lib/utils"

type VendorStatus = "Active" | "Pending" | "Inactive"
type Vendor = {
  id: string
  company: string
  category: string
  contact: string
  email: string
  phone: string
  city: string
  status: VendorStatus
}

const initialVendors: Vendor[] = [
  { id: "northwind-logistics", company: "Northwind Logistics", category: "Logistics", contact: "Meera Iyer", email: "ops@northwindlogistics.com", phone: "+91 20 6788 1200", city: "Pune, Maharashtra", status: "Active" },
  { id: "lumen-lighting", company: "Lumen Lighting Co", category: "Lighting", contact: "Isha Rao", email: "isha-rao@example.com", phone: "—", city: "—", status: "Active" },
  { id: "aarav-stoneworks", company: "Aarav Stoneworks", category: "Stone supplier", contact: "Dev Patel", email: "dev-patel@example.com", phone: "—", city: "—", status: "Pending" },
  { id: "kaveri-interiors", company: "Kaveri Interiors", category: "Interior contractor", contact: "Sunil Rao", email: "sunil-rao@example.com", phone: "—", city: "—", status: "Active" },
]

const vendorInputClass = "h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"

export function VendorsPage() {
  const [vendors, setVendors] = usePersistentState("archscale.vendors", initialVendors)
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState("All categories")
  const [status, setStatus] = React.useState("All statuses")
  const [editing, setEditing] = React.useState<Vendor | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<Vendor | null>(null)
  const [feedback, setFeedback] = React.useState("")

  const query = search.trim().toLowerCase()
  const categories = [...new Set(vendors.map((vendor) => vendor.category).filter(Boolean))].sort()
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = !query || `${vendor.company} ${vendor.category} ${vendor.contact} ${vendor.email} ${vendor.city}`.toLowerCase().includes(query)
    return matchesSearch && (category === "All categories" || vendor.category === category) && (status === "All statuses" || vendor.status === status)
  })

  const saveVendor = (vendor: Vendor) => {
    setVendors((current) => current.some((item) => item.id === vendor.id)
      ? current.map((item) => item.id === vendor.id ? vendor : item)
      : [vendor, ...current])
    setEditing(null)
    setIsCreating(false)
    setFeedback(`${vendor.company} saved in this browser.`)
  }

  const deleteVendor = () => {
    if (!deleting) return
    setVendors((current) => current.filter((vendor) => vendor.id !== deleting.id))
    setFeedback(`${deleting.company} removed from this browser.`)
    setDeleting(null)
  }

  const refreshVendors = () => {
    try {
      const saved = window.localStorage.getItem("archscale.vendors")
      if (saved !== null) setVendors(JSON.parse(saved) as Vendor[])
      setSearch("")
      setCategory("All categories")
      setStatus("All statuses")
      setFeedback("Vendors reloaded from this browser.")
    } catch {
      setFeedback("Saved vendors could not be read; current session data remains available.")
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 p-3 sm:p-4 xl:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Products · Inventory</p><h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">Vendors</h1></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refreshVendors} aria-label="Refresh vendors" className="flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCw className="size-3.5" /></button>
            <button type="button" onClick={() => setIsCreating(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-3.5" />New vendor</button>
          </div>
        </header>

        <section aria-label="Vendor summary" className="grid grid-cols-3 rounded-md border border-border bg-card">
          <SummaryCell label="Vendors" value={vendors.length} />
          <SummaryCell label="Active" value={vendors.filter((vendor) => vendor.status === "Active").length} />
          <SummaryCell label="Pending" value={vendors.filter((vendor) => vendor.status === "Pending").length} />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search vendors" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor, contact, category or city" className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" /></label>
          <select aria-label="Filter vendors by category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter vendors by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option>All statuses</option><option>Active</option><option>Pending</option><option>Inactive</option></select>
        </div>
        <p className="text-[10px] text-muted-foreground">{filteredVendors.length} of {vendors.length} vendors</p>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead className="bg-slate-800 text-white"><tr className="h-8 text-left text-[9px] uppercase tracking-wide text-white/80"><th className="px-3">Vendor</th><th className="px-3">Category</th><th className="px-3">Primary contact</th><th className="px-3">Email / phone</th><th className="px-3">Location</th><th className="px-3">Status</th><th className="px-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="h-14 hover:bg-muted/30">
                  <td className="px-3"><span className="flex items-center gap-2"><span className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary text-primary"><Building2 className="size-3.5" /></span><span className="font-medium">{vendor.company}</span></span></td>
                  <td className="px-3">{vendor.category}</td><td className="px-3">{vendor.contact}</td><td className="px-3"><span className="block">{vendor.email || "—"}</span><span className="text-[10px] text-muted-foreground">{vendor.phone || "—"}</span></td><td className="px-3">{vendor.city || "—"}</td>
                  <td className="px-3"><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", vendor.status === "Active" ? "bg-emerald-100 text-emerald-800" : vendor.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground")}>{vendor.status}</span></td>
                  <td className="px-3"><div className="flex items-center gap-1"><button type="button" onClick={() => setEditing(vendor)} aria-label={`Edit ${vendor.company}`} className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="size-3.5" /></button><button type="button" onClick={() => setDeleting(vendor)} aria-label={`Delete ${vendor.company}`} className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-rose-50 hover:text-rose-700"><Trash2 className="size-3.5" /></button></div></td>
                </tr>
              ))}
              {filteredVendors.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">No vendors match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-muted-foreground">Demo vendor records · Saved in this browser only.</p>
        {feedback && <p role="status" className="text-[10px] text-muted-foreground">{feedback}</p>}
      </main>

      {(isCreating || editing) && <VendorFormDialog key={editing?.id ?? "new-vendor"} vendor={editing} onClose={() => { setIsCreating(false); setEditing(null) }} onSave={saveVendor} />}
      {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null) }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-vendor-title" className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-2xl"><h2 id="delete-vendor-title" className="text-sm font-semibold">Delete vendor?</h2><p className="mt-1 text-xs text-muted-foreground">{deleting.company} will be removed from this browser.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleting(null)} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="button" onClick={deleteVendor} className="h-8 rounded bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">Delete vendor</button></div></section></div>}
    </div>
  )
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return <div className="border-r border-border px-3 py-2 last:border-r-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p></div>
}

function VendorFormDialog({ vendor, onClose, onSave }: { vendor: Vendor | null; onClose: () => void; onSave: (vendor: Vendor) => void }) {
  const [company, setCompany] = React.useState(vendor?.company ?? "")
  const [category, setCategory] = React.useState(vendor?.category ?? "")
  const [contact, setContact] = React.useState(vendor?.contact ?? "")
  const [email, setEmail] = React.useState(vendor?.email ?? "")
  const [phone, setPhone] = React.useState(vendor?.phone === "—" ? "" : vendor?.phone ?? "")
  const [city, setCity] = React.useState(vendor?.city === "—" ? "" : vendor?.city ?? "")
  const [status, setStatus] = React.useState<VendorStatus>(vendor?.status ?? "Pending")

  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="vendor-form-title" className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4"><div><h2 id="vendor-form-title" className="text-base font-semibold">{vendor ? "Edit vendor" : "New vendor"}</h2><p className="mt-1 text-xs text-muted-foreground">Saved in this browser only.</p></div><button type="button" onClick={onClose} aria-label="Close vendor form" className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-4" /></button></header>
        <form className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave({ id: vendor?.id ?? `vendor-${Date.now()}`, company: company.trim(), category: category.trim(), contact: contact.trim(), email: email.trim(), phone: phone.trim() || "—", city: city.trim() || "—", status }) }}>
          <Field label="Company name"><input required value={company} onChange={(event) => setCompany(event.target.value)} className={vendorInputClass} /></Field>
          <Field label="Category"><input required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Lighting, stone, logistics..." className={vendorInputClass} /></Field>
          <Field label="Primary contact"><input required value={contact} onChange={(event) => setContact(event.target.value)} className={vendorInputClass} /></Field>
          <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value as VendorStatus)} className={vendorInputClass}><option>Active</option><option>Pending</option><option>Inactive</option></select></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={vendorInputClass} /></Field>
          <Field label="Phone"><input value={phone} onChange={(event) => setPhone(event.target.value)} className={vendorInputClass} /></Field>
          <Field label="City"><input value={city} onChange={(event) => setCity(event.target.value)} className={vendorInputClass} /></Field>
          <footer className="flex justify-end gap-2 border-t border-border pt-3 sm:col-span-2"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" disabled={!company.trim() || !category.trim() || !contact.trim()} className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40">{vendor ? "Save changes" : "Create vendor"}</button></footer>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">{label}</span>{children}</label>
}
