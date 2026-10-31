"use client"

import * as React from "react"
import { Play, Plus } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { AppRail, type RailAppId } from "./AppRail"
import { ApplicationSidebar, defaultSidebarData } from "./ApplicationSidebar"
import { cn } from "@/lib/utils"

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
}: {
  activeRailId: RailAppId
  setActiveRailId: (id: RailAppId) => void
  activeItem: string
  setActiveItem: (item: string) => void
}) {
  const { open, toggleSidebar } = useSidebar()
  const ActivePage = pagesByRail[activeRailId]?.[activeItem]

  // Stable handlers: without these, fresh closures are created on every render
  // and React.memo on <AppRail>/<ApplicationSidebar> could never engage.
  const handleRailSelect = React.useCallback(
    (id: RailAppId) => {
      setActiveRailId(id)
      if (id === "explorer") setActiveItem("README.md")
      if (id === "workspace") setActiveItem("Contacts")
      if (id === "library") setActiveItem("Material information")
      if (id === "products") setActiveItem("Item list")
    },
    [setActiveRailId, setActiveItem]
  )

  const handlePreviewItem = React.useCallback(
    (_id: RailAppId, item: string) => setActiveItem(item),
    [setActiveItem]
  )

  const handleSelectItem = React.useCallback(
    (item: string) => setActiveItem(item),
    [setActiveItem]
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
      <header className="shell-chrome flex h-14 shrink-0 items-center">
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <button
            onClick={() => {
              setActiveRailId("workspace")
              setActiveItem("Contacts")
              if (!open) toggleSidebar()
            }}
            className="shell-brand shell-interaction flex size-9 items-center justify-center rounded-lg text-white shadow-sm transition-transform hover:scale-105 hover:shadow-md active:scale-95"
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
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setActiveItem("Contacts")
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
              onClick={() => {
                setActiveRailId("workspace")
                setActiveItem("Contacts")
              }}
              className="shell-interaction hidden sm:inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-accent"
            >
              <Play className="size-3.5 fill-current" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => {
                setActiveRailId("explorer")
                setActiveItem("README.md")
              }}
              className="shell-interaction inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Action</span>
            </button>
          </div>
        </div>
      </header>

      <div className="shell-chrome flex min-h-0 flex-1 gap-3 p-3">
        {/* 1. Slim Left App Rail */}
        <AppRail
          activeId={activeRailId}
          onSelect={handleRailSelect}
          onSelectPreviewItem={handlePreviewItem}
          isSidebarOpen={open}
          onToggleSidebar={toggleSidebar}
        />

        {/* 2. Collapsible Secondary Sidebar */}
        <ApplicationSidebar
          className="h-full"
          activeRailId={activeRailId}
          activeItem={activeItem}
          onSelectItem={handleSelectItem}
        />

        {/* 3. Main Workspace Inset Area */}
        <SidebarInset
          className={cn(
            "shell-elevation min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border",
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
    </div>
  )
}

export function DualSidebarShell() {
  const [selection, setSelection] = React.useState(readActivePageSelection)
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
    <SidebarProvider defaultOpen={true}>
      <ShellContent
        activeRailId={activeRailId}
        setActiveRailId={setActiveRailId}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />
    </SidebarProvider>
  )
}
