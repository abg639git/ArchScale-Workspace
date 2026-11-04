"use client"

import * as React from "react"
import {
  ChevronRight,
  ClipboardList,
  ContactRound,
  Box,
  File,
  FileText,
  Folder,
  GitBranch,
  GitCommit,
  FlaskConical,
  History,
  List,
  ListTodo,
  MoreHorizontal,
  Palette,
  Search,
  Store,
  User,
  Users,
} from "@/components/ui/icons"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { RailAppId } from "./rail-content"
import { SAMPLE_MANAGEMENT_STAGES } from "./rail-content"

// Base nav item - used by simple sidebars
export type NavItem = {
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  isActive?: boolean
  badge?: string
  children?: NavItem[]
}

export type NavGroup = {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
}

export type UserData = {
  name: string
  email: string
  avatar: string
}

export type SidebarData = {
  logo: {
    src: string
    alt: string
    title: string
    description: string
  }
  navGroups: NavGroup[]
  footerGroup: NavGroup
  user?: UserData
  workspaces?: Array<{
    id: string
    name: string
    logo: string
    plan: string
  }>
  activeWorkspace?: string
}

export const defaultSidebarData: SidebarData = {
  logo: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
    alt: "ArchScale Hub",
    title: "ArchScale Hub",
    description: "Workspace",
  },
  navGroups: [
    {
      title: "WORKSPACE",
      defaultOpen: true,
      items: [
        {
          label: "Directory",
          icon: Users,
          href: "#",
          children: [
            { label: "Contacts", icon: ContactRound, href: "#" },
          ],
        },
        {
          label: "Tasks",
          icon: ClipboardList,
          href: "#",
          children: [
            { label: "Tasks list", icon: ListTodo, href: "#" },
            { label: "My tasks", icon: User, href: "#" },
            { label: "Team tasks", icon: Users, href: "#" },
          ],
        },
      ],
    },
  ],
  footerGroup: {
    title: "More",
    items: [
      { label: "More", icon: MoreHorizontal, href: "#" },
    ],
  },
  user: {
    name: "Sam Doe",
    email: "saml@example.com",
    avatar: "",
  },
  workspaces: [
    {
      id: "1",
      name: "ArchScale Hub",
      logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
      plan: "Enterprise",
    },
    {
      id: "2",
      name: "Library",
      logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
      plan: "Startup",
    },
    {
      id: "3",
      name: "Products",
      logo: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
      plan: "Free",
    },
  ],
  activeWorkspace: "1",
}

const NavMenuItem = ({
  item,
  activeItem,
  onSelectItem,
}: {
  item: NavItem
  activeItem: string
  onSelectItem: (label: string) => void
}) => {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0
  const isSelected = activeItem === item.label

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isSelected}
          onClick={() => onSelectItem(item.label)}
          className="shell-interaction cursor-pointer"
        >
          <Icon className="size-4" />
          <span>{item.label}</span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {item.badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isSelected} className="shell-interaction cursor-pointer">
            <Icon className="size-4" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton
                  isActive={activeItem === child.label}
                  onClick={() => onSelectItem(child.label)}
                  className="shell-interaction cursor-pointer"
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

interface ApplicationSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeRailId: RailAppId
  activeItem: string
  onSelectItem: (item: string) => void
  onOpenMore: () => void
}

