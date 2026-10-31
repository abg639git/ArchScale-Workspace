import * as React from "react"
import {
  Building2,
  ContactRound,
  Folder,
  GripVertical,
  RefreshCw,
  Search,
  Send,
  Star,
  UsersRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ContactDetailsPanel } from "./ContactDetailsPanel"
import DirectoryList from "./DirectoryList"
import { directoryData, type DirectoryEntry } from "./data"

type BrowseFilter =
  | "contacts"
  | "organizations"
  | "projects"
  | "frequent"
  | "starred"
  | "client"
  | "studio"
  | "vendors"
  | "partner"
  | "teams"

const browseSections: { label: string; items: { id: BrowseFilter; label: string; icon: typeof ContactRound }[] }[] = [
  {
    label: "",
    items: [
      { id: "contacts", label: "Contacts", icon: UsersRound },
      { id: "organizations", label: "Organisations", icon: Building2 },
      { id: "projects", label: "Projects", icon: Folder },
    ],
  },
  {
    label: "",
    items: [
      { id: "frequent", label: "Frequent", icon: Send },
      { id: "starred", label: "Starred", icon: Star },
    ],
  },
  {
    label: "",
    items: [
      { id: "client", label: "Client", icon: ContactRound },
      { id: "studio", label: "Studio", icon: ContactRound },
      { id: "vendors", label: "Vendors", icon: Building2 },
      { id: "partner", label: "Partner", icon: ContactRound },
      { id: "teams", label: "Teams", icon: UsersRound },
    ],
  },
]

function matchesBrowseFilter(
  entry: DirectoryEntry,
  filter: BrowseFilter,
  starredIds: string[]
) {
  const searchable = `${entry.role} ${entry.tags.join(" ")}`.toLowerCase()

  switch (filter) {
    case "contacts":
      return entry.type === "person"
    case "organizations":
      return entry.type === "organization"
    case "projects":
      return searchable.includes("project")
    case "frequent":
      return entry.status === "active"
    case "starred":
      return starredIds.includes(entry.id)
    case "client":
      return searchable.includes("client")
    case "studio":
      return searchable.includes("studio") || searchable.includes("design")
    case "vendors":
      return searchable.includes("vendor")
    case "partner":
      return searchable.includes("partner")
    case "teams":
      return searchable.includes("internal") || searchable.includes("team")
  }
}

interface DirectorySplitViewProps {
  title?: string
}

