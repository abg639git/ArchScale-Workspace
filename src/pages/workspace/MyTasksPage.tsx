import * as React from "react"
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TaskStatus = "To Do" | "In Progress" | "Completed"
type TaskPriority = "High" | "Medium" | "Low"
type TaskItem = {
  id: string
  name: string
  description: string
  priority: TaskPriority
  dueDate: string
  status: TaskStatus
}

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
    priority: "High",
    dueDate: dateOffset(0),
    status: "In Progress",
  },
  {
    id: "TSK-1047",
    name: "Review revised lighting drawings",
    description: "Check the reflected ceiling plan against the latest coordination set.",
    priority: "High",
    dueDate: dateOffset(1),
    status: "To Do",
  },
  {
    id: "TSK-1046",
    name: "Prepare vendor comparison",
    description: "Compare lead times and pricing for the shortlisted suppliers.",
    priority: "Medium",
    dueDate: dateOffset(2),
    status: "In Progress",
  },
  {
    id: "TSK-1045",
    name: "Share meeting notes with stakeholders",
    description: "Send the action list from the weekly project review.",
    priority: "Low",
    dueDate: dateOffset(3),
    status: "To Do",
  },
  {
    id: "TSK-1044",
    name: "Update project finish schedule",
    description: "Add the approved finish codes and product references.",
    priority: "Medium",
    dueDate: dateOffset(5),
    status: "To Do",
  },
  {
    id: "TSK-1043",
    name: "Coordinate sample delivery",
    description: "Arrange delivery of the final stone samples to site.",
    priority: "High",
    dueDate: dateOffset(-1),
    status: "In Progress",
  },
  {
    id: "TSK-1042",
    name: "Approve joinery shop drawings",
    description: "Review dimensions and hardware selections before release.",
    priority: "Medium",
    dueDate: dateOffset(7),
    status: "Completed",
  },
  {
    id: "TSK-1041",
    name: "Create site visit checklist",
    description: "Prepare a concise checklist for the next site inspection.",
    priority: "Low",
    dueDate: dateOffset(9),
    status: "To Do",
  },
]

const statuses: TaskStatus[] = ["To Do", "In Progress", "Completed"]
const statusStyles: Record<TaskStatus, string> = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
}
const priorityStyles: Record<TaskPriority, string> = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
}
const today = dateOffset(0)

const formatDate = (date: string) => {
  if (!date) return "No due date"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

const summaryTabs = [
  { label: "Total Tasks", filter: "All tasks", icon: ListTodo, tone: "text-primary bg-primary/10" },
  { label: "To Do", filter: "To Do", icon: Circle, tone: "text-slate-600 bg-slate-100" },
  { label: "In Progress", filter: "In Progress", icon: Clock3, tone: "text-blue-700 bg-blue-50" },
  { label: "Completed", filter: "Completed", icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
] as const

export function MyTasksPage() {
  const [tasks, setTasks] = React.useState(initialTasks)
  const [activeFilter, setActiveFilter] = React.useState<string>("All tasks")
  const [search, setSearch] = React.useState("")

  const counts = React.useMemo(
    () => ({
      "All tasks": tasks.length,
      "To Do": tasks.filter((task) => task.status === "To Do").length,
      "In Progress": tasks.filter((task) => task.status === "In Progress").length,
      Completed: tasks.filter((task) => task.status === "Completed").length,
    }),
    [tasks]
  )

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = activeFilter === "All tasks" || task.status === activeFilter
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      `${task.name} ${task.id} ${task.description}`.toLowerCase().includes(normalizedSearch)
    return matchesStatus && matchesSearch
  })

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-6 xl:p-8">
        <header>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">My tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep track of the work assigned to you.
          </p>
        </header>

        <section
          aria-label="Task summary filters"
          className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4"
        >
          {summaryTabs.map(({ label, filter, icon: Icon, tone }) => {
            const isSelected = activeFilter === filter
            return (
              <button
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex min-w-0 items-center justify-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors sm:after:inset-x-4",
                  isSelected ? "bg-primary/[0.04] text-foreground after:bg-primary" : "text-muted-foreground after:bg-transparent"
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{label}</span>
                </span>
                <span className={cn(
                  "min-w-7 rounded-md px-1.5 py-0.5 text-center text-sm font-semibold tabular-nums",
                  isSelected ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                )}>
                  {counts[filter]}
                </span>
              </button>
            )
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold">{activeFilter}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Showing {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
              </p>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search my tasks..."
                aria-label="Search my tasks"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="h-11 border-b border-border bg-[#1e293b] text-white">
                  <th scope="col" className="px-5 text-left text-xs font-semibold uppercase tracking-wide text-white/80">Task name</th>
                  <th scope="col" className="px-4 text-left text-xs font-semibold uppercase tracking-wide text-white/80">Priority</th>
                  <th scope="col" className="px-4 text-left text-xs font-semibold uppercase tracking-wide text-white/80">Due date</th>
                  <th scope="col" className="px-4 text-left text-xs font-semibold uppercase tracking-wide text-white/80">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const overdue = task.dueDate && task.dueDate < today && task.status !== "Completed"
                  return (
                    <tr key={task.id} className={cn(
                      "group h-[68px] transition-colors hover:bg-muted/30",
                      overdue && "bg-rose-50/40"
                    )}>
                      <td className="max-w-[420px] px-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg",
                            task.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"
                          )}>
                            {task.status === "Completed" ? <Check className="size-4" /> : <ListTodo className="size-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{task.name}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{task.id}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", priorityStyles[task.priority])}>
                          <span className={cn("size-1.5 rounded-full", task.priority === "High" ? "bg-rose-500" : task.priority === "Medium" ? "bg-amber-500" : "bg-slate-400")} />
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4">
                        <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-sm", overdue && "font-medium text-rose-600", !task.dueDate && "text-muted-foreground")}>
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          {overdue ? "Overdue · " : ""}{formatDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="px-4">
                        <label className="sr-only" htmlFor={`my-task-status-${task.id}`}>Status for {task.name}</label>
                        <select
                          id={`my-task-status-${task.id}`}
                          value={task.status}
                          onChange={(event) => {
                            const status = event.target.value as TaskStatus
                            setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item))
                          }}
                          className={cn("h-8 rounded-full border-0 px-2.5 text-xs font-medium outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-primary", statusStyles[task.status])}
                        >
                          {statuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Search className="size-4" />
                      </span>
                      <p className="text-sm font-medium">No tasks found</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try another search or status filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
