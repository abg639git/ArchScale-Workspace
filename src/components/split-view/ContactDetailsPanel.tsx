import * as React from "react"
import {
  ArrowLeft,
  Copy,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials, statusLabel, type DirectoryEntry } from "./data"

type ContactTab = "Details" | "Organisation" | "Projects" | "Relationships" | "Activity"

interface ContactDetailsPanelProps {
  entry: DirectoryEntry
  isStarred: boolean
  onToggleStar: (id: string) => void
  onClose: () => void
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ContactDetailsPanel({
  entry,
  isStarred,
  onToggleStar,
  onClose,
  onBack,
  onEdit,
  onDelete,
}: ContactDetailsPanelProps) {
  const [activeTab, setActiveTab] = React.useState<ContactTab>("Details")
  const [copyFeedback, setCopyFeedback] = React.useState("")
  const roleParts = entry.role.split(" · ")
  const organisation =
    entry.related.find((item) => item.label.toLowerCase() === "organisation")?.value ??
    (entry.type === "person" ? roleParts.at(-1) : entry.name) ??
    "—"
  const title = entry.type === "person" ? roleParts[0] ?? entry.role : entry.role
  const alternate =
    entry.related.find((item) => item.label.toLowerCase() === "alternate")?.value ?? "—"
  const projectCount = Number(
    entry.related.find((item) => item.label.toLowerCase() === "projects")?.value ?? 0
  )
  const details = [
    { label: "Organisation", value: organisation },
    { label: "Work email", value: entry.email, canCopy: true },
    { label: "Mobile", value: entry.phone, canCopy: true },
    { label: "Alternate", value: alternate },
    { label: "Location", value: entry.city },
  ]

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyFeedback(`${label} copied`)
    } catch (error) {
      setCopyFeedback("Clipboard access is unavailable in this browser context.")
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="surface-sheen flex h-[50px] shrink-0 items-center justify-between gap-1 border-b border-border bg-muted/40 px-2 sm:px-4">
        <h2 className="truncate text-sm font-medium text-muted-foreground">Contact Details</h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onToggleStar(entry.id)}
            aria-label={isStarred ? "Remove from starred" : "Add to starred"}
            className="shell-interaction flex size-8 items-center justify-center rounded-md text-amber-500 transition-colors hover:bg-accent"
          >
            <Star className={cn("size-4", isStarred && "fill-current")} />
          </button>
          <button type="button" onClick={onEdit} aria-label="Edit contact" className="shell-interaction hidden size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent sm:flex">
            <Pencil className="size-4" />
          </button>
          <a href={`mailto:${entry.email}`} aria-label="Email contact" className="shell-interaction flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
            <Mail className="size-4" />
          </a>
          <a href={`tel:${entry.phone.replace(/\s+/g, "")}`} aria-label="Call contact" className="shell-interaction hidden size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent sm:flex">
            <MessageCircle className="size-4" />
          </a>
          <button type="button" onClick={onDelete} aria-label="Delete contact" className="shell-interaction hidden size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:flex">
            <Trash2 className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More contact actions" className="shell-interaction flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}><Pencil className="size-3.5" />Edit contact</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyValue(entry.email, "Email")} disabled={!entry.email}><Copy className="size-3.5" />Copy email</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" />Delete contact</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact details"
            className="shell-interaction flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 xl:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to contacts"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
          >
            <ArrowLeft className="size-4" />
          </button>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-semibold text-primary">
            {getInitials(entry.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{entry.name}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {title}{organisation !== "—" ? ` at ${organisation}` : ""}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
            <span className="max-w-24 truncate rounded bg-primary/10 px-2 py-1 text-[11px] font-medium uppercase text-primary">
              <span className="mr-1 text-[9px]">●</span>
              {entry.tags[0] === "Client" ? "Client" : entry.tags[0] ?? "Contact"}
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-medium uppercase text-emerald-700">
              {statusLabel[entry.status]}
            </span>
            {entry.tags[1] && (
              <span className="rounded bg-amber-500/15 px-2 py-1 text-[11px] font-medium uppercase text-amber-700">
                {entry.tags[1]}
              </span>
            )}
          </div>
        </div>

        <nav aria-label="Contact details sections" className="mt-6 grid min-w-0 grid-cols-3 border-b border-border xl:grid-cols-5">
          {(["Details", "Organisation", "Projects", "Relationships", "Activity"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={cn(
                "shell-interaction flex h-10 min-w-0 items-center justify-center gap-1 border-b-2 px-1 text-[11px] transition-colors sm:gap-1.5 sm:text-xs xl:text-sm",
                activeTab === tab
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{tab}</span>
              {tab === "Projects" && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {projectCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {activeTab === "Details" && (
          <dl className="mt-3 min-w-0">
            {details.map(({ label, value, canCopy }) => (
              <div
                key={label}
                className="grid min-h-[58px] min-w-0 grid-cols-[minmax(84px,28%)_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-1 sm:gap-3"
              >
                <dt className="truncate text-sm text-primary">{label}</dt>
                <dd className="min-w-0 truncate text-sm" title={value}>{value || "—"}</dd>
                {canCopy && value && value !== "—" ? (
                  <button
                    type="button"
                    onClick={() => void copyValue(value, label)}
                    aria-label={`Copy ${label.toLowerCase()}`}
                    className="shell-interaction flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent sm:size-9"
                  >
                    <Copy className="size-4" />
                  </button>
                ) : <span className="size-8 sm:size-9" />}
              </div>
            ))}
          </dl>
        )}

        {activeTab === "Organisation" && (
          <dl className="mt-3">
            <div className="grid min-h-[58px] grid-cols-[minmax(84px,28%)_minmax(0,1fr)] items-center gap-3 border-b border-border px-1">
              <dt className="text-sm text-primary">Organisation</dt>
              <dd className="truncate text-sm">{organisation}</dd>
            </div>
            <div className="grid min-h-[58px] grid-cols-[minmax(84px,28%)_minmax(0,1fr)] items-center gap-3 border-b border-border px-1">
              <dt className="text-sm text-primary">Position</dt>
              <dd className="truncate text-sm">{title}</dd>
            </div>
          </dl>
        )}
        {activeTab === "Projects" && (
          <p className="py-8 text-center text-sm text-muted-foreground">No projects linked to this contact.</p>
        )}
        {activeTab === "Relationships" && (
          <div className="mt-3 divide-y divide-border">
            {entry.stakeholders.length
              ? entry.stakeholders.map((person) => (
                  <div key={person.email} className="py-3">
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.role}</p>
                  </div>
                ))
              : <p className="py-8 text-center text-sm text-muted-foreground">No relationships available.</p>}
          </div>
        )}
        {activeTab === "Activity" && (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
        )}
        {copyFeedback && <p role="status" className="mt-3 text-xs text-muted-foreground">{copyFeedback}</p>}
      </div>
    </section>
  )
}
