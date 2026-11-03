import * as React from "react"
import { AlertTriangle, Boxes, Plus, RefreshCw, Search, X } from "@/components/ui/icons"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { cn } from "@/lib/utils"
import { categories, initialItems, type InventoryItem, type ItemCategory } from "./inventory-data"

type StockAdjustment = {
  id: string
  itemId: string
  itemName: string
  from: number
  to: number
  reason: string
  date: string
}

const stockInputClass = "h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"

export function StocksPage() {
  const [items, setItems] = usePersistentState("archscale.inventory.items", initialItems)
  const [adjustments, setAdjustments] = usePersistentState<StockAdjustment[]>("archscale.inventory.adjustments", [])
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<ItemCategory | "All">("All")
  const [lowStockOnly, setLowStockOnly] = React.useState(false)
  const [adjustingItem, setAdjustingItem] = React.useState<InventoryItem | null>(null)
  const [feedback, setFeedback] = React.useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    const matchesSearch = !normalizedSearch || `${item.name} ${item.code} ${item.category} ${item.finish} ${item.size}`.toLowerCase().includes(normalizedSearch)
    const matchesCategory = category === "All" || item.category === category
    const matchesStock = !lowStockOnly || item.stock <= 10
    return matchesSearch && matchesCategory && matchesStock
  })
  const totalUnits = items.reduce((sum, item) => sum + item.stock, 0)
  const lowStockCount = items.filter((item) => item.stock <= 10).length

  const adjustItem = (itemId: string, quantity: number, reason: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const nextQuantity = Math.max(0, Math.floor(quantity))
    setItems((current) => current.map((entry) => entry.id === itemId ? { ...entry, stock: nextQuantity } : entry))
    setAdjustments((current) => [{
      id: `ADJ-${Date.now()}`,
      itemId,
      itemName: item.name,
      from: item.stock,
      to: nextQuantity,
      reason,
      date: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
    }, ...current].slice(0, 20))
    setFeedback(`${item.name} stock updated to ${nextQuantity}.`)
    setAdjustingItem(null)
  }

  const refreshStock = () => {
    try {
      const savedItems = window.localStorage.getItem("archscale.inventory.items")
      const savedAdjustments = window.localStorage.getItem("archscale.inventory.adjustments")
      if (savedItems !== null) setItems(JSON.parse(savedItems) as InventoryItem[])
      if (savedAdjustments !== null) setAdjustments(JSON.parse(savedAdjustments) as StockAdjustment[])
      setFeedback("Stock reloaded from this browser.")
    } catch {
      setFeedback("Saved stock could not be read; current session data remains available.")
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 p-3 sm:p-4 xl:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Products · Inventory</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">Stocks</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refreshStock} aria-label="Refresh stock" title="Refresh saved stock" className="flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCw className="size-3.5" /></button>
            <button type="button" onClick={() => items[0] && setAdjustingItem(items[0])} disabled={items.length === 0} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"><Plus className="size-3.5" />Adjust stock</button>
          </div>
        </header>

        <section aria-label="Stock summary" className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3">
          <Summary label="Inventory items" value={items.length} icon={<Boxes className="size-3.5" />} />
          <Summary label="Total units" value={totalUnits} icon={<PackageIcon />} />
          <button type="button" onClick={() => setLowStockOnly((current) => !current)} aria-pressed={lowStockOnly} className={cn("relative flex min-w-0 items-center gap-2 border-border px-3 py-2 text-left transition-colors hover:bg-muted/40 sm:border-l", lowStockOnly && "bg-amber-50")}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-800"><AlertTriangle className="size-3.5" /></span>
            <span className="min-w-0"><span className="block text-[10px] text-muted-foreground">Low stock</span><span className="text-sm font-semibold tabular-nums">{lowStockCount}</span></span>
          </button>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search stock" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, code, finish or size" className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <select aria-label="Filter stock by category" value={category} onChange={(event) => setCategory(event.target.value as ItemCategory | "All")} className="h-8 rounded-md border border-input bg-background px-2.5 text-xs">
            <option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead className="bg-slate-800 text-white">
              <tr className="h-8 text-left text-[9px] uppercase tracking-wide text-white/80">
                <th className="px-3">Item</th><th className="px-3">Category</th><th className="px-3">Finish / Size</th><th className="px-3">On hand</th><th className="px-3">Stock level</th><th className="px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="h-14 hover:bg-muted/30">
                  <td className="px-3"><span className="flex items-center gap-2"><span className="size-7 shrink-0 rounded-sm border border-border" style={{ backgroundColor: item.color }} /><span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="text-[10px] text-muted-foreground">{item.code}</span></span></span></td>
                  <td className="px-3">{item.category}</td>
                  <td className="px-3"><span className="block">{item.finish}</span><span className="text-[10px] text-muted-foreground">{item.size}</span></td>
                  <td className="px-3"><span className={cn("inline-flex min-w-7 justify-center rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums", item.stock <= 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{item.stock}</span></td>
                  <td className="px-3"><div className="h-1.5 w-28 rounded-full bg-muted"><div className={cn("h-full rounded-full", item.stock <= 10 ? "bg-amber-500" : "bg-emerald-600")} style={{ width: `${Math.min(100, item.stock / 40 * 100)}%` }} /></div><span className="mt-1 block text-[9px] text-muted-foreground">{item.stock <= 10 ? "Reorder soon" : "In stock"}</span></td>
                  <td className="px-3"><button type="button" onClick={() => setAdjustingItem(item)} className="h-7 rounded border border-input px-2.5 text-[10px] font-medium hover:bg-accent">Adjust</button></td>
                </tr>
              ))}
              {filteredItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">No stock items match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <section aria-label="Recent stock adjustments" className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2"><h2 className="text-xs font-semibold">Recent adjustments</h2><span className="text-[9px] text-muted-foreground">Saved in this browser</span></div>
          {adjustments.length ? <div className="divide-y divide-border">{adjustments.slice(0, 5).map((adjustment) => <div key={adjustment.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[10px]"><span className="font-medium">{adjustment.itemName}</span><span className="text-muted-foreground">{adjustment.from} → {adjustment.to} · {adjustment.reason}</span><time className="text-muted-foreground">{adjustment.date}</time></div>)}</div> : <p className="px-3 py-3 text-[10px] text-muted-foreground">No stock adjustments recorded in this browser.</p>}
        </section>
        {feedback && <p role="status" className="text-[10px] text-muted-foreground">{feedback}</p>}
      </main>
      {adjustingItem && <StockAdjustmentDialog item={adjustingItem} onClose={() => setAdjustingItem(null)} onSave={adjustItem} />}
    </div>
  )
}

function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="flex min-w-0 items-center gap-2 px-3 py-2"><span className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">{icon}</span><span className="min-w-0"><span className="block text-[10px] text-muted-foreground">{label}</span><span className="text-sm font-semibold tabular-nums">{value}</span></span></div>
}

function PackageIcon() {
  return <Boxes className="size-3.5" />
}

function StockAdjustmentDialog({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (itemId: string, quantity: number, reason: string) => void }) {
  const [quantity, setQuantity] = React.useState(String(item.stock))
  const [reason, setReason] = React.useState("Count correction")
  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="stock-adjust-title" className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4"><div><h2 id="stock-adjust-title" className="text-sm font-semibold">Adjust stock</h2><p className="mt-1 text-[10px] text-muted-foreground">{item.name} · {item.code}</p></div><button type="button" onClick={onClose} aria-label="Close adjustment" className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-4" /></button></header>
        <form className="space-y-3 p-4" onSubmit={(event) => { event.preventDefault(); onSave(item.id, Number(quantity), reason) }}>
          <label className="block space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">On-hand quantity</span><input aria-label="On-hand quantity" type="number" min="0" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          <label className="block space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Adjustment reason</span><select aria-label="Adjustment reason" value={reason} onChange={(event) => setReason(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs"><option>Count correction</option><option>Receipt</option><option>Return</option><option>Damage</option><option>Other</option></select></label>
          <footer className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save adjustment</button></footer>
        </form>
      </section>
    </div>
  )
}
