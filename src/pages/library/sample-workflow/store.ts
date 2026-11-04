/**
 * Centralised frontend store for the Sample Management workflow.
 *
 * Why a store instead of five independent `usePersistentState` keys:
 *  - all five stages read and write ONE document, so a quantity changed in
 *    Stage 2 is immediately visible in Stages 3-5 (task §8);
 *  - every write goes through a single transaction that also refreshes the
 *    derived Issued-report projection, so no screen can drift;
 *  - the shape mirrors a future API (`GET /sample-workflow`), so swapping the
 *    localStorage read/write for `fetch` later does not touch the UI.
 *
 * Frontend simulation only — nothing here talks to a server.
 */

import * as React from "react"
import { initialItems, type InventoryItem } from "@/pages/products/inventory-data"
import type { WorkflowDocument } from "./types"
import { emptyWorkflowDocument } from "./types"
import {
  allocateReservations,
  buildIssuedReportProjection,
  type Allocation,
} from "./logic"
import { migrateLegacyWorkflow } from "./migrate"
import { buildDemoWorkflow } from "./demo"

export const WORKFLOW_STORAGE_KEY = "archscale.sampleWorkflow.v2"
export const INVENTORY_STORAGE_KEY = "archscale.inventory.items"
export const ISSUED_REPORT_STORAGE_KEY = "archscale.samples.requests"
export const WORKFLOW_EVENT = "archscale:workflow-updated"
export const INVENTORY_EVENT = "archscale:inventory-updated"

/* ------------------------------------------------------------ storage utils */

const hasWindow = (): boolean => typeof window !== "undefined"

function readJson<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

/** Writes every entry; rolls all of them back if any write fails. */
function persist(entries: Array<{ key: string; value: unknown }>): string | null {
  if (!hasWindow()) return "Browser storage is unavailable."
  const previous = entries.map((entry) => ({
    key: entry.key,
    value: safeGet(entry.key),
  }))
  try {
    entries.forEach((entry) => {
      window.localStorage.setItem(entry.key, JSON.stringify(entry.value))
    })
    return null
  } catch {
    previous.forEach((entry) => {
      try {
        if (entry.value === null) window.localStorage.removeItem(entry.key)
        else window.localStorage.setItem(entry.key, entry.value)
      } catch {
        // Rollback is best effort; the original error is reported to the caller.
      }
    })
    return "Browser storage is unavailable, so the change was not saved."
  }
}

