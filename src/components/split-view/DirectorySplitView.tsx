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
  Trash2,
  UsersRound,
  X,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { ContactDetailsPanel } from "./ContactDetailsPanel"
import DirectoryList from "./DirectoryList"
import { directoryData, getInitials, type DirectoryEntry, type DirectoryStatus, type DirectoryType } from "./data"

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
  const [contacts, setContacts] = usePersistentState("archscale.contacts", directoryData)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [browseFilter, setBrowseFilter] = React.useState<BrowseFilter>("contacts")
  const [query, setQuery] = React.useState("")
  const [starredIds, setStarredIds] = usePersistentState("archscale.contacts.starred", ["karan-mehra"])
  const [mobileView, setMobileView] = React.useState<"list" | "detail">("list")
  const [listRatio, setListRatio] = React.useState(0.4)
  const [isResizing, setIsResizing] = React.useState(false)
  const [creatingType, setCreatingType] = React.useState<DirectoryType | null>(null)
  const [editingContact, setEditingContact] = React.useState<DirectoryEntry | null>(null)
  const [deletingContact, setDeletingContact] = React.useState<DirectoryEntry | null>(null)
  const splitViewRef = React.useRef<HTMLDivElement>(null)
  const browsePanelRef = React.useRef<HTMLElement>(null)
  const listPanelRef = React.useRef<HTMLDivElement>(null)
  const isResizingRef = React.useRef(false)

  const visibleEntries = React.useMemo(
    () => contacts.filter((entry) => matchesBrowseFilter(entry, browseFilter, starredIds)),
    [contacts, browseFilter, starredIds]
  )
  const selected = selectedId
    ? contacts.find((entry) => entry.id === selectedId)
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

  const saveContact = (contact: DirectoryEntry) => {
    setContacts((current) => current.some((entry) => entry.id === contact.id)
      ? current.map((entry) => entry.id === contact.id ? contact : entry)
      : [contact, ...current])
    setCreatingType(null)
    setEditingContact(null)
    selectContact(contact.id)
  }

  const confirmDeleteContact = () => {
    if (!deletingContact) return
    setContacts((current) => current.filter((entry) => entry.id !== deletingContact.id))
    setStarredIds((current) => current.filter((id) => id !== deletingContact.id))
    setDeletingContact(null)
    closeDetails()
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
            onClick={() => setCreatingType(browseFilter === "organizations" ? "organization" : "person")}
            className="shell-interaction h-9 shrink-0 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {browseFilter === "organizations" ? "Add New Organisation" : "Add New Contact"}
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
                  const count = contacts.filter((entry) =>
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
              onEdit={() => setEditingContact(selected)}
              onDelete={() => setDeletingContact(selected)}
            />
          </section>
        )}
      </div>

      {(creatingType || editingContact) && (
        <ContactFormDialog
          key={editingContact?.id ?? `new-${creatingType}`}
          contact={editingContact}
          initialType={creatingType ?? "person"}
          onClose={() => {
            setCreatingType(null)
            setEditingContact(null)
          }}
          onSave={saveContact}
        />
      )}

      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeletingContact(null) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-contact-title" className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-2xl">
            <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-rose-50 text-rose-700"><Trash2 className="size-4" /></div>
            <h2 id="delete-contact-title" className="text-sm font-semibold">Delete contact?</h2>
            <p className="mt-1 text-xs text-muted-foreground">{deletingContact.name} will be removed from this browser’s contact list.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingContact(null)} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button>
              <button type="button" onClick={confirmDeleteContact} className="h-8 rounded bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">Delete contact</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ContactFormDialog({
  contact,
  initialType,
  onClose,
  onSave,
}: {
  contact: DirectoryEntry | null
  initialType: DirectoryType
  onClose: () => void
  onSave: (contact: DirectoryEntry) => void
}) {
  const roleParts = contact?.role.split(" · ") ?? []
  const [name, setName] = React.useState(contact?.name ?? "")
  const [type, setType] = React.useState<DirectoryType>(contact?.type ?? initialType)
  const [role, setRole] = React.useState(contact ? (contact.type === "person" ? roleParts[0] ?? "" : contact.role) : "")
  const [organization, setOrganization] = React.useState(contact?.related.find((item) => item.label.toLowerCase() === "organisation")?.value ?? (contact?.type === "person" ? roleParts.at(-1) ?? "" : ""))
  const [email, setEmail] = React.useState(contact?.email ?? "")
  const [phone, setPhone] = React.useState(contact?.phone === "—" ? "" : contact?.phone ?? "")
  const [city, setCity] = React.useState(contact?.city === "—" ? "" : contact?.city ?? "")
  const [status, setStatus] = React.useState<DirectoryStatus>(contact?.status ?? "active")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (type === "person" && !organization.trim()) {
      setError("Enter the person’s organisation.")
      return
    }
    const savedName = name.trim()
    const savedOrganization = type === "organization" ? savedName : organization.trim()
    const savedRole = type === "person" ? `${role.trim() || "Contact"} · ${savedOrganization}` : role.trim() || "Organization"
    const related = (contact?.related ?? []).filter((item) => !["organisation", "location"].includes(item.label.toLowerCase()))
    onSave({
      id: contact?.id ?? `${type}-${Date.now()}`,
      type,
      name: savedName,
      role: savedRole,
      summary: `${savedRole}.`,
      initials: getInitials(savedName),
      status,
      city: city.trim() || "—",
      address: city.trim() ? [city.trim()] : ["—"],
      email: email.trim(),
      phone: phone.trim() || "—",
      website: contact?.website,
      since: contact?.since ?? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date()),
      tags: contact?.tags ?? [type === "person" ? "Client" : "Organization"],
      stakeholders: contact?.stakeholders ?? [],
      related: [
        { label: "Organisation", value: savedOrganization },
        { label: "Location", value: city.trim() || "—" },
        ...related,
      ],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="contact-form-title" className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4">
          <div><h2 id="contact-form-title" className="text-base font-semibold">{contact ? `Edit ${type === "organization" ? "organisation" : "contact"}` : `Add new ${type === "organization" ? "organisation" : "contact"}`}</h2><p className="mt-1 text-xs text-muted-foreground">Changes are saved in this browser.</p></div>
          <button type="button" onClick={onClose} aria-label="Close contact form" className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </header>
        <form onSubmit={save} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {contact && <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Type</span><select value={type} onChange={(event) => setType(event.target.value as DirectoryType)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs"><option value="person">Person</option><option value="organization">Organisation</option></select></label>}
          <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Status</span><select value={status} onChange={(event) => setStatus(event.target.value as DirectoryStatus)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs"><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select></label>
          <label className="space-y-1 sm:col-span-2"><span className="block text-[10px] font-medium text-muted-foreground">{type === "person" ? "Name" : "Organisation name"}</span><input required value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          {type === "person" && <label className="space-y-1 sm:col-span-2"><span className="block text-[10px] font-medium text-muted-foreground">Organisation</span><input required value={organization} onChange={(event) => setOrganization(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>}
          <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Role / industry</span><input value={role} onChange={(event) => setRole(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">City</span><input value={city} onChange={(event) => setCity(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          <label className="space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
          {error && <p role="alert" className="text-xs text-destructive sm:col-span-2">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-border pt-3 sm:col-span-2"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">{contact ? "Save changes" : `Create ${type === "organization" ? "organisation" : "contact"}`}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default DirectorySplitView
