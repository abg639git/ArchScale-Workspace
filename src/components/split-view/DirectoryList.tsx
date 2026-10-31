import * as React from "react"
import { Building2, Search, Star, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getInitials,
  statusLabel,
  type DirectoryEntry,
  type DirectoryStatus,
} from "./data"

const statusDot: Record<DirectoryStatus, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  inactive: "bg-muted-foreground/50",
}

interface DirectoryListProps {
  entries: DirectoryEntry[]
  selectedId: string | null
  compact?: boolean
  onSelect: (id: string) => void
  query: string
  starredIds: string[]
  onToggleStar: (id: string) => void
}

export const DirectoryList: React.FC<DirectoryListProps> = ({
  entries,
  selectedId,
  compact = false,
  onSelect,
  query,
  starredIds,
  onToggleStar,
}) => {
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!q) return true
      return [entry.name, entry.role, entry.city, entry.email, entry.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [entries, query])

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <div className="surface-sheen shrink-0 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight">Contacts</h2>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {filtered.length}/{entries.length}
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <Search className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">No matches found</p>
            <p className="text-xs text-muted-foreground">
              Try a different name, city or tag.
            </p>
          </div>
        ) : (
          <ul className="flex min-w-0 flex-col">
            {filtered.map((entry) => {
              const isActive = entry.id === selectedId
              const TypeIcon = entry.type === "organization" ? Building2 : UserRound
              const isStarred = starredIds.includes(entry.id)
              const organization = entry.role.split(" · ").at(-1)

              return (
                <li key={entry.id}>
                  <div
                    className={cn(
                      "shell-interaction group relative flex min-h-14 items-center border-b border-transparent px-3 transition-colors duration-150",
                      isActive ? "border-primary/15 bg-primary/10" : "hover:bg-accent/60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(entry.id)}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`View ${entry.name}`}
                      className="absolute inset-0 z-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                    />
                    <div className={cn(
                      "pointer-events-none relative z-10 grid min-w-0 flex-1 items-center gap-2 sm:gap-3",
                      compact
                        ? "grid-cols-[20px_32px_minmax(0,1fr)_auto]"
                        : "grid-cols-[20px_32px_minmax(0,1.3fr)_auto_minmax(0,0.9fr)_auto]"
                    )}>
                    <span className="flex size-5 items-center justify-center rounded border border-input" />
                    <span
                      className={cn(
                        "relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-foreground/80"
                      )}
                    >
                      {getInitials(entry.name)}
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                        statusDot[entry.status]
                      )} />
                    </span>

                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-medium", isActive && "text-primary")}>{entry.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{entry.role.split(" · ")[0]}</span>
                    </span>
                    {!compact && (
                      <>
                        <span className="hidden rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary sm:inline">
                          {entry.type === "organization" ? "ORG" : "ALL"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-muted-foreground">{organization === entry.role ? entry.city : organization}</span>
                          <span className="flex min-w-0 items-center gap-1">
                            <TypeIcon className="size-3 shrink-0 text-muted-foreground" />
                            {entry.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="truncate text-[10px] text-muted-foreground">{tag}</span>
                            ))}
                          </span>
                        </span>
                      </>
                    )}
                    <span className="max-w-20 truncate rounded bg-emerald-500/10 px-1.5 py-1 text-[10px] font-semibold text-emerald-700 sm:px-2 sm:text-[11px]">
                      {entry.status === "active" ? "ACTIVE" : statusLabel[entry.status].toUpperCase()}
                    </span>
                    </div>

                    {!compact && <button
                      type="button"
                      aria-label={isStarred ? `Unstar ${entry.name}` : `Star ${entry.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleStar(entry.id)
                      }}
                      className="relative z-20 flex size-8 shrink-0 items-center justify-center rounded hover:bg-background"
                    >
                      <Star className={cn("size-4", isStarred ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                    </button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default DirectoryList
