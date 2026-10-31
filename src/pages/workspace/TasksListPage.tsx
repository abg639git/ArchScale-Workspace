import * as React from "react"
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ListTodo,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TaskStatus = "To Do" | "In Progress" | "Completed"
type TaskPriority = "High" | "Medium" | "Low"
type TaskDueFilter = "any" | "overdue" | "next7" | "no-date"
type SortField = "name" | "assignee" | "priority" | "dueDate" | "status"
type TaskView = "list" | "board"

type TaskItem = {
  id: string
  name: string
  description: string
  assignee: string
  priority: TaskPriority
  dueDate: string
  status: TaskStatus
}

const assignees = [
  "Jasmine Kaur",
  "John Doe",
  "Ritik Verma",
  "Karan Mehra",
  "Neha Kulkarni",
]

const dateOffset = (offset: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const initialTasks: TaskItem[] = [
  {
    id: "TSK-1048",
    name: "Finalize material palette for lobby",
    description: "Confirm the approved stone and timber palette with the client.",
    assignee: "Jasmine Kaur",
    priority: "High",
    dueDate: dateOffset(0),
    status: "In Progress",
  },
  {
    id: "TSK-1047",
    name: "Review revised lighting drawings",
    description: "Check the reflected ceiling plan against the latest coordination set.",
    assignee: "Ritik Verma",
    priority: "High",
    dueDate: dateOffset(1),
    status: "To Do",
  },
  {
    id: "TSK-1046",
    name: "Prepare vendor comparison",
    description: "Compare lead times and pricing for the shortlisted suppliers.",
    assignee: "John Doe",
    priority: "Medium",
    dueDate: dateOffset(2),
    status: "In Progress",
  },
  {
    id: "TSK-1045",
    name: "Share meeting notes with stakeholders",
    description: "Send the action list from the weekly project review.",
    assignee: "Neha Kulkarni",
    priority: "Low",
    dueDate: dateOffset(3),
    status: "To Do",
  },
  {
    id: "TSK-1044",
    name: "Update project finish schedule",
    description: "Add the approved finish codes and product references.",
    assignee: "Karan Mehra",
    priority: "Medium",
    dueDate: dateOffset(5),
    status: "To Do",
  },
  {
    id: "TSK-1043",
    name: "Coordinate sample delivery",
    description: "Arrange delivery of the final stone samples to site.",
    assignee: "Jasmine Kaur",
    priority: "High",
    dueDate: dateOffset(-1),
    status: "In Progress",
  },
  {
    id: "TSK-1042",
    name: "Approve joinery shop drawings",
    description: "Review dimensions and hardware selections before release.",
    assignee: "Ritik Verma",
    priority: "Medium",
    dueDate: dateOffset(7),
    status: "Completed",
  },
  {
    id: "TSK-1041",
    name: "Create site visit checklist",
    description: "Prepare a concise checklist for the next site inspection.",
    assignee: "John Doe",
    priority: "Low",
    dueDate: dateOffset(9),
    status: "To Do",
  },
  {
    id: "TSK-1040",
    name: "Confirm reception desk dimensions",
    description: "Validate dimensions with the interior contractor.",
    assignee: "Neha Kulkarni",
    priority: "High",
    dueDate: dateOffset(-3),
    status: "To Do",
  },
  {
    id: "TSK-1039",
    name: "Issue updated project brief",
    description: "Publish the revised scope and project milestones.",
    assignee: "Karan Mehra",
    priority: "Medium",
    dueDate: dateOffset(-5),
    status: "Completed",
  },
  {
    id: "TSK-1038",
    name: "Organize finish samples",
    description: "Label and file the approved samples in the material library.",
    assignee: "Jasmine Kaur",
    priority: "Low",
    dueDate: "",
    status: "Completed",
  },
  {
    id: "TSK-1037",
    name: "Review contractor clarifications",
    description: "Respond to open questions before the next coordination call.",
    assignee: "John Doe",
    priority: "Medium",
    dueDate: "",
    status: "To Do",
  },
]

const statusStyles: Record<TaskStatus, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-primary/10 text-primary",
  Completed: "bg-emerald-50 text-emerald-700",
}

const priorityStyles: Record<TaskPriority, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-muted text-muted-foreground",
}

const priorityOrder: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 }
const statusOrder: Record<TaskStatus, number> = { "To Do": 0, "In Progress": 1, Completed: 2 }
const today = dateOffset(0)

