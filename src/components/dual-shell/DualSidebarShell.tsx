"use client"

import * as React from "react"
import {
  ArrowRight,
  Bell,
  Grid3X3,
  MessageCircle,
  Plus,
  Settings,
  X,
} from "@/components/ui/icons"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { AppRail } from "./AppRail"
import { RAIL_PREVIEW_CONTENT, type RailAppId } from "./rail-content"
import { ApplicationSidebar, defaultSidebarData } from "./ApplicationSidebar"
import { cn } from "@/lib/utils"
import { usePersistentState } from "@/hooks/use-persistent-state"

type ShellPanel = "quick" | "invite" | "account" | "preferences" | "logout" | null
type LocalProfile = { name: string; email: string }
type InviteDraft = { id: string; name: string; email: string; role: string; createdAt: string }

// --- Route-level code splitting -------------------------------------------
// Pages are lazy-loaded so the initial bundle only ships the shell (header,
// rail, secondary sidebar). Each page becomes its own chunk, fetched on demand.
const ContactsPage = React.lazy(() =>
  import("@/pages/workspace/ContactsPage").then((m) => ({ default: m.ContactsPage }))
)
const TasksListPage = React.lazy(() =>
  import("@/pages/workspace/TasksListPage").then((m) => ({ default: m.TasksListPage }))
)
const MyTasksPage = React.lazy(() =>
  import("@/pages/workspace/MyTasksPage").then((m) => ({ default: m.MyTasksPage }))
)
const TeamTasksPage = React.lazy(() =>
  import("@/pages/workspace/TeamTasksPage").then((m) => ({ default: m.TeamTasksPage }))
)
const MaterialInformationPage = React.lazy(() =>
  import("@/pages/library/MaterialInformationPage").then((m) => ({
    default: m.MaterialInformationPage,
  }))
)
const SwatchSamplePage = React.lazy(() =>
  import("@/pages/library/SwatchSamplePage").then((m) => ({ default: m.SwatchSamplePage }))
)
const ItemListPage = React.lazy(() =>
  import("@/pages/products/ItemListPage").then((m) => ({ default: m.ItemListPage }))
)
const StocksPage = React.lazy(() =>
  import("@/pages/products/StocksPage").then((m) => ({ default: m.StocksPage }))
)
const IssuedReportPage = React.lazy(() =>
  import("@/pages/products/IssuedReportPage").then((m) => ({ default: m.IssuedReportPage }))
)
const VendorsPage = React.lazy(() =>
  import("@/pages/products/VendorsPage").then((m) => ({ default: m.VendorsPage }))
)

// Fallback occupies the exact same flex box as a real page, so swapping in the
// resolved page causes zero layout shift (CLS stays 0).
const PageFallback = () => (
  <div className="min-h-0 w-full flex-1 bg-background" aria-busy="true" aria-live="polite" />
)

const pagesByRail: Partial<
  Record<RailAppId, Record<string, React.ComponentType>>
> = {
  workspace: {
    Contacts: ContactsPage,
    "Tasks list": TasksListPage,
    "My tasks": MyTasksPage,
    "Team tasks": TeamTasksPage,
  },
  library: {
    "Material information": MaterialInformationPage,
    "Swatch & Sample": SwatchSamplePage,
  },
  products: {
    "Item list": ItemListPage,
    Stocks: StocksPage,
    "Issued report": IssuedReportPage,
    Vendors: VendorsPage,
  },
}

const ACTIVE_PAGE_STORAGE_KEY = "archscale.activePage"
type ActivePageSelection = { activeRailId: RailAppId; activeItem: string }

function readActivePageSelection(): ActivePageSelection {
  const defaultSelection: ActivePageSelection = {
    activeRailId: "workspace",
    activeItem: "Contacts",
  }

  try {
    const stored = window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY)
    if (!stored) return defaultSelection

    const selection = JSON.parse(stored) as {
      activeRailId?: unknown
      activeItem?: unknown
    }
    if (
      typeof selection.activeRailId === "string" &&
      typeof selection.activeItem === "string" &&
      pagesByRail[selection.activeRailId as RailAppId]?.[selection.activeItem]
    ) {
      return {
        activeRailId: selection.activeRailId as RailAppId,
        activeItem: selection.activeItem,
      }
    }
  } catch {
    return defaultSelection
  }

  return defaultSelection
}