const ApplicationSidebarBase: React.FC<ApplicationSidebarProps> = ({
  activeRailId,
  activeItem,
  onSelectItem,
  onOpenMore,
  ...props
}) => {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState("README.md")
  const [sampleStagesOpen, setSampleStagesOpen] = React.useState(
    activeItem === "Swatch & Sample" ||
      (SAMPLE_MANAGEMENT_STAGES as readonly string[]).includes(activeItem)
  )

  React.useEffect(() => {
    setSampleStagesOpen(
      activeItem === "Swatch & Sample" ||
        (SAMPLE_MANAGEMENT_STAGES as readonly string[]).includes(activeItem)
    )
  }, [activeItem])

  // Render context-specific view depending on selected rail item
  const renderSidebarBody = () => {
    switch (activeRailId) {
      case "explorer":
        // IDE-style Explorer from Screenshot 1
        return (
          <div className="flex flex-col gap-3 p-3">
            <div className="border-b border-sidebar-border pb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Changes
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { file: "README.md", status: "M" },
                  { file: "api/hello/route.ts", status: "" },
                  { file: "app/layout.tsx", status: "" },
                ].map(({ file, status }) => (
                  <button
                    key={file}
                    onClick={() => {
                      setSelectedFile(file)
                      onSelectItem(file)
                    }}
                    className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-sidebar-accent ${
                      selectedFile === file
                        ? "bg-sidebar-accent font-medium text-foreground"
                        : "text-sidebar-foreground"
                    }`}
                  >
                    <File className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file}</span>
                    {status && (
                      <span className="ml-auto text-xs font-semibold text-muted-foreground">
                        {status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </p>
              <div className="flex flex-col gap-1">
                {["app", "components", "lib", "public"].map((folder) => (
                  <button
                    key={folder}
                    onClick={() => onSelectItem(folder)}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  >
                    <Folder className="size-4 text-muted-foreground" />
                    <span>{folder}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case "search":
        // Quick Search Panel
        return (
          <div className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files or commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Files
            </p>
            <div className="flex flex-col gap-1">
              {[
                "Dashboard.tsx",
                "ApplicationShell.tsx",
                "AppRail.tsx",
                "sidebar.tsx",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => onSelectItem(item)}
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent text-left"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case "projects":
        // Git / Projects view
        return (
          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Branches
            </p>
            <div className="flex flex-col gap-1 mb-4">
              {["main", "feature/dual-sidebar", "chore/update-deps"].map((branch) => (
                <button
                  key={branch}
                  onClick={() => onSelectItem(`Branch: ${branch}`)}
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                  <GitBranch className="size-4 text-muted-foreground" />
                  <span className="truncate">{branch}</span>
                  {branch === "main" && (
                    <span className="ml-auto text-[10px] bg-muted px-1 rounded">active</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Commits
            </p>
            <div className="flex flex-col gap-1">
              {[
                { hash: "fcf3ec7", msg: "feat: dual sidebar shell" },
                { hash: "af10fa6", msg: "fix: messenger enhancements" },
              ].map((commit) => (
                <div key={commit.hash} className="p-2 rounded hover:bg-sidebar-accent text-xs">
                  <div className="flex items-center gap-1 font-mono text-muted-foreground">
                    <GitCommit className="size-3" /> {commit.hash}
                  </div>
                  <div className="truncate text-foreground font-medium mt-0.5">{commit.msg}</div>
                </div>
              ))}
            </div>
          </div>
        )

      case "team":
        // Team view
        return (
          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team Members
            </p>
            <div className="flex flex-col gap-1">
              {[
                { name: "John Doe", role: "Principal Architect", status: "online" },
                { name: "Jasmine Kaur", role: "Project Lead", status: "online" },
                { name: "Ritik Verma", role: "Design Lead", status: "offline" },
              ].map((member) => (
                <button
                  key={member.name}
                  onClick={() => onSelectItem(`Member: ${member.name}`)}
                  className="flex items-center gap-2.5 p-2 rounded-md text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="relative">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {member.name[0]}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 size-2 rounded-full border border-background ${
                        member.status === "online" ? "bg-foreground" : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{member.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{member.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case "library":
        return (
          <SidebarGroup>
            <SidebarGroupLabel>LIBRARY</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { label: "Material information", icon: Palette },
                  { label: "Swatch & Sample", icon: FlaskConical },
                ].map(({ label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    {label === "Swatch & Sample" ? (
                      <Collapsible open={sampleStagesOpen} onOpenChange={setSampleStagesOpen}>
                        <div className="flex items-center gap-1">
                          <SidebarMenuButton
                            isActive={activeItem === label}
                            onClick={() => onSelectItem(label)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <Icon className="size-4" />
                            <span>{label}</span>
                          </SidebarMenuButton>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${sampleStagesOpen ? "Collapse" : "Expand"} Swatch & Sample stages`}
                              aria-expanded={sampleStagesOpen}
                              className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                            >
                              <ChevronRight className={`size-4 transition-transform duration-200 ${sampleStagesOpen ? "rotate-90" : ""}`} />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {SAMPLE_MANAGEMENT_STAGES.map((stage) => (
                              <SidebarMenuSubItem key={stage}>
                                <SidebarMenuSubButton
                                  isActive={activeItem === stage}
                                  onClick={() => onSelectItem(stage)}
                                  className="cursor-pointer"
                                >
                                  <span>{stage}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        isActive={activeItem === label}
                        onClick={() => onSelectItem(label)}
                        className="cursor-pointer"
                      >
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )

      case "workspace":
      case "overview":
      default:
        return (
          <>
            {defaultSidebarData.navGroups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <NavMenuItem
                        key={item.label}
                        item={item}
                        activeItem={activeItem}
                        onSelectItem={onSelectItem}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        )

      case "products":
        return (
          <SidebarGroup>
            <SidebarGroupLabel>PRODUCTS</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavMenuItem
                  item={{
                    label: "Inventory",
                    icon: Box,
                    href: "#",
                    children: [
                      { label: "Item list", icon: List, href: "#" },
                      { label: "Stocks", icon: History, href: "#" },
                      { label: "Issued report", icon: User, href: "#" },
                      { label: "Vendors", icon: Store, href: "#" },
                    ],
                  }}
                  activeItem={activeItem}
                  onSelectItem={onSelectItem}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )
    }
  }

  return (
    <Sidebar {...props} className={`shell-elevation ${props.className ?? ""}`}>
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          {renderSidebarBody()}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onOpenMore}
              className="shell-interaction cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
              <span>More</span>
              <ChevronRight className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// Memoized: the rail changing no longer re-renders the whole secondary sidebar.
export const ApplicationSidebar = React.memo(ApplicationSidebarBase)
ApplicationSidebar.displayName = "ApplicationSidebar"
