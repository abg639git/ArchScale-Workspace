import type * as React from "react"
import {
  BarChart3,
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
  Palette,
  Search,
  SlidersHorizontal,
  Store,
  Users,
  UserRound,
} from "@/components/ui/icons"

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

export type RailPreviewItem = {
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export const RAIL_PREVIEW_CONTENT: Record<
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