export function DirectorySplitView({ title = "Contacts" }: DirectorySplitViewProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [browseFilter, setBrowseFilter] = React.useState<BrowseFilter>("contacts")
  const [query, setQuery] = React.useState("")
  const [starredIds, setStarredIds] = React.useState<string[]>(["karan-mehra"])
  const [mobileView, setMobileView] = React.useState<"list" | "detail">("list")
  const [listRatio, setListRatio] = React.useState(0.4)
  const [isResizing, setIsResizing] = React.useState(false)
  const splitViewRef = React.useRef<HTMLDivElement>(null)
  const browsePanelRef = React.useRef<HTMLElement>(null)
  const listPanelRef = React.useRef<HTMLDivElement>(null)
  const isResizingRef = React.useRef(false)

  const visibleEntries = React.useMemo(
    () => directoryData.filter((entry) => matchesBrowseFilter(entry, browseFilter, starredIds)),
    [browseFilter, starredIds]
  )
  const selected = selectedId
    ? directoryData.find((entry) => entry.id === selectedId)
    : undefined

  const closeDetails = () => {
    setSelectedId(null)
    setMobileView("list")
  }

  const selectContact = (id: string) => {
    setSelectedId(id)
    setMobileView("detail")
  }

  const toggleStar = (id: string) => {
    setStarredIds((current) =>
      current.includes(id) ? current.filter((starredId) => starredId !== id) : [...current, id]
    )
  }

  const startResizing = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    isResizingRef.current = true
    setIsResizing(true)
  }

  const resizePanels = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current || !splitViewRef.current || !listPanelRef.current) return

    const browseWidth = browsePanelRef.current?.getBoundingClientRect().width ?? 200
    const availableWidth = splitViewRef.current.clientWidth - browseWidth - 8
    if (availableWidth <= 0) return
    const listStart = listPanelRef.current.getBoundingClientRect().left
    const nextRatio = (event.clientX - listStart) / availableWidth
    setListRatio(Math.min(0.72, Math.max(0.25, nextRatio)))
  }

  const stopResizing = () => {
    isResizingRef.current = false
    setIsResizing(false)
  }

  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.04
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const direction = event.key === "ArrowRight" ? 1 : -1
      setListRatio((ratio) => Math.min(0.72, Math.max(0.25, ratio + direction * step)))
    } else if (event.key === "Home") {
      event.preventDefault()
      setListRatio(0.25)
    } else if (event.key === "End") {
      event.preventDefault()
      setListRatio(0.72)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-background p-3 sm:p-5">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial">
          <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Contacts"
              aria-label="Search contacts"
              className="shell-interaction h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <button
            type="button"
            className="shell-interaction h-9 shrink-0 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Add New Contact
          </button>
          <button
            type="button"
            aria-label="Reset contact filters"
            onClick={() => {
              setQuery("")
              setBrowseFilter("contacts")
              closeDetails()
            }}
            className="shell-interaction flex size-9 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </header>

      <div
        ref={splitViewRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border lg:grid",
          !isResizing && "transition-[grid-template-columns] duration-300 ease-in-out motion-reduce:transition-none"
        )}
        style={{
          gridTemplateColumns: selected
            ? `200px minmax(0, ${Math.round(listRatio * 100)}fr) 8px minmax(0, ${100 - Math.round(listRatio * 100)}fr)`
            : "200px minmax(0, 100fr) 0px minmax(0, 0fr)",
        }}
      >
        <aside
          ref={browsePanelRef}
          className={cn(
          "shrink-0 border-b border-border bg-background lg:w-[200px] lg:border-b-0 lg:border-r",
          mobileView === "detail" && "hidden lg:block"
        )}>
          <div className="surface-sheen border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">
            Browse by
          </div>
          <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0">
            {browseSections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                className={cn(
                  "flex shrink-0 gap-1 lg:flex-col",
                  sectionIndex > 0 && "lg:mt-3 lg:border-t lg:border-border lg:pt-3"
                )}
              >
                {section.items.map(({ id, label, icon: Icon }) => {
                  const count = directoryData.filter((entry) =>
                    matchesBrowseFilter(entry, id, starredIds)
                  ).length
                  const isActive = browseFilter === id

                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => {
                        setBrowseFilter(id)
                        closeDetails()
                      }}
                      className={cn(
                        "shell-interaction flex h-9 items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors lg:w-full",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="whitespace-nowrap">{label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        <div
          ref={listPanelRef}
          className={cn(
          "flex min-h-0 min-w-0 flex-1 lg:flex-none",
          mobileView === "detail" ? "hidden lg:flex" : "flex"
        )}>
          <DirectoryList
            entries={visibleEntries}
            selectedId={selectedId}
            compact={Boolean(selected)}
            onSelect={selectContact}
            query={query}
            starredIds={starredIds}
            onToggleStar={toggleStar}
          />
        </div>

        <div
          role="separator"
          aria-label="Resize contact list and details"
          aria-orientation="vertical"
          aria-valuemin={25}
          aria-valuemax={72}
          aria-valuenow={Math.round(listRatio * 100)}
          aria-valuetext={`${Math.round(listRatio * 100)}% contact list`}
          tabIndex={selected ? 0 : -1}
          onPointerDown={startResizing}
          onPointerMove={resizePanels}
          onPointerUp={stopResizing}
          onPointerCancel={stopResizing}
          onLostPointerCapture={stopResizing}
          onKeyDown={resizeWithKeyboard}
          className={cn(
            "group relative hidden w-2 cursor-col-resize touch-none select-none items-center justify-center outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 lg:flex",
            !selected && "lg:hidden"
          )}
        >
          <GripVertical className="size-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary" />
        </div>

        {selected && (
          <section key={selected.id} className={cn(
            "flex min-h-0 min-w-0 flex-1 animate-contact-detail-enter border-t border-border lg:border-l lg:border-t-0 motion-reduce:animate-none",
            mobileView === "detail" ? "flex" : "hidden lg:flex"
          )}>
            <ContactDetailsPanel
              key={selected.id}
              entry={selected}
              isStarred={starredIds.includes(selected.id)}
              onToggleStar={toggleStar}
              onBack={() => setMobileView("list")}
              onClose={closeDetails}
            />
          </section>
        )}
      </div>
    </div>
  )
}

export default DirectorySplitView
