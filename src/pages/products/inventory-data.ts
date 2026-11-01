export type ItemCategory = "Curtains" | "Sample books" | "Sheers" | "Upholstery"

export type InventoryItem = {
  id: string
  name: string
  code: string
  category: ItemCategory
  finish: string
  size: string
  stock: number
  color: string
  isSample: boolean
}

export const categories: ItemCategory[] = ["Curtains", "Sample books", "Sheers", "Upholstery"]

export const initialItems: InventoryItem[] = [
  { id: "IT-1001", name: "Savana-V&J", code: "IT-1001", category: "Curtains", finish: "Jacquard", size: "140 cm wide", stock: 35, color: "#d8c6b0", isSample: true },
  { id: "IT-1002", name: "Conrad-DJ", code: "IT-1002", category: "Curtains", finish: "Dobby", size: "140 cm wide", stock: 28, color: "#4a4a4a", isSample: true },
  { id: "IT-2001", name: "After Hours", code: "IT-2001", category: "Sample books", finish: "Upholstery collection", size: "Swatch book", stock: 6, color: "#8c8c8c", isSample: true },
  { id: "IT-1003", name: "Oslo-FM", code: "IT-1003", category: "Sheers", finish: "Linen sheer", size: "280 cm wide", stock: 63, color: "#ededed", isSample: true },
  { id: "IT-2002", name: "Solitude Sheers", code: "IT-2002", category: "Sample books", finish: "Sheers collection", size: "Swatch book", stock: 9, color: "#ece7d9", isSample: true },
  { id: "IT-2003", name: "Savana Stripe", code: "IT-2003", category: "Sample books", finish: "Cotton stripe", size: "Swatch book", stock: 12, color: "#b99d79", isSample: true },
  { id: "IT-2004", name: "Conrad Velvet", code: "IT-2004", category: "Sample books", finish: "Velvet swatch", size: "Swatch book", stock: 18, color: "#9ba99c", isSample: true },
  { id: "IT-2005", name: "After Hours Bouclé", code: "IT-2005", category: "Upholstery", finish: "Bouclé upholstery", size: "140 cm wide", stock: 14, color: "#cbbbab", isSample: true },
  { id: "IT-2006", name: "Oslo Chenille", code: "IT-2006", category: "Upholstery", finish: "Chenille upholstery", size: "140 cm wide", stock: 22, color: "#bca9a2", isSample: true },
  { id: "IT-1004", name: "Linen Voile", code: "IT-1004", category: "Sheers", finish: "Linen voile", size: "280 cm wide", stock: 32, color: "#e4e0d7", isSample: true },
  { id: "IT-2007", name: "Terrazzo Fabric", code: "IT-2007", category: "Sample books", finish: "Geometric textile", size: "Swatch book", stock: 5, color: "#a4a28e", isSample: true },
  { id: "IT-2008", name: "Studio Collection", code: "IT-2008", category: "Sample books", finish: "Mixed finish collection", size: "Sample pack", stock: 11, color: "#9aafbd", isSample: true },
]