const formatDate = (date: string) => {
  if (!date) return "No due date"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const makeTaskId = () => `TSK-${Date.now()}`

export function TasksListPage() {
  const [tasks, setTasks] = React.useState(initialTasks)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("All statuses")
  const [priorityFilter, setPriorityFilter] = React.useState("All priorities")
  const [assigneeFilter, setAssigneeFilter] = React.useState("All assignees")
  const [dueFilter, setDueFilter] = React.useState<TaskDueFilter>("any")
  const [sortField, setSortField] = React.useState<SortField>("dueDate")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [taskView, setTaskView] = React.useState<TaskView>("list")
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)
  const [taskDetailsId, setTaskDetailsId] = React.useState<string | null>(null)
  const [isTaskDetailsClosing, setIsTaskDetailsClosing] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null)
  const [deletingTask, setDeletingTask] = React.useState<TaskItem | null>(null)
  const pageSize = 7
  const taskDetails = tasks.find((task) => task.id === taskDetailsId) ?? null

  const closeTaskDetails = React.useCallback(() => {
    setIsTaskDetailsClosing(true)
  }, [])

  React.useEffect(() => {
    if (!isTaskDetailsClosing) return
    const timeout = window.setTimeout(() => {
      setTaskDetailsId(null)
      setIsTaskDetailsClosing(false)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [isTaskDetailsClosing])

  React.useEffect(() => {
    if (!taskDetailsId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editingTask && !deletingTask) closeTaskDetails()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [taskDetailsId, editingTask, deletingTask, closeTaskDetails])

  const counts = React.useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "To Do").length,
      progress: tasks.filter((task) => task.status === "In Progress").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
    }),
    [tasks]
  )

  const filteredTasks = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const nextWeek = dateOffset(7)
    const results = tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        `${task.name} ${task.id} ${task.assignee} ${task.description}`
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesStatus = statusFilter === "All statuses" || task.status === statusFilter
      const matchesPriority =
        priorityFilter === "All priorities" || task.priority === priorityFilter
      const matchesAssignee =
        assigneeFilter === "All assignees" || task.assignee === assigneeFilter
      const matchesDue =
        dueFilter === "any" ||
        (dueFilter === "no-date" && !task.dueDate) ||
        (dueFilter === "overdue" &&
          Boolean(task.dueDate) &&
          task.dueDate < today &&
          task.status !== "Completed") ||
        (dueFilter === "next7" &&
          Boolean(task.dueDate) &&
          task.dueDate >= today &&
          task.dueDate <= nextWeek)
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDue
    })

    return results.sort((a, b) => {
      let comparison = 0
      if (sortField === "name") comparison = a.name.localeCompare(b.name)
      if (sortField === "assignee") comparison = a.assignee.localeCompare(b.assignee)
      if (sortField === "priority") comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (sortField === "status") comparison = statusOrder[a.status] - statusOrder[b.status]
      if (sortField === "dueDate") {
        comparison =
          (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, dueFilter, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const visibleTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const updateFilter = (callback: () => void) => {
    callback()
    setCurrentPage(1)
  }

  const changeSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const saveTask = (task: TaskItem) => {
    setTasks((current) =>
      current.some((item) => item.id === task.id)
        ? current.map((item) => (item.id === task.id ? task : item))
        : [task, ...current]
    )
    setEditingTask(null)
    setCurrentPage(1)
  }

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    )
    setOpenMenuId(null)
  }

  const resetFilters = () => {
    setSearch("")
    setStatusFilter("All statuses")
    setPriorityFilter("All priorities")
    setAssigneeFilter("All assignees")
    setDueFilter("any")
    setCurrentPage(1)
  }

  const sortButton = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => changeSort(field)}
      className="group inline-flex items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-white/80 transition-colors hover:text-white"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="size-3.5 text-primary" />
        ) : (
          <ArrowDown className="size-3.5 text-primary" />
        )
      ) : (
        <ArrowDownUp className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
      )}
    </button>
  )

  const cards = [
    { label: "Total Tasks", value: counts.total, icon: ListTodo, tone: "text-primary bg-primary/10", filter: "all" },
    { label: "To Do", value: counts.todo, icon: Circle, tone: "text-muted-foreground bg-muted", filter: "To Do" },
    { label: "In Progress", value: counts.progress, icon: Clock3, tone: "text-primary bg-primary/10", filter: "In Progress" },
    { label: "Completed", value: counts.completed, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50", filter: "Completed" },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 p-3 sm:p-4 xl:p-5">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Workspace
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Task list</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plan, prioritize, and keep your team’s work moving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingTask({
              id: makeTaskId(),
              name: "",
              description: "",
              assignee: assignees[0],
              priority: "Medium",
              dueDate: "",
              status: "To Do",
            })}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            <Plus className="size-3.5" />
            Create Task
          </button>
        </header>

        <section
          aria-label="Task summary filters"
          className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4"
        >
          {cards.map(({ label, value, icon: Icon, tone, filter }) => {
            const isSelected = filter === "all"
              ? statusFilter === "All statuses"
              : statusFilter === filter

            return (
              <button
                type="button"
                key={label}
                onClick={() => {
                  updateFilter(() => {
                    setStatusFilter(filter === "all" ? "All statuses" : filter)
                  })
                }}
                className={cn(
                  "group relative flex min-w-0 items-center justify-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/50 sm:px-3",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors sm:after:inset-x-3",
                  isSelected ? "bg-primary/[0.04] text-foreground after:bg-primary" : "text-muted-foreground after:bg-transparent"
                )}
                aria-pressed={isSelected}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", tone)}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">{label}</span>
                </span>
                <span className={cn(
                  "min-w-6 rounded px-1 py-0.5 text-center text-xs font-semibold tabular-nums",
                  isSelected ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                )}>
                  {value}
                </span>
              </button>
            )
          })}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <h2 className="text-sm font-semibold">All tasks</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Showing {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div role="group" aria-label="Task view" className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    aria-pressed={taskView === "list"}
                    onClick={() => setTaskView("list")}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all",
                      taskView === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="size-3" />
                    List
                  </button>
                  <button
                    type="button"
                    aria-pressed={taskView === "board"}
                    onClick={() => setTaskView("board")}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all",
                      taskView === "board" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="size-3" />
                    Board
                  </button>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <SlidersHorizontal className="size-3" />
                  <span className="hidden sm:inline">Reset filters</span>
                  <span className="sm:hidden">Reset</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))]">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => updateFilter(() => setSearch(event.target.value))}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-xs outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
                />
              </label>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => updateFilter(() => setStatusFilter(event.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
              >
                <option>All statuses</option>
                <option>To Do</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(event) => updateFilter(() => setPriorityFilter(event.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
              >
                <option>All priorities</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <select
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={(event) => updateFilter(() => setAssigneeFilter(event.target.value))}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
              >
                <option>All assignees</option>
                {assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}
              </select>
              <select
                aria-label="Filter by due date"
                value={dueFilter}
                onChange={(event) => updateFilter(() => setDueFilter(event.target.value as TaskDueFilter))}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
              >
                <option value="any">Any due date</option>
                <option value="overdue">Overdue</option>
                <option value="next7">Due in next 7 days</option>
                <option value="no-date">No due date</option>
              </select>
            </div>
          </div>

          {taskView === "list" ? <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="h-9 border-b border-border bg-[#1e293b] text-white">
                  <th scope="col" className="px-3 text-left">{sortButton("Task name", "name")}</th>
                  <th scope="col" className="px-3 text-left">{sortButton("Assignee", "assignee")}</th>
                  <th scope="col" className="px-3 text-left">{sortButton("Priority", "priority")}</th>
                  <th scope="col" className="px-3 text-left">{sortButton("Due date", "dueDate")}</th>
                  <th scope="col" className="px-3 text-left">{sortButton("Status", "status")}</th>
                  <th scope="col" className="w-9 px-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleTasks.map((task) => {
                  const overdue = task.dueDate && task.dueDate < today && task.status !== "Completed"
                  return (
                    <tr key={task.id} className={cn(
                      "group h-14 transition-colors hover:bg-muted/30",
                      overdue && "bg-destructive/5"
                    )}>
                      <td className="max-w-[360px] px-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            task.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"
                          )}>
                            {task.status === "Completed" ? <Check className="size-3.5" /> : <ListTodo className="size-3.5" />}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskDetailsId(task.id)
                              setIsTaskDetailsClosing(false)
                            }}
                            className="min-w-0 text-left"
                            aria-label={`View details for ${task.name}`}
                          >
                            <span className="block truncate text-xs font-medium transition-colors hover:text-primary">{task.name}</span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">{task.id}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold text-foreground/80">
                            {initials(task.assignee)}
                          </span>
                          <span className="whitespace-nowrap text-xs">{task.assignee}</span>
                        </div>
                      </td>
                      <td className="px-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", priorityStyles[task.priority])}>
                          <span className={cn("size-1 rounded-full", task.priority === "High" ? "bg-destructive" : task.priority === "Medium" ? "bg-amber-500" : "bg-muted-foreground")} />
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-3">
                        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", overdue && "font-medium text-destructive", !task.dueDate && "text-muted-foreground")}>
                          <CalendarDays className="size-3 text-muted-foreground" />
                          {overdue ? "Overdue · " : ""}{formatDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="px-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", statusStyles[task.status])}>
                          {task.status}
                        </span>
                      </td>
                      <td className="relative px-2 text-right">
                        <button
                          type="button"
                          aria-label={`Actions for ${task.name}`}
                          aria-expanded={openMenuId === task.id}
                          onClick={() => setOpenMenuId((openId) => openId === task.id ? null : task.id)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                        {openMenuId === task.id && (
                          <div className="absolute right-8 top-10 z-20 w-48 rounded-lg border border-border bg-popover p-1.5 text-left text-popover-foreground shadow-lg">
                            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Change status</p>
                            {(["To Do", "In Progress", "Completed"] as const).filter((status) => status !== task.status).map((status) => (
                              <button
                                type="button"
                                key={status}
                                onClick={() => updateTaskStatus(task.id, status)}
                                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs transition-colors hover:bg-accent"
                              >
                                {status === "Completed" ? <CheckCircle2 className="size-3.5" /> : <Clock3 className="size-3.5" />}
                                Mark {status.toLowerCase()}
                              </button>
                            ))}
                            <div className="my-1 border-t border-border" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTask(task)
                                setOpenMenuId(null)
                              }}
                              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs transition-colors hover:bg-accent"
                            >
                              <ListTodo className="size-3.5" />
                              Edit task
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingTask(task)
                                setOpenMenuId(null)
                              }}
                              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              Delete task
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {visibleTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Search className="size-4" />
                      </span>
                      <p className="text-sm font-medium">No tasks found</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try changing or clearing your filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div> : (
            <div className="grid min-w-0 grid-cols-1 gap-3 bg-muted/20 p-3 md:grid-cols-3">
              {(["To Do", "In Progress", "Completed"] as const).map((status) => {
                const columnTasks = visibleTasks.filter((task) => task.status === status)
                return (
                  <section key={status} aria-label={`${status} tasks`} className="min-w-0">
                    <header className="mb-2 flex items-center justify-between px-1">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className={cn(
                          "size-2 rounded-full",
                          status === "To Do" ? "bg-muted-foreground/60" : status === "In Progress" ? "bg-primary" : "bg-emerald-500"
                        )} />
                        {status}
                      </h3>
                      <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                        {columnTasks.length}
                      </span>
                    </header>
                    <div className="flex min-h-32 flex-col gap-2.5">
                      {columnTasks.map((task) => (
                        <article key={task.id} className="rounded-md border border-border bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{task.id}</span>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", priorityStyles[task.priority])}>{task.priority}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskDetailsId(task.id)
                              setIsTaskDetailsClosing(false)
                            }}
                            className="mt-1.5 block text-left text-xs font-medium leading-4 transition-colors hover:text-primary"
                            aria-label={`View details for ${task.name}`}
                          >
                            {task.name}
                          </button>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{task.description}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold">
                                {initials(task.assignee)}
                              </span>
                              <span className="truncate text-xs">{task.assignee}</span>
                            </div>
                            <span className={cn("inline-flex shrink-0 items-center gap-1 text-[10px]", task.dueDate && task.dueDate < today && task.status !== "Completed" ? "font-medium text-destructive" : "text-muted-foreground")}>
                              <CalendarDays className="size-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                          <label className="sr-only" htmlFor={`task-status-${task.id}`}>Change status for {task.name}</label>
                          <select
                            id={`task-status-${task.id}`}
                            value={task.status}
                            onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                            className={cn("mt-2 h-7 w-full rounded-md border-0 px-2 text-[11px] font-medium outline-none ring-1 ring-inset ring-border focus:ring-2 focus:ring-primary", statusStyles[task.status])}
                          >
                            <option>To Do</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </article>
                      ))}
                      {columnTasks.length === 0 && (
                        <p className="rounded-md border border-dashed border-border bg-background/70 px-3 py-4 text-center text-[11px] text-muted-foreground">
                          No tasks in this column
                        </p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[11px] text-muted-foreground">
              {filteredTasks.length === 0
                ? "No tasks to display"
                : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredTasks.length)} of ${filteredTasks.length} tasks`}
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="inline-flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="min-w-14 text-center text-[11px] text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="inline-flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </footer>
        </section>
      </main>

      {taskDetails && (
        <TaskDetailsPanel
          task={taskDetails}
          isClosing={isTaskDetailsClosing}
          onClose={closeTaskDetails}
          onEdit={() => {
            setEditingTask(taskDetails)
            closeTaskDetails()
          }}
          onStatusChange={(status) => updateTaskStatus(taskDetails.id, status)}
        />
      )}

      {editingTask && (
        <TaskEditor
          key={editingTask.id}
          task={editingTask}
          isEditing={tasks.some((task) => task.id === editingTask.id)}
          onClose={() => setEditingTask(null)}
          onSave={saveTask}
        />
      )}

      {deletingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeletingTask(null)
          }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title" className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </div>
            <h2 id="delete-task-title" className="text-base font-semibold">Delete this task?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              “{deletingTask.name}” will be removed from the task list.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingTask(null)} className="h-9 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setTasks((current) => current.filter((task) => task.id !== deletingTask.id))
                  setDeletingTask(null)
                  setCurrentPage(1)
                }}
                className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                Delete task
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TaskDetailsPanel({
  task,
  isClosing,
  onClose,
  onEdit,
  onStatusChange,
}: {
  task: TaskItem
  isClosing: boolean
  onClose: () => void
  onEdit: () => void
  onStatusChange: (status: TaskStatus) => void
}) {
  const overdue = Boolean(task.dueDate && task.dueDate < today && task.status !== "Completed")

  return (
    <div
      data-state={isClosing ? "closed" : "open"}
      className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] animate-in fade-in-0 duration-200 motion-reduce:animate-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
        data-state={isClosing ? "closed" : "open"}
        className="ml-auto flex h-full w-full max-w-[520px] flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200 motion-reduce:animate-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{task.id}</p>
            <h2 id="task-details-title" className="mt-1 text-lg font-semibold leading-6">{task.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          <section aria-label="Task status and priority" className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[task.status])}>
              {task.status}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", priorityStyles[task.priority])}>
              <span className={cn("size-1.5 rounded-full", task.priority === "High" ? "bg-destructive" : task.priority === "Medium" ? "bg-amber-500" : "bg-muted-foreground")} />
              {task.priority} priority
            </span>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {task.description || "No description has been added for this task."}
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-border">
            <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Task details</h3>
            <dl className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <dt className="text-sm text-muted-foreground">Assignee</dt>
                <dd className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
                    {initials(task.assignee)}
                  </span>
                  {task.assignee}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <dt className="text-sm text-muted-foreground">Due date</dt>
                <dd className={cn("inline-flex items-center gap-2 text-sm font-medium", overdue && "text-destructive")}>
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {overdue && "Overdue · "}{formatDate(task.dueDate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <dt className="text-sm text-muted-foreground">Task ID</dt>
                <dd className="font-mono text-xs font-medium">{task.id}</dd>
              </div>
            </dl>
          </section>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Update status</span>
            <select
              aria-label="Update task status"
              value={task.status}
              onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30"
            >
              <option>To Do</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border p-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ListTodo className="size-4" />
            Edit task
          </button>
        </footer>
      </section>
    </div>
  )
}

function TaskEditor({
  task,
  isEditing,
  onClose,
  onSave,
}: {
  task: TaskItem
  isEditing: boolean
  onClose: () => void
  onSave: (task: TaskItem) => void
}) {
  const [name, setName] = React.useState(task.name)
  const [description, setDescription] = React.useState(task.description)
  const [assignee, setAssignee] = React.useState(task.assignee)
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = React.useState(task.dueDate)
  const [status, setStatus] = React.useState<TaskStatus>(task.status)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="task-editor-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 id="task-editor-title" className="text-lg font-semibold">{isEditing ? "Edit task" : "Create task"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing ? "Update the task details below." : "Add a task and assign it to a teammate."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSave({ ...task, name: name.trim(), description: description.trim(), assignee, priority, dueDate, status })
          }}
          className="space-y-4 p-5"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Task name <span className="text-destructive">*</span></span>
            <input
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Review project drawings"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description</span>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add helpful context for the assignee..."
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Assignee</span>
              <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                {assignees.map((person) => <option key={person}>{person}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Due date</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                <option>To Do</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
              {isEditing ? <Check className="size-4" /> : <Plus className="size-4" />}
              {isEditing ? "Save changes" : "Create task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
