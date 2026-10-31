"use client"

import * as React from "react"
import {
  BarChart3,
  Box,
  ClipboardList,
  CircleHelp,
  ContactRound,
  FlaskConical,
  FileCode,
  FileText,
  Folder,
  GitBranch,
  LayoutGrid,
  History,
  List,
  MoreHorizontal,
  Palette,
  Search,
  SlidersHorizontal,
  Store,
  Users,
  UserRound,
  UserRoundPlus,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type RailAppId =
  | "workspace"
  | "library"
  | "products"
  | "overview"
  | "explorer"
  | "search"
  | "projects"
  | "team"
  | "settings"

export interface RailApp {
  id: RailAppId
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  shortcut?: string
}

// Feather glyphs inlined from feather-icons.com (identical path data) so the
// react-feather package can be dropped — 2 icons don't justify a dependency.
// Renders pixel-identically: className="size-5" wins over the width/height attrs.
type FeatherGlyphProps = React.SVGProps<SVGSVGElement>

const FeatherGrid: React.FC<FeatherGlyphProps> = (props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

const FeatherBookOpen: React.FC<FeatherGlyphProps> = (props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

export const RAIL_APPS: RailApp[] = [
  { id: "workspace", label: "Workspace", icon: FeatherGrid },
  { id: "library", label: "Library", icon: FeatherBookOpen },
  { id: "products", label: "Products", icon: Box },
]

interface AppRailProps {
  activeId: RailAppId
  onSelect: (id: RailAppId) => void
  onSelectPreviewItem: (id: RailAppId, item: string) => void
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

type RailPreviewItem = {
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const RAIL_PREVIEW_CONTENT: Record<
  RailAppId,
  { title: string; items: RailPreviewItem[] }
> = {
  workspace: {
    title: "Workspace",
    items: [
      { label: "Contacts", icon: Users },
      { label: "Tasks list", icon: ClipboardList },
      { label: "My tasks", icon: UserRound },
      { label: "Team tasks", icon: Users },
    ],
  },
  library: {
    title: "Library",
    items: [
      { label: "Material information", icon: Palette },
      { label: "Swatch & Sample", icon: FlaskConical },
    ],
  },
  products: {
    title: "Products",
    items: [
      { label: "Item list", icon: List },
      { label: "Stocks", icon: History },
      { label: "Issued report", icon: ContactRound },
      { label: "Vendors", icon: Store },
    ],
  },
  overview: {
    title: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutGrid },
      { label: "Tasks", icon: ClipboardList },
      { label: "Roadmap", icon: BarChart3 },
    ],
  },
  explorer: {
    title: "Explorer",
    items: [
      { label: "Changes", icon: GitBranch },
      { label: "README.md", icon: FileText },
      { label: "api/hello/route.ts", icon: FileCode },
      { label: "app", icon: Folder },
      { label: "components", icon: Folder },
      { label: "lib", icon: Folder },
    ],
  },
  search: {
    title: "Search",
    items: [
      { label: "Search files or commands...", icon: Search },
      { label: "Dashboard.tsx", icon: FileCode },
      { label: "ApplicationShell.tsx", icon: FileCode },
      { label: "AppRail.tsx", icon: FileCode },
    ],
  },
  projects: {
    title: "Projects",
    items: [
      { label: "main", icon: GitBranch },
      { label: "feature/dual-sidebar", icon: GitBranch },
      { label: "chore/update-deps", icon: GitBranch },
    ],
  },
  team: {
    title: "Team",
    items: [
      { label: "John Doe", icon: UserRound },
      { label: "Jasmine Kaur", icon: UserRound },
      { label: "Ritik Verma", icon: UserRound },
    ],
  },
  settings: {
    title: "Settings",
    items: [
      { label: "Account", icon: UserRound },
      { label: "Preferences", icon: SlidersHorizontal },
      { label: "Help Center", icon: CircleHelp },
    ],
  },
}

const AppRailBase: React.FC<AppRailProps> = ({
  activeId,
  onSelect,
  onSelectPreviewItem,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [preview, setPreview] = React.useState<{ id: RailAppId; top: number } | null>(null)
  const previewCloseTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPreviewClose = React.useCallback(() => {
    if (previewCloseTimeout.current) {
      clearTimeout(previewCloseTimeout.current)
      previewCloseTimeout.current = null
    }
  }, [])

  const schedulePreviewClose = React.useCallback(() => {
    cancelPreviewClose()
    previewCloseTimeout.current = setTimeout(() => {
      setPreview(null)
      previewCloseTimeout.current = null
    }, 120)
  }, [cancelPreviewClose])

  React.useEffect(
    () => () => {
      cancelPreviewClose()
    },
    [cancelPreviewClose]
  )

  const showPreview = (id: RailAppId, target: HTMLButtonElement) => {
    cancelPreviewClose()
    if (!isSidebarOpen) {
      const rail = target.closest("aside")
      const railTop = rail?.getBoundingClientRect().top ?? 0
      const railHeight = rail?.clientHeight ?? window.innerHeight
      const top = target.getBoundingClientRect().top - railTop
      setPreview({
        id,
        top: Math.min(Math.max(8, top - 8), Math.max(8, railHeight - 220)),
      })
    }
  }

  const selectPreviewItem = (item: string) => {
    if (!preview) return
    cancelPreviewClose()
    onSelect(preview.id)
    onSelectPreviewItem(preview.id, item)
    if (!isSidebarOpen) onToggleSidebar()
    setPreview(null)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className="shell-chrome shell-elevation relative flex h-full w-[4.5rem] shrink-0 flex-col items-center rounded-xl py-3 select-none"
        onMouseLeave={schedulePreviewClose}
      >
        {/* Primary App Rail Icons */}
        <div className="flex w-full flex-1 flex-col items-center gap-2 px-1 pt-1">
          {RAIL_APPS.map((app) => {
            const Icon = app.icon
            const isActive = activeId === app.id

            return (
              <Tooltip key={app.id}>
                <TooltipTrigger asChild>
                  <button
                    onMouseEnter={(event) => showPreview(app.id, event.currentTarget)}
                    onClick={() => {
                      cancelPreviewClose()
                      setPreview(null)
                      if (activeId === app.id && isSidebarOpen) {
                        onToggleSidebar()
                      } else {
                        onSelect(app.id)
                        if (!isSidebarOpen) onToggleSidebar()
                      }
                    }}
                    className={cn(
                      "shell-interaction relative flex h-[3.4rem] w-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground",
                      isActive &&
                        "bg-sidebar-accent text-foreground font-semibold shadow-xs"
                    )}
                  >
                    {/* Active left indicator pill */}
                    {isActive && (
                      <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                    )}
                    <Icon className="size-5" />
                    <span className="text-[10px] leading-none">{app.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className={cn("flex items-center gap-2", preview && "hidden")}
                >
                  <span>{app.label}</span>
                  {app.shortcut && (
                    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {app.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Bottom rail actions */}
        <div className="mt-auto flex w-full flex-col items-center gap-2 px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  cancelPreviewClose()
                  setPreview(null)
                  onSelect("settings")
                  onSelectPreviewItem("settings", "More")
                  if (!isSidebarOpen) onToggleSidebar()
                }}
                className="shell-interaction flex h-12 w-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <MoreHorizontal className="size-5" />
                <span className="text-[10px] leading-none">More</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">More</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelect("workspace")
                  onSelectPreviewItem("workspace", "Invite")
                  if (!isSidebarOpen) onToggleSidebar()
                }}
                className="shell-interaction flex h-12 w-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <UserRoundPlus className="size-5" />
                <span className="text-[10px] leading-none">Invite</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Invite</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Signed in as Sam Doe"
                className="shell-interaction relative my-1 flex size-10 items-center justify-center rounded-full border border-sidebar-border bg-amber-300 text-sm font-medium text-foreground"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-amber-300 text-foreground">
                    SD
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar-background bg-emerald-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block">Sam Doe</span>
                <span className="text-xs font-normal text-muted-foreground">
                  sam@example.com
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Account</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {preview && !isSidebarOpen && (
          <div
            className="absolute left-full z-50 max-h-[calc(100svh-1rem)] w-64 overflow-y-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
            style={{ top: preview.top }}
            onMouseEnter={cancelPreviewClose}
            onMouseLeave={schedulePreviewClose}
          >
            <h2 className="mb-2 px-2 text-sm font-medium">
              {RAIL_PREVIEW_CONTENT[preview.id].title}
            </h2>
            <div className="flex flex-col gap-1">
              {RAIL_PREVIEW_CONTENT[preview.id].items.map(({ label, icon: ItemIcon }) => (
                <button
                  key={label}
                  type="button"
                  className="shell-interaction flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectPreviewItem(label)}
                >
                  <ItemIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

// Memoized: with stable callbacks from the shell, the rail no longer re-renders
// when only `activeItem` changes (i.e. every sidebar menu click).
export const AppRail = React.memo(AppRailBase)
AppRail.displayName = "AppRail"