function safeGet(key: string): string | null {
  if (!hasWindow()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------- caches */

let workflowCache: WorkflowDocument | null = null
let inventoryCache: InventoryItem[] | null = null
const workflowListeners = new Set<() => void>()
const inventoryListeners = new Set<() => void>()

function notify(listeners: Set<() => void>): void {
  listeners.forEach((listener) => listener())
}

function bootstrapWorkflow(): WorkflowDocument {
  const stored = readJson<WorkflowDocument | null>(WORKFLOW_STORAGE_KEY, null)
  if (stored && Array.isArray(stored.requests)) {
    return { ...emptyWorkflowDocument(), ...stored }
  }

  const migrated = migrateLegacyWorkflow((key) => safeGet(key))
  if (migrated) {
    workflowCache = migrated
    const error = persist([{ key: WORKFLOW_STORAGE_KEY, value: migrated }])
    if (error) return migrated
    writeProjection(migrated)
    return migrated
  }

  // Nothing stored yet → seed the realistic demo workflow (task §10).
  const seed = buildDemoWorkflow(getInventory())
  const error = persist([
    { key: WORKFLOW_STORAGE_KEY, value: seed.document },
    { key: INVENTORY_STORAGE_KEY, value: seed.items },
  ])
  if (!error) {
    inventoryCache = seed.items
    writeProjection(seed.document)
  }
  return seed.document
}

function writeProjection(document: WorkflowDocument): void {
  // Derived shape consumed by Products → Issued report (single source of truth).
  persist([
    { key: ISSUED_REPORT_STORAGE_KEY, value: buildIssuedReportProjection(document) },
  ])
}

/* -------------------------------------------------------------- workflow API */

export function getWorkflow(): WorkflowDocument {
  if (!workflowCache) workflowCache = bootstrapWorkflow()
  return workflowCache
}

export function subscribeWorkflow(listener: () => void): () => void {
  workflowListeners.add(listener)
  return () => {
    workflowListeners.delete(listener)
  }
}

/**
 * Replaces the document, persists it (with rollback on failure) and refreshes
 * the derived issued-report projection. Returns an error message or null.
 */
export function commitWorkflow(next: WorkflowDocument): string | null {
  const previous = workflowCache
  workflowCache = { ...next, version: 2 }
  const error = persist([{ key: WORKFLOW_STORAGE_KEY, value: workflowCache }])
  if (error) {
    workflowCache = previous
    return error
  }
  writeProjection(workflowCache)
  if (hasWindow()) window.dispatchEvent(new CustomEvent(WORKFLOW_EVENT))
  notify(workflowListeners)
  return null
}

/** Runs a mutation against the current document. Returns an error or null. */
export function updateWorkflow(mutate: (document: WorkflowDocument) => WorkflowDocument): string | null {
  return commitWorkflow(mutate(getWorkflow()))
}

/* -------------------------------------------------------------- inventory API */

export function getInventory(): InventoryItem[] {
  if (!inventoryCache) inventoryCache = readJson<InventoryItem[]>(INVENTORY_STORAGE_KEY, initialItems)
  return inventoryCache
}

export function subscribeInventory(listener: () => void): () => void {
  inventoryListeners.add(listener)
  if (!hasWindow()) return () => undefined

  const onExternalChange = (event: Event) => {
    const supplied =
      event instanceof CustomEvent
        ? (event.detail as { items?: InventoryItem[] } | undefined)?.items
        : undefined
    inventoryCache = supplied && Array.isArray(supplied)
      ? supplied
      : readJson<InventoryItem[]>(INVENTORY_STORAGE_KEY, initialItems)
    listener()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === INVENTORY_STORAGE_KEY) onExternalChange(event)
  }
  window.addEventListener(INVENTORY_EVENT, onExternalChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(INVENTORY_EVENT, onExternalChange)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * Writes workflow + inventory in one transaction so a stock-out (Stage 2) or a
 * stock-in (Stage 5) can never half-apply. Rolls both back on storage failure.
 */
export function commitWithInventory(
  document: WorkflowDocument,
  items: InventoryItem[]
): string | null {
  const previousWorkflow = workflowCache
  const previousInventory = inventoryCache
  workflowCache = { ...document, version: 2 }
  inventoryCache = items

  const error = persist([
    { key: WORKFLOW_STORAGE_KEY, value: workflowCache },
    { key: INVENTORY_STORAGE_KEY, value: inventoryCache },
  ])
  if (error) {
    workflowCache = previousWorkflow
    inventoryCache = previousInventory
    return error
  }
  writeProjection(workflowCache)
  if (hasWindow()) {
    window.dispatchEvent(new CustomEvent(WORKFLOW_EVENT))
    window.dispatchEvent(new CustomEvent(INVENTORY_EVENT, { detail: { items: inventoryCache } }))
  }
  notify(workflowListeners)
  notify(inventoryListeners)
  return null
}

/* ------------------------------------------------------------------ selectors */

export const useWorkflow = (): WorkflowDocument =>
  React.useSyncExternalStore(subscribeWorkflow, getWorkflow, getWorkflow)

export const useInventory = (): InventoryItem[] =>
  React.useSyncExternalStore(subscribeInventory, getInventory, getInventory)

/** FIFO stock allocation for the current document (recomputed on every read). */
export const useAllocation = (): Allocation => {
  const document = useWorkflow()
  const items = useInventory()
  return React.useMemo(
    () => allocateReservations(document.requests, document.issues, items),
    [document, items]
  )
}

/* ------------------------------------------------------------------- actions */

export type ResetMode = "demo" | "empty"

/** Clears the workflow (and optionally the demo seed) for a clean test run. */
export function resetWorkflow(mode: ResetMode): string | null {
  const items = getInventory()
  if (mode === "empty") {
    const empty = emptyWorkflowDocument()
    workflowCache = empty
    const error = persist([
      { key: WORKFLOW_STORAGE_KEY, value: empty },
      { key: ISSUED_REPORT_STORAGE_KEY, value: [] },
    ])
    if (error) return error
    if (hasWindow()) window.dispatchEvent(new CustomEvent(WORKFLOW_EVENT))
    notify(workflowListeners)
    return null
  }

  const seed = buildDemoWorkflow(readJson<InventoryItem[]>(INVENTORY_STORAGE_KEY, initialItems))
  const error = commitWithInventory(seed.document, seed.items)
  return error
}
