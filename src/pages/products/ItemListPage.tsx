import * as React from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { Check, LayoutGrid, List, Minus, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShoppingBag, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { categories, initialItems, type InventoryItem, type ItemCategory } from "./inventory-data"

type DrawerItem = { itemId: string; quantity: number }

const itemControlClass = "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"

export function ItemListPage() {
  const [items, setItems] = usePersistentState("archscale.inventory.items", initialItems)
  const [search, setSearch] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState<ItemCategory | "All">("All")
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [drawerItems, setDrawerItems] = React.useState<DrawerItem[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null)
  const [deletingItem, setDeletingItem] = React.useState<InventoryItem | null>(null)
  const [itemError, setItemError] = React.useState("")
  const [feedback, setFeedback] = React.useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory
    const matchesSearch = !normalizedSearch ||
      `${item.name} ${item.code} ${item.finish} ${item.size}`.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
  const drawerCount = drawerItems.reduce((sum, item) => sum + item.quantity, 0)

  const toggleDrawerItem = (itemId: string) => {
    setDrawerItems((current) => current.some((item) => item.itemId === itemId)
      ? current.filter((item) => item.itemId !== itemId)
      : [...current, { itemId, quantity: 1 }])
  }

  const changeDrawerQuantity = (itemId: string, delta: number) => {
    setDrawerItems((current) => current.flatMap((item) => {
      if (item.itemId !== itemId) return [item]
      const quantity = item.quantity + delta
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  const saveItem = (item: Omit<InventoryItem, "id">) => {
    const code = item.code.trim().toUpperCase()
    const id = editingItem?.id ?? code
    if (items.some((existing) => existing.id !== id && existing.code.toUpperCase() === code)) {
      setItemError(`Item code ${code} already exists.`)
      return
    }
    setItems((current) => editingItem
      ? current.map((existing) => existing.id === editingItem.id ? { ...item, id, code } : existing)
      : [{ ...item, id, code }, ...current])
    setActiveCategory("All")
    setSearch("")
    setIsCreating(false)
    setEditingItem(null)
    setItemError("")
  }

  const confirmDeleteItem = () => {
    if (!deletingItem) return
    setItems((current) => current.filter((item) => item.id !== deletingItem.id))
    setDrawerItems((current) => current.filter((item) => item.itemId !== deletingItem.id))
    setFeedback(`${deletingItem.name} removed from this browser.`)
    setDeletingItem(null)
  }

  const refreshItems = () => {
    try {
      const saved = window.localStorage.getItem("archscale.inventory.items")
      if (saved !== null) setItems(JSON.parse(saved) as InventoryItem[])
      setFeedback("Inventory reloaded from this browser.")
    } catch {
      setFeedback("Saved inventory could not be read; current session data remains available.")
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 p-3 sm:p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-medium tracking-tight sm:text-2xl">Item list</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={refreshItems} aria-label="Refresh items" title="Refresh saved items" className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent">
              <RefreshCw className="size-3.5" />
            </button>
            <button type="button" onClick={() => setIsCreating(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f45a1e] px-3 text-xs font-medium text-white transition-colors hover:bg-[#df4c13]">
              <Plus className="size-3.5" />New item
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, code, finish or size" className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <button type="button" onClick={() => setIsDrawerOpen(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-accent">
            <ShoppingBag className="size-3.5" />Pick in drawer{drawerCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">{drawerCount}</span>}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Item categories" className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5">
            <CategoryPill label="All" count={items.length} active={activeCategory === "All"} onClick={() => setActiveCategory("All")} />
            {categories.map((category) => (
              <CategoryPill key={category} label={category} count={items.filter((item) => item.category === category).length} active={activeCategory === category} onClick={() => setActiveCategory(category)} />
            ))}
          </nav>
          <div role="group" aria-label="Item view" className="inline-flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5">
            <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Grid view" className={cn("inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors", view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-3" />Grid
            </button>
            <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view" className={cn("inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors", view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-3" />List
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">{filteredItems.length} of {items.length} items</p>

        {view === "grid" ? (
          <section aria-label="Inventory items" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                isAdded={drawerItems.some((selected) => selected.itemId === item.id)}
                onToggleAdd={() => toggleDrawerItem(item.id)}
                onEdit={() => { setEditingItem(item); setItemError("") }}
                onDelete={() => setDeletingItem(item)}
              />
            ))}
            {filteredItems.length === 0 && <EmptyItems />}
          </section>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead className="bg-slate-800 text-white">
                <tr className="h-8 text-left text-[9px] uppercase tracking-wide text-white/80">
                  <th className="px-2.5">Item</th><th className="px-2.5">Code</th><th className="px-2.5">Category</th><th className="px-2.5">Finish</th><th className="px-2.5">Size</th><th className="px-2.5">Stock</th><th className="px-2.5">Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isAdded = drawerItems.some((selected) => selected.itemId === item.id)
                  return (
                    <tr key={item.id} className="h-12 hover:bg-muted/30">
                      <td className="px-2.5"><span className="flex items-center gap-2"><span className="size-7 shrink-0 rounded-sm border border-border" style={{ backgroundColor: item.color }} />{item.name}</span></td>
                      <td className="px-2.5 text-muted-foreground">{item.code}</td><td className="px-2.5">{item.category}</td><td className="px-2.5">{item.finish}</td><td className="px-2.5">{item.size}</td>
                      <td className="px-2.5"><StockBadge stock={item.stock} /></td>
                      <td className="px-2.5"><button type="button" onClick={() => toggleDrawerItem(item.id)} className={cn("h-7 rounded border px-2 text-[10px] font-medium transition-colors", isAdded ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-input hover:bg-accent")}>{isAdded ? <><Check className="mr-1 inline size-3" />Added</> : "Add"}</button></td>
                    </tr>
                  )
                })}
                {filteredItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No items match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[9px] text-muted-foreground">Demo inventory · Changes are saved in this browser.</p>
        {feedback && <p role="status" className="text-[10px] text-muted-foreground">{feedback}</p>}
      </main>

      {(isCreating || editingItem) && <NewItemDialog key={editingItem?.id ?? "new-item"} item={editingItem} error={itemError} onClose={() => { setIsCreating(false); setEditingItem(null); setItemError("") }} onSave={saveItem} />}
      {isDrawerOpen && <SelectionDrawer items={items} selected={drawerItems} onQuantityChange={changeDrawerQuantity} onRemove={toggleDrawerItem} onClose={() => setIsDrawerOpen(false)} />}
      {deletingItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeletingItem(null) }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-item-title" className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-2xl"><h2 id="delete-item-title" className="text-sm font-semibold">Delete item?</h2><p className="mt-1 text-xs text-muted-foreground">{deletingItem.name} will be removed from this browser’s inventory.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeletingItem(null)} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="button" onClick={confirmDeleteItem} className="h-8 rounded bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">Delete item</button></div></section></div>}
    </div>
  )
}

function CategoryPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] transition-colors", active ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-background text-foreground hover:bg-muted")}>
      {label}<span className={cn("text-[9px] tabular-nums", active ? "text-white/70" : "text-muted-foreground")}>{count}</span>
    </button>
  )
}

function StockBadge({ stock }: { stock: number }) {
  return <span className={cn("inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums", stock <= 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>{stock}</span>
}

function InventoryCard({ item, isAdded, onToggleAdd, onEdit, onDelete }: { item: InventoryItem; isAdded: boolean; onToggleAdd: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="group relative flex min-w-0 flex-col rounded-md border border-[#d9d2c8] bg-card p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" aria-label={`Actions for ${item.name}`} className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={onEdit}><Pencil className="size-3.5" />Edit item</DropdownMenuItem><DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" />Delete item</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
      <div role="img" aria-label={`${item.name} material colour`} className="aspect-[1.45/1] w-full rounded-sm border border-black/5" style={{ backgroundColor: item.color }} />
      <div className="flex min-w-0 flex-1 flex-col px-0.5 pt-2">
        <h2 className="truncate text-xs font-semibold" title={item.name}>{item.name}</h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{item.code}</p>
        <div className="mt-2 space-y-1 text-[10px] leading-4">
          <p className="truncate">{item.category}</p>
          <p className="truncate text-muted-foreground">{item.finish}</p>
          <p className="truncate text-muted-foreground">{item.size}</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex items-center gap-1">
            <StockBadge stock={item.stock} />
            {item.isSample && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-800">SAMPLE</span>}
          </div>
          <button type="button" onClick={onToggleAdd} aria-pressed={isAdded} className={cn("inline-flex h-7 min-w-12 items-center justify-center gap-1 rounded border px-2 text-[10px] font-medium transition-colors", isAdded ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-[#cfc7bc] bg-background text-foreground hover:bg-muted")}>
            {isAdded ? <><Check className="size-3" />Added</> : "Add"}
          </button>
        </div>
      </div>
    </article>
  )
}

function EmptyItems() {
  return <div className="col-span-full rounded-md border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">No items match your search or category.</div>
}

function NewItemDialog({ item, onClose, onSave, error }: { item: InventoryItem | null; onClose: () => void; onSave: (item: Omit<InventoryItem, "id">) => void; error: string }) {
  const [name, setName] = React.useState(item?.name ?? "")
  const [code, setCode] = React.useState(item?.code ?? "")
  const [category, setCategory] = React.useState<ItemCategory>(item?.category ?? categories[0])
  const [finish, setFinish] = React.useState(item?.finish ?? "")
  const [size, setSize] = React.useState(item?.size ?? "")
  const [stock, setStock] = React.useState(String(item?.stock ?? 0))
  const [color, setColor] = React.useState(item?.color ?? "#d8c6b0")
  const [isSample, setIsSample] = React.useState(item?.isSample ?? true)

  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="new-item-title" className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">
        <header className="relative flex h-11 shrink-0 items-center justify-center border-b border-border px-12">
          <h2 id="new-item-title" className="truncate text-center text-xs font-semibold">{item ? `Edit ${name || "item"}` : "New item"}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="absolute left-2 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
          <span className="absolute right-3 text-[9px] text-muted-foreground">{item ? "EDIT ITEM" : "NEW ITEM"}</span>
        </header>
        <form id="new-item-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave({ name: name.trim(), code: code.trim(), category, finish: finish.trim(), size: size.trim(), stock: Math.max(0, Number(stock) || 0), color, isSample }) }}>
          <div className="flex flex-col items-center gap-2">
            <label className="group relative flex size-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border shadow-inner" style={{ backgroundColor: color }} title="Choose swatch color">
              <span className="absolute inset-x-0 bottom-0 h-1/2 border-t border-white/20 bg-gradient-to-b from-transparent to-black/5" />
              <span className="relative rounded bg-foreground/75 px-2 py-1 text-[9px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">Change swatch</span>
              <input aria-label="Swatch color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <label className="w-full max-w-sm">
              <span className="sr-only">Item name</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Item name" className="h-9 w-full border-b border-border bg-transparent text-center text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary" />
            </label>
            <label className="w-full max-w-[220px]">
              <span className="sr-only">Item code</span>
              <input required value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} placeholder="Item code" className="h-7 w-full bg-transparent text-center text-[10px] text-muted-foreground outline-none placeholder:text-muted-foreground focus:text-foreground" />
            </label>
          </div>

          <section aria-label="Initial stock quantity" className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Initial stock</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Decrease stock quantity" onClick={() => setStock(String(Math.max(0, (Number(stock) || 0) - 1)))} className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-40" disabled={Number(stock) <= 0}><Minus className="size-3.5" /></button>
              <input aria-label="Stock quantity" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} className="h-12 w-20 rounded-lg border border-input bg-muted text-center text-xl font-semibold tabular-nums text-foreground outline-none focus:border-primary" />
              <button type="button" aria-label="Increase stock quantity" onClick={() => setStock(String((Number(stock) || 0) + 1))} className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"><Plus className="size-3.5" /></button>
            </div>
            <span className="text-[9px] text-muted-foreground">units</span>
          </section>

          <section aria-label="Item specifications" className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card">
            <label className="min-w-0 px-2 py-2 text-center"><span className="mb-1 block text-[9px] text-muted-foreground">Category</span><select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)} className="h-7 w-full min-w-0 bg-transparent text-center text-[10px] text-foreground outline-none">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="min-w-0 px-2 py-2 text-center"><span className="mb-1 block text-[9px] text-muted-foreground">Finish</span><input value={finish} onChange={(event) => setFinish(event.target.value)} placeholder="—" className="h-7 w-full min-w-0 bg-transparent text-center text-[10px] text-foreground outline-none placeholder:text-muted-foreground" /></label>
            <label className="min-w-0 px-2 py-2 text-center"><span className="mb-1 block text-[9px] text-muted-foreground">Size</span><input value={size} onChange={(event) => setSize(event.target.value)} placeholder="—" className="h-7 w-full min-w-0 bg-transparent text-center text-[10px] text-foreground outline-none placeholder:text-muted-foreground" /></label>
          </section>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-[10px] text-foreground"><span>Sample item</span><input type="checkbox" checked={isSample} onChange={(event) => setIsSample(event.target.checked)} className="size-3.5 accent-primary" /></label>
          {error && <p role="alert" className="rounded bg-destructive/10 px-3 py-2 text-[10px] text-destructive">{error}</p>}
        </form>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-border p-3 sm:px-5">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-input px-3 text-[10px] font-medium text-foreground transition-colors hover:bg-accent">Cancel</button>
          <button type="submit" form="new-item-form" disabled={!name.trim() || !code.trim()} className="h-8 rounded-md bg-[#f45a1e] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#df4c13] disabled:pointer-events-none disabled:opacity-40">{item ? "Save changes" : "Create item"}</button>
        </footer>
      </section>
    </div>
  )
}

function SelectionDrawer({
  items,
  selected,
  onQuantityChange,
  onRemove,
  onClose,
}: {
  items: InventoryItem[]
  selected: DrawerItem[]
  onQuantityChange: (itemId: string, delta: number) => void
  onRemove: (itemId: string) => void
  onClose: () => void
}) {
  const selectedItems = selected.flatMap((selection) => {
    const item = items.find((entry) => entry.id === selection.itemId)
    return item ? [{ ...selection, item }] : []
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4">
          <div><h2 id="drawer-title" className="text-base font-semibold">Pick in drawer</h2><p className="mt-1 text-xs text-muted-foreground">{selectedItems.length} selected items</p></div>
          <button type="button" onClick={onClose} aria-label="Close drawer" className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {selectedItems.map(({ item, quantity }) => (
            <article key={item.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <span className="size-10 shrink-0 rounded-sm border border-border" style={{ backgroundColor: item.color }} />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.code} · {item.category}</p></div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onQuantityChange(item.id, -1)} className="flex size-6 items-center justify-center rounded border border-input hover:bg-accent"><Minus className="size-3" /></button>
                <span className="w-5 text-center text-xs tabular-nums">{quantity}</span>
                <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => onQuantityChange(item.id, 1)} className="flex size-6 items-center justify-center rounded border border-input hover:bg-accent"><Plus className="size-3" /></button>
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)} className="ml-1 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-rose-50 hover:text-rose-700"><Trash2 className="size-3" /></button>
              </div>
            </article>
          ))}
          {selectedItems.length === 0 && <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShoppingBag className="size-5" /><p>No items selected yet.</p><p>Use Add on an item card to build this drawer.</p></div>}
        </div>
        <footer className="flex items-center justify-between border-t border-border p-4">
          <span className="text-xs text-muted-foreground">{selected.reduce((sum, item) => sum + item.quantity, 0)} total units</span>
          <button type="button" onClick={onClose} className="h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700">Done</button>
        </footer>
      </aside>
    </div>
  )
}
