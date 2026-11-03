"use client"

import * as React from "react"
import {
  BookOpen,
  Box,
  Grid,
  MoreHorizontal,
  UserRoundPlus,
} from "@/components/ui/icons"
import { RAIL_PREVIEW_CONTENT, type RailAppId } from "./rail-content"
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

export interface RailApp {
  id: RailAppId
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  shortcut?: string
}

export const RAIL_APPS: RailApp[] = [
  { id: "workspace", label: "Workspace", icon: Grid },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "products", label: "Products", icon: Box },
]

interface AppRailProps {
  activeId: RailAppId
  onSelect: (id: RailAppId) => void
  onSelectPreviewItem: (id: RailAppId, item: string) => void
  onPreviewChange: (open: boolean) => void
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenMore: () => void
  onOpenInvite: () => void
  onProfileAction: (action: "account" | "preferences" | "logout") => void
  profileName: string
  profileEmail: string
}

const AppRailBase: React.FC<AppRailProps> = ({
  activeId,
  onSelect,
  onSelectPreviewItem,
  onPreviewChange,
  isSidebarOpen,
  onToggleSidebar,
  onOpenMore,
  onOpenInvite,
  onProfileAction,
  profileName,
  profileEmail,
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

  React.useEffect(() => {
    onPreviewChange(Boolean(preview && !isSidebarOpen))
  }, [isSidebarOpen, onPreviewChange, preview])

  React.useEffect(() => () => onPreviewChange(false), [onPreviewChange])

  const profileInitials = profileName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()

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
        className="shell-chrome shell-elevation relative flex h-full w-[4.5rem] shrink-0 flex-col items-center rounded-xl border-0 py-3 select-none"
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
                  onOpenMore()
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
                  onOpenInvite()
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
                title={`Profile: ${profileName}`}
                className="shell-interaction relative my-1 flex size-10 items-center justify-center rounded-full border border-sidebar-border bg-amber-300 text-sm font-medium text-foreground"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-amber-300 text-foreground">
                    {profileInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar-background bg-emerald-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block">{profileName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profileEmail}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onProfileAction("account")}>Account</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onProfileAction("preferences")}>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onProfileAction("logout")}>Log out</DropdownMenuItem>
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