function ShellContent({
  activeRailId,
  setActiveRailId,
  activeItem,
  setActiveItem,
  sidebarDefaultOpen,
  setSidebarDefaultOpen,
}: {
  activeRailId: RailAppId
  setActiveRailId: (id: RailAppId) => void
  activeItem: string
  setActiveItem: (item: string) => void
  sidebarDefaultOpen: boolean
  setSidebarDefaultOpen: (open: boolean) => void
}) {
  const { open, toggleSidebar, setOpen } = useSidebar()
  const [shellPanel, setShellPanel] = React.useState<ShellPanel>(null)
  const [railPreviewOpen, setRailPreviewOpen] = React.useState(false)
  const [profile, setProfile] = usePersistentState<LocalProfile>("archscale.profile", { name: "Sam Doe", email: "sam@example.com" })
  const [inviteDrafts, setInviteDrafts] = usePersistentState<InviteDraft[]>("archscale.invite.drafts", [])
  const [shellFeedback, setShellFeedback] = React.useState("")
  const ActivePage = pagesByRail[activeRailId]?.[activeItem]

  const navigateTo = React.useCallback((id: RailAppId, item: string) => {
    if (!pagesByRail[id]?.[item]) return
    setActiveRailId(id)
    setActiveItem(item)
    setShellPanel(null)
    if (!open) toggleSidebar()
  }, [open, setActiveItem, setActiveRailId, toggleSidebar])

  // Stable handlers: without these, fresh closures are created on every render
  // and React.memo on <AppRail>/<ApplicationSidebar> could never engage.
  const handleRailSelect = React.useCallback(
    (id: RailAppId) => {
      const defaultItem = id === "workspace" ? "Contacts" : id === "library" ? "Material information" : id === "products" ? "Item list" : null
      if (defaultItem) navigateTo(id, defaultItem)
      else setShellPanel("quick")
    },
    [navigateTo]
  )

  const handlePreviewItem = React.useCallback(
    (id: RailAppId, item: string) => {
      if (pagesByRail[id]?.[item]) navigateTo(id, item)
      else if (item === "Invite") setShellPanel("invite")
      else if (item === "Preferences") setShellPanel("preferences")
      else setShellPanel("quick")
    },
    [navigateTo]
  )

  const handleSelectItem = React.useCallback(
    (item: string) => {
      if (pagesByRail[activeRailId]?.[item]) setActiveItem(item)
      else setShellPanel("quick")
    },
    [activeRailId, setActiveItem]
  )

  const getRailTitle = () => {
    switch (activeRailId) {
      case "workspace":
        return "Workspace"
      case "library":
        return "Library"
      case "products":
        return "Products"
      case "explorer":
        return "Files & Explorer"
      case "search":
        return "Search & Commands"
      case "projects":
        return "Source Control"
      case "team":
        return "Team & Workspace"
      case "settings":
        return "Settings"
      case "overview":
      default:
        return "Workspace"
    }
  }

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-white">
      <header className="shell-chrome h-14 shrink-0 border-0">
        <div className={cn("flex h-full items-center transition-[filter] duration-150", railPreviewOpen && "blur-[2px]")}>
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <button
            onClick={() => {
              setActiveRailId("workspace")
              setActiveItem("Contacts")
              if (!open) toggleSidebar()
            }}
            className="shell-brand shell-interaction flex size-9 translate-x-3 items-center justify-center rounded-lg text-white shadow-sm transition-transform hover:scale-105 hover:shadow-md active:scale-95"
            title="ArchScale Hub"
          >
            <span className="text-base font-bold tracking-tight">A</span>
          </button>
        </div>

        <div
          className={cn(
            "flex h-full shrink-0 items-center overflow-hidden transition-[width] duration-200 ease-linear",
            open ? "w-64 px-3 md:w-72 md:px-4" : "w-0 px-0"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="truncate text-sm font-semibold">
                {defaultSidebarData.logo.title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {activeRailId === "explorer"
                  ? "› my-project"
                  : defaultSidebarData.logo.description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      const firstPage = Object.keys(pagesByRail[activeRailId] ?? {})[0]
                      if (firstPage) setActiveItem(firstPage)
                    }}
                    className="font-medium"
                  >
                    {getRailTitle()}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {activeItem}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShellPanel("quick")}
              aria-label="New action"
              title="New action"
              className="shell-interaction flex size-10 items-center justify-center rounded-md text-[#f05a24] hover:bg-black/5"
            >
              <Plus className="size-6" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setShellPanel("invite")}
              aria-label="Messages"
              title="Messages"
              className="shell-interaction flex size-10 items-center justify-center rounded-md text-[#4a463f] hover:bg-black/5"
            >
              <MessageCircle className="size-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setShellFeedback("Notifications are not available yet.")}
              aria-label="Notifications"
              title="Notifications"
              className="shell-interaction flex size-10 items-center justify-center rounded-md text-[#4a463f] hover:bg-black/5"
            >
              <Bell className="size-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setShellPanel("preferences")}
              aria-label="Settings"
              title="Settings"
              className="shell-interaction flex size-10 items-center justify-center rounded-md text-[#4a463f] hover:bg-black/5"
            >
              <Settings className="size-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setShellPanel("quick")}
              aria-label="Apps"
              title="Apps"
              className="shell-interaction flex size-10 items-center justify-center rounded-md text-[#4a463f] hover:bg-black/5"
            >
              <Grid3X3 className="size-6" strokeWidth={1.8} />
            </button>
          </div>
        </div>
        </div>
      </header>

      <div className="shell-chrome flex min-h-0 flex-1 gap-3 p-3">
        {/* 1. Slim Left App Rail */}
        <AppRail
          activeId={activeRailId}
          onSelect={handleRailSelect}
          onSelectPreviewItem={handlePreviewItem}
          onPreviewChange={setRailPreviewOpen}
          isSidebarOpen={open}
          onToggleSidebar={toggleSidebar}
          onOpenMore={() => setShellPanel("quick")}
          onOpenInvite={() => setShellPanel("invite")}
          onProfileAction={(action) => setShellPanel(action)}
          profileName={profile.name}
          profileEmail={profile.email}
        />

        {/* 2. Collapsible Secondary Sidebar */}
        <ApplicationSidebar
          className={cn("h-full transition-[filter] duration-150", railPreviewOpen && "blur-[2px]")}
          activeRailId={activeRailId}
          activeItem={activeItem}
          onSelectItem={handleSelectItem}
          onOpenMore={() => setShellPanel("quick")}
        />

        {/* 3. Main Workspace Inset Area */}
        <SidebarInset
          className={cn(
            "shell-elevation min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-0 transition-[filter] duration-150",
            railPreviewOpen && "blur-[2px]",
            open && "-ml-2"
          )}
        >
        {ActivePage && (
          <React.Suspense fallback={<PageFallback />}>
            <ActivePage />
          </React.Suspense>
        )}
      </SidebarInset>
      </div>
      {shellFeedback && <div role="status" className="absolute bottom-4 right-4 z-[60] rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">{shellFeedback}</div>}
      {shellPanel && (
        <ShellActionDialog
          key={shellPanel}
          panel={shellPanel}
          activeRailId={activeRailId}
          profile={profile}
          inviteCount={inviteDrafts.length}
          sidebarDefaultOpen={sidebarDefaultOpen}
          onClose={() => setShellPanel(null)}
          onNavigate={navigateTo}
          onSaveProfile={(nextProfile) => {
            setProfile(nextProfile)
            setShellPanel(null)
            setShellFeedback("Local profile saved.")
          }}
          onSaveInvite={(draft) => {
            setInviteDrafts((current) => [draft, ...current])
            setShellPanel(null)
            setShellFeedback("Invite draft saved in this browser; no email was sent.")
          }}
          onSavePreferences={(expanded) => {
            setSidebarDefaultOpen(expanded)
            setOpen(expanded)
            setShellPanel(null)
            setShellFeedback("Sidebar preference saved in this browser.")
          }}
        />
      )}
    </div>
  )
}

