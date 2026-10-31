import * as React from "react"
import { Plus, RefreshCw, X } from "lucide-react"

type Material = {
  id: string
  name: string
  code: string
  category: string
  quantity: number
  color: string
}

const initialMaterials: Material[] = [
  { id: "MAT-3107", name: "Linen Weave Fabric, Sand", code: "BAG-3107", category: "Fabric", quantity: 24, color: "#cdb993" },
  { id: "MAT-3102", name: "Oak Laminate, Natural", code: "BAG-3102", category: "Laminate", quantity: 18, color: "#c8a06e" },
  { id: "MAT-3110", name: "Calacatta Oro Marble", code: "BAG-3110", category: "Stone", quantity: 6, color: "#e6e2d5" },
  { id: "MAT-3101", name: "Brushed Brass Handle", code: "BAG-3101", category: "Hardware", quantity: 40, color: "#b18d35" },
  { id: "MAT-3105", name: "Walnut Veneer Plank", code: "BAG-3105", category: "Veneer", quantity: 12, color: "#6e4c36" },
  { id: "MAT-3108", name: "Terrazzo Tile, Mint", code: "BAG-3108", category: "Tile", quantity: 9, color: "#a9c5b2" },
  { id: "MAT-3111", name: "Stone Cladding", code: "BAG-3111", category: "Stone", quantity: 15, color: "#a09a8e" },
  { id: "MAT-3112", name: "Fluted Glass Panel", code: "BAG-3112", category: "Glass", quantity: 7, color: "#b9d1d2" },
  { id: "MAT-3113", name: "Engineered Wood Plank", code: "BAG-3113", category: "Wood", quantity: 30, color: "#b98e5d" },
  { id: "MAT-3114", name: "Ceramic Mosaic", code: "BAG-3114", category: "Tile", quantity: 21, color: "#84a9c0" },
  { id: "MAT-3115", name: "Concrete Finish, Ash", code: "BAG-3115", category: "Surface", quantity: 14, color: "#d8d1c5" },
  { id: "MAT-3116", name: "Matte Porcelain, Graphite", code: "BAG-3116", category: "Tile", quantity: 22, color: "#4e4e4e" },
  { id: "MAT-3117", name: "Acoustic Felt, Charcoal", code: "BAG-3117", category: "Fabric", quantity: 8, color: "#8b8b8b" },
  { id: "MAT-3118", name: "Paint Finish, Cloud", code: "BAG-3118", category: "Paint", quantity: 32, color: "#ededed" },
  { id: "MAT-3119", name: "Quartz Slab, Ivory", code: "BAG-3119", category: "Stone", quantity: 11, color: "#ece7d9" },
]

const categories = ["Fabric", "Glass", "Hardware", "Laminate", "Paint", "Stone", "Surface", "Tile", "Veneer", "Wood"]

export function MaterialInformationPage() {
  const [materials, setMaterials] = React.useState(initialMaterials)
  const [isAddingMaterial, setIsAddingMaterial] = React.useState(false)

  const addMaterial = (material: Omit<Material, "id">) => {
    setMaterials((current) => [{ ...material, id: `MAT-${Date.now()}` }, ...current])
    setIsAddingMaterial(false)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 sm:p-5 lg:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight">Material information</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMaterials(initialMaterials)}
              aria-label="Refresh sample materials"
              title="Refresh sample materials"
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingMaterial(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#f45a1e] px-3 text-sm font-medium text-white transition-colors hover:bg-[#df4c13]"
            >
              <Plus className="size-4" />
              New material
            </button>
          </div>
        </header>

        <section aria-label="Materials" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {materials.map((material) => (
            <article
              key={material.id}
              tabIndex={0}
              aria-label={`${material.name} material details`}
              className="group relative rounded-md border border-border bg-card transition-shadow duration-300 ease-in-out hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <div className="relative z-10 h-24 w-full">
                <div
                  className="h-full w-full rounded-t-[5px] border-b border-black/5 transition-[transform,box-shadow] duration-300 ease-in-out group-hover:-translate-y-1 group-hover:shadow-md group-focus-visible:-translate-y-1 group-focus-visible:shadow-md motion-reduce:transition-none"
                  style={{ backgroundColor: material.color }}
                  role="img"
                  aria-label={`${material.name} color swatch`}
                />
              </div>
              <div className="min-w-0 p-3">
                <h2 className="truncate text-sm font-medium" title={material.name}>{material.name}</h2>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm text-muted-foreground">{material.code}</p>
                  <span className="shrink-0 rounded-full border border-transparent px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-300 ease-in-out group-hover:border-border group-hover:bg-muted group-hover:text-foreground group-hover:shadow-sm group-focus-visible:border-border group-focus-visible:bg-muted group-focus-visible:text-foreground group-focus-visible:shadow-sm motion-reduce:transition-none">
                    {material.category}
                  </span>
                </div>
                <p className="mt-1 text-sm tabular-nums" aria-label={`${material.quantity} in stock`}>
                  {material.quantity}
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>

      {isAddingMaterial && (
        <MaterialForm onClose={() => setIsAddingMaterial(false)} onSave={addMaterial} />
      )}
    </div>
  )
}

function MaterialForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (material: Omit<Material, "id">) => void
}) {
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [category, setCategory] = React.useState(categories[0])
  const [quantity, setQuantity] = React.useState("0")
  const [color, setColor] = React.useState("#cdb993")

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="material-form-title" className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4">
          <div>
            <h2 id="material-form-title" className="text-base font-semibold">New material</h2>
            <p className="mt-1 text-xs text-muted-foreground">Add a material sample to the catalog.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>
        <form
          className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({ name: name.trim(), code: code.trim(), category, quantity: Number(quantity), color })
          }}
        >
          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-xs font-medium">Material name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium">Item code</span>
            <input required value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium">Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium">Quantity</span>
            <input type="number" min="0" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <label className="flex items-center gap-3 self-end text-xs font-medium">
            <span>Swatch color</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Swatch color" className="size-9 cursor-pointer rounded border border-input bg-background p-1" />
          </label>
          <footer className="flex justify-end gap-2 border-t border-border pt-3 sm:col-span-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent">Cancel</button>
            <button type="submit" disabled={!name.trim() || !code.trim()} className="h-9 rounded-md bg-[#f45a1e] px-3 text-sm font-medium text-white transition-colors hover:bg-[#df4c13] disabled:pointer-events-none disabled:opacity-50">Add material</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