export function DualSidebarShell() {
  const [selection, setSelection] = React.useState(readActivePageSelection)
  const [sidebarDefaultOpen, setSidebarDefaultOpen] = usePersistentState("archscale.preferences.sidebarDefaultOpen", true)
  const { activeRailId, activeItem } = selection

  const setActiveRailId = React.useCallback((id: RailAppId) => {
    setSelection((current) => ({ ...current, activeRailId: id }))
  }, [])
  const setActiveItem = React.useCallback((item: string) => {
    setSelection((current) => ({ ...current, activeItem: item }))
  }, [])

  React.useEffect(() => {
    if (!pagesByRail[activeRailId]?.[activeItem]) return

    try {
      window.localStorage.setItem(
        ACTIVE_PAGE_STORAGE_KEY,
        JSON.stringify({ activeRailId, activeItem })
      )
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [activeRailId, activeItem])

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <ShellContent
        activeRailId={activeRailId}
        setActiveRailId={setActiveRailId}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        sidebarDefaultOpen={sidebarDefaultOpen}
        setSidebarDefaultOpen={setSidebarDefaultOpen}
      />
    </SidebarProvider>
  )
}

function ShellActionDialog({
  panel,
  activeRailId,
  profile,
  inviteCount,
  sidebarDefaultOpen,
  onClose,
  onNavigate,
  onSaveProfile,
  onSaveInvite,
  onSavePreferences,
}: {
  panel: Exclude<ShellPanel, null>
  activeRailId: RailAppId
  profile: LocalProfile
  inviteCount: number
  sidebarDefaultOpen: boolean
  onClose: () => void
  onNavigate: (railId: RailAppId, item: string) => void
  onSaveProfile: (profile: LocalProfile) => void
  onSaveInvite: (draft: InviteDraft) => void
  onSavePreferences: (expanded: boolean) => void
}) {
  const [name, setName] = React.useState(profile.name)
  const [email, setEmail] = React.useState(profile.email)
  const [inviteName, setInviteName] = React.useState("")
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("Member")
  const [expanded, setExpanded] = React.useState(sidebarDefaultOpen)

  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  const railContent = RAIL_PREVIEW_CONTENT[activeRailId]
  const title = panel === "quick"
    ? railContent.title
    : panel === "invite"
      ? "Invite draft"
      : panel === "account"
        ? "Local profile"
        : panel === "preferences"
          ? "Preferences"
          : "Sign out unavailable"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="shell-action-title" className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4">
          <div><h2 id="shell-action-title" className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{panel === "quick" ? "Section information" : "ArchScale Hub"}</p></div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </header>

        {panel === "quick" && (
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2">
            {railContent.items.map(({ label, icon: ItemIcon }) => {
              const PageIcon = ItemIcon
              const canNavigate = Boolean(pagesByRail[activeRailId]?.[label])

              return canNavigate ? (
                <button type="button" key={label} onClick={() => onNavigate(activeRailId, label)} className="flex h-10 items-center gap-2 rounded-md border border-transparent px-2 text-left text-xs hover:border-border hover:bg-muted">
                  <PageIcon className="size-4" /><span className="min-w-0 flex-1 truncate">{label}</span><ArrowRight className="size-3 text-muted-foreground" />
                </button>
              ) : (
                <div key={label} className="flex h-10 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground">
                  <PageIcon className="size-4" /><span className="min-w-0 flex-1 truncate">{label}</span>
                </div>
              )
            })}
          </div>
        )}

        {panel === "invite" && (
          <form className="space-y-3 p-4" onSubmit={(event) => { event.preventDefault(); onSaveInvite({ id: `invite-${Date.now()}`, name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole, createdAt: new Date().toISOString() }) }}>
            <p className="text-xs text-muted-foreground">Save an invitation draft locally. No email will be sent without an invitation service.</p>
            <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">Name</span><input required value={inviteName} onChange={(event) => setInviteName(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
            <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">Email</span><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
            <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">Role</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs"><option>Member</option><option>Project lead</option><option>Administrator</option></select></label>
            <p className="text-[10px] text-muted-foreground">{inviteCount} draft{inviteCount === 1 ? "" : "s"} saved locally.</p>
            <footer className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" disabled={!inviteName.trim() || !inviteEmail.trim()} className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40">Save invite draft</button></footer>
          </form>
        )}

        {panel === "account" && (
          <form className="space-y-3 p-4" onSubmit={(event) => { event.preventDefault(); onSaveProfile({ name: name.trim(), email: email.trim() }) }}>
            <p className="text-xs text-muted-foreground">This is a local profile display only; no authentication service is connected.</p>
            <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">Display name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
            <label className="block space-y-1"><span className="text-[10px] text-muted-foreground">Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-9 w-full rounded border border-input bg-background px-2 text-xs" /></label>
            <footer className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground">Save profile</button></footer>
          </form>
        )}

        {panel === "preferences" && (
          <form className="space-y-4 p-4" onSubmit={(event) => { event.preventDefault(); onSavePreferences(expanded) }}>
            <p className="text-xs text-muted-foreground">Preferences are saved in this browser.</p>
            <label className="flex items-center gap-2 rounded border border-border p-3 text-xs"><input type="checkbox" checked={expanded} onChange={(event) => setExpanded(event.target.checked)} />Keep the secondary sidebar expanded</label>
            <footer className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={onClose} className="h-8 rounded border border-input px-3 text-xs hover:bg-accent">Cancel</button><button type="submit" className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground">Save preferences</button></footer>
          </form>
        )}

        {panel === "logout" && <div className="space-y-3 p-4"><p className="text-xs text-muted-foreground">Authentication is not configured in this frontend. No sign-out action was performed.</p><footer className="flex justify-end border-t border-border pt-3"><button type="button" onClick={onClose} className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground">Close</button></footer></div>}
      </section>
    </div>
  )
}
