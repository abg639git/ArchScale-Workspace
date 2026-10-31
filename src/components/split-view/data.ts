export type DirectoryType = "organization" | "person"

export type DirectoryStatus = "active" | "pending" | "inactive"

export type Stakeholder = {
  name: string
  role: string
  email: string
}

export type RelatedInfo = {
  label: string
  value: string
}

export type DirectoryEntry = {
  id: string
  type: DirectoryType
  name: string
  role: string
  summary: string
  initials: string
  status: DirectoryStatus
  city: string
  address: string[]
  email: string
  phone: string
  website?: string
  since: string
  tags: string[]
  stakeholders: Stakeholder[]
  related: RelatedInfo[]
}

export const statusLabel: Record<DirectoryStatus, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
}

export const typeLabel: Record<DirectoryType, string> = {
  organization: "Organization",
  person: "Individual",
}

export const getInitials = (name: string) =>
  name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")

const referenceContact = (
  id: string,
  name: string,
  role: string,
  organization: string,
  tags: string[]
): DirectoryEntry => ({
  id,
  type: "person",
  name,
  role: `${role} · ${organization}`,
  summary: `${role} at ${organization}.`,
  initials: getInitials(name),
  status: "active",
  city: "—",
  address: ["—"],
  email: `${id}@example.com`,
  phone: "—",
  since: "—",
  tags,
  stakeholders: [],
  related: [
    { label: "Organisation", value: organization },
    { label: "Location", value: "—" },
  ],
})

export const directoryData: DirectoryEntry[] = [
  {
    id: "karan-mehra",
    type: "person",
    name: "Karan Mehra",
    role: "Director · Mehra Constructions",
    summary: "Director at Mehra Constructions.",
    initials: "KM",
    status: "active",
    city: "Mumbai",
    address: ["Mumbai, India"],
    email: "karan@mehra.in",
    phone: "+91 98200 11204",
    since: "—",
    tags: ["Client", "KAM"],
    stakeholders: [],
    related: [
      { label: "Organisation", value: "Mehra Constructions" },
      { label: "Alternate", value: "—" },
      { label: "Location", value: "Mumbai" },
    ],
  },
  referenceContact("neha-kulkarni", "Neha Kulkarni", "Principal", "Studio Anand Associates", ["Studio", "STD"]),
  referenceContact("anil-terra", "Anil Terra", "Managing Partner", "Terra Partners", ["Client", "VIP"]),
  referenceContact("meera-joshi", "Meera Joshi", "Design Lead", "Greenleaf Architects", ["Studio", "STD"]),
  referenceContact("sunil-rao", "Sunil Rao", "Owner", "Kaveri Interiors", ["Studio", "STD"]),
  referenceContact("sachi", "Sachi", "Coordinator", "Greenleaf Architects", ["Studio", "STD"]),
  referenceContact("rohan-mehta", "Rohan Mehta", "Inventory / Accounts", "Greenleaf Architects", ["Studio", "STD"]),
  referenceContact("dev-patel", "Dev Patel", "Sales Head", "Aarav Stoneworks", ["Client", "PRF"]),
  referenceContact("isha-rao", "Isha Rao", "Account Manager", "Lumen Lighting Co", ["Partner", "PRF"]),
  {
    id: "acme-robotics",
    type: "organization",
    name: "Acme Robotics Pvt. Ltd.",
    role: "Industrial Automation",
    summary:
      "Precision robotics manufacturer supplying assembly lines across APAC. Primary enterprise account for the automation module.",
    initials: "AR",
    status: "active",
    city: "Bengaluru, Karnataka",
    address: [
      "No. 14, Prestige Tech Park",
      "Outer Ring Road, Marathahalli",
      "Bengaluru, Karnataka 560103",
      "India",
    ],
    email: "hello@acmerobotics.io",
    phone: "+91 80 4123 8890",
    website: "acmerobotics.io",
    since: "March 2019",
    tags: ["Manufacturing", "ISO 9001", "Enterprise"],
    stakeholders: [
      { name: "Vikram Sethi", role: "VP Engineering", email: "v.sethi@acmerobotics.io" },
      { name: "Priya Nair", role: "Procurement Head", email: "priya.nair@acmerobotics.io" },
      { name: "Arjun Mehta", role: "Plant Manager", email: "arjun.mehta@acmerobotics.io" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1042" },
      { label: "Account owner", value: "Jasmine Kaur" },
      { label: "Plan", value: "Enterprise" },
      { label: "Last activity", value: "2 hours ago" },
    ],
  },
  {
    id: "northwind-logistics",
    type: "organization",
    name: "Northwind Logistics",
    role: "Supply Chain & Freight",
    summary:
      "Integrated freight and warehousing partner handling inbound logistics for three regional distribution hubs.",
    initials: "NL",
    status: "active",
    city: "Pune, Maharashtra",
    address: [
      "Suite 402, Amar Business Zone",
      "Baner Road, Baner",
      "Pune, Maharashtra 411045",
      "India",
    ],
    email: "ops@northwindlogistics.com",
    phone: "+91 20 6788 1200",
    website: "northwindlogistics.com",
    since: "July 2021",
    tags: ["Logistics", "Tier-1 Vendor"],
    stakeholders: [
      { name: "Meera Iyer", role: "Procurement Head", email: "meera.iyer@northwindlogistics.com" },
      { name: "Sandeep Rao", role: "Fleet Operations Lead", email: "sandeep.rao@northwindlogistics.com" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1187" },
      { label: "Account owner", value: "John Doe" },
      { label: "Plan", value: "Growth" },
      { label: "Last activity", value: "Yesterday" },
    ],
  },
  {
    id: "initech-labs",
    type: "organization",
    name: "Initech Software Labs",
    role: "Cloud SaaS Platform",
    summary:
      "Long-standing technology partner providing the hosted runtime and CI pipelines used by the delivery teams.",
    initials: "IS",
    status: "active",
    city: "Hyderabad, Telangana",
    address: [
      "Level 5, Cyber Towers",
      "HITEC City, Madhapur",
      "Hyderabad, Telangana 500081",
      "India",
    ],
    email: "hello@initech.dev",
    phone: "+91 40 4555 2210",
    website: "initech.dev",
    since: "February 2020",
    tags: ["SaaS", "SOC 2", "Partner"],
    stakeholders: [
      { name: "Rhea Kapoor", role: "Chief Technology Officer", email: "rhea@initech.dev" },
      { name: "Daniel Fernandes", role: "Customer Success Manager", email: "daniel@initech.dev" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1103" },
      { label: "Account owner", value: "Jasmine Kaur" },
      { label: "Plan", value: "Enterprise" },
      { label: "Last activity", value: "4 days ago" },
    ],
  },
  {
    id: "umbrella-health",
    type: "organization",
    name: "Umbrella Health Systems",
    role: "Healthcare & Diagnostics",
    summary:
      "Diagnostics network onboarded this quarter. Contracting and compliance review is still in progress.",
    initials: "UH",
    status: "pending",
    city: "Chennai, Tamil Nadu",
    address: [
      "Umbrella Towers, 3rd Floor",
      "12 Cathedral Road",
      "Chennai, Tamil Nadu 600086",
      "India",
    ],
    email: "contact@umbrellahealth.in",
    phone: "+91 44 2820 4477",
    website: "umbrellahealth.in",
    since: "September 2023",
    tags: ["Healthcare", "Onboarding", "Compliance"],
    stakeholders: [
      { name: "Dr. Ananya Rao", role: "Chief Medical Officer", email: "a.rao@umbrellahealth.in" },
      { name: "Kavya Srinivasan", role: "Compliance Lead", email: "kavya.s@umbrellahealth.in" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1264" },
      { label: "Account owner", value: "Ritik Verma" },
      { label: "Plan", value: "Growth" },
      { label: "Last activity", value: "3 days ago" },
    ],
  },
  {
    id: "globex-energy",
    type: "organization",
    name: "Globex Energy Ltd.",
    role: "Renewable Energy",
    summary:
      "Utility-scale solar operator with a multi-site rollout planned for the next two financial quarters.",
    initials: "GE",
    status: "active",
    city: "Ahmedabad, Gujarat",
    address: [
      "Globex House, SG Highway",
      "Thaltej Cross Road",
      "Ahmedabad, Gujarat 380059",
      "India",
    ],
    email: "info@globexenergy.co.in",
    phone: "+91 79 6612 9030",
    website: "globexenergy.co.in",
    since: "November 2018",
    tags: ["Energy", "ISO 14001", "Expansion"],
    stakeholders: [
      { name: "Harsh Vora", role: "Operations Director", email: "harsh.vora@globexenergy.co.in" },
      { name: "Nisha Patel", role: "Finance Controller", email: "nisha.patel@globexenergy.co.in" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1019" },
      { label: "Account owner", value: "John Doe" },
      { label: "Plan", value: "Enterprise" },
      { label: "Last activity", value: "6 hours ago" },
    ],
  },
  {
    id: "bluepeak-analytics",
    type: "organization",
    name: "Bluepeak Analytics",
    role: "Data & Analytics Services",
    summary:
      "Dormant account following a reorganisation. Kept for reference on the legacy reporting integration.",
    initials: "BA",
    status: "inactive",
    city: "Gurugram, Haryana",
    address: [
      "Tower C, Cyber City Phase 2",
      "DLF Phase 3",
      "Gurugram, Haryana 122002",
      "India",
    ],
    email: "team@bluepeak.io",
    phone: "+91 124 4567 890",
    website: "bluepeak.io",
    since: "May 2022",
    tags: ["Analytics", "Dormant"],
    stakeholders: [
      { name: "Rohit Malhotra", role: "Founder", email: "rohit@bluepeak.io" },
      { name: "Sara Ali", role: "Analytics Lead", email: "sara@bluepeak.io" },
    ],
    related: [
      { label: "Account ID", value: "ORG-1211" },
      { label: "Account owner", value: "Jasmine Kaur" },
      { label: "Plan", value: "Starter" },
      { label: "Last activity", value: "2 months ago" },
    ],
  },
  {
    id: "ananya-rao",
    type: "person",
    name: "Dr. Ananya Rao",
    role: "Chief Medical Officer · Umbrella Health",
    summary:
      "Executive sponsor for the diagnostics rollout and the main clinical approver for all pilot milestones.",
    initials: "AR",
    status: "active",
    city: "Chennai, Tamil Nadu",
    address: [
      "Flat 8B, Alwarpet Avenue",
      "123rd Cross, Alwarpet",
      "Chennai, Tamil Nadu 600018",
      "India",
    ],
    email: "a.rao@umbrellahealth.in",
    phone: "+91 98400 12234",
    since: "September 2023",
    tags: ["Decision maker", "Clinical", "Key contact"],
    stakeholders: [
      { name: "Kavya Srinivasan", role: "Compliance Lead", email: "kavya.s@umbrellahealth.in" },
      { name: "Vikram Sethi", role: "Partner Engineering Lead", email: "v.sethi@acmerobotics.io" },
    ],
    related: [
      { label: "Record ID", value: "PER-2081" },
      { label: "Reports to", value: "Board of Directors" },
      { label: "Department", value: "Clinical Operations" },
      { label: "Last activity", value: "Yesterday" },
    ],
  },
  {
    id: "vikram-sethi",
    type: "person",
    name: "Vikram Sethi",
    role: "VP Engineering · Acme Robotics",
    summary:
      "Technical owner of the automation integration and reviewer for all architecture change requests.",
    initials: "VS",
    status: "active",
    city: "Bengaluru, Karnataka",
    address: [
      "402, Sobha Arena",
      "Kanakapura Road, Konanakunte",
      "Bengaluru, Karnataka 560062",
      "India",
    ],
    email: "v.sethi@acmerobotics.io",
    phone: "+91 99001 45522",
    since: "March 2019",
    tags: ["Technical", "Approver"],
    stakeholders: [
      { name: "Priya Nair", role: "Procurement Head", email: "priya.nair@acmerobotics.io" },
      { name: "Arjun Mehta", role: "Plant Manager", email: "arjun.mehta@acmerobotics.io" },
    ],
    related: [
      { label: "Record ID", value: "PER-1043" },
      { label: "Reports to", value: "CEO — Asha Verma" },
      { label: "Department", value: "Engineering" },
      { label: "Last activity", value: "3 hours ago" },
    ],
  },
  {
    id: "jasmine-kaur",
    type: "person",
    name: "Jasmine Kaur",
    role: "Project Lead · Internal Delivery",
    summary:
      "Coordinates delivery across all active accounts and owns the weekly status and escalation thread.",
    initials: "JK",
    status: "active",
    city: "Chandigarh",
    address: [
      "18-A, Sector 9-C",
      "Chandigarh",
      "Chandigarh 160009",
      "India",
    ],
    email: "jasmine.kaur@example.com",
    phone: "+91 98720 33410",
    since: "January 2022",
    tags: ["Internal", "Delivery", "Owner"],
    stakeholders: [
      { name: "John Doe", role: "Principal Architect", email: "john@example.com" },
      { name: "Ritik Verma", role: "Design Lead", email: "ritik.verma@example.com" },
    ],
    related: [
      { label: "Record ID", value: "PER-1002" },
      { label: "Reports to", value: "Head of Delivery" },
      { label: "Department", value: "Delivery Management" },
      { label: "Last activity", value: "1 hour ago" },
    ],
  },
  {
    id: "john-doe",
    type: "person",
    name: "John Doe",
    role: "Principal Architect · Internal Delivery",
    summary:
      "Owns the platform architecture for the dual-sidebar workspace and reviews all structural changes.",
    initials: "JD",
    status: "active",
    city: "Bengaluru, Karnataka",
    address: [
      "12, Richmond Road",
      "Ashok Nagar",
      "Bengaluru, Karnataka 560025",
      "India",
    ],
    email: "john@example.com",
    phone: "+91 90080 71234",
    since: "June 2021",
    tags: ["Internal", "Architecture"],
    stakeholders: [
      { name: "Jasmine Kaur", role: "Project Lead", email: "jasmine.kaur@example.com" },
      { name: "Vikram Sethi", role: "VP Engineering", email: "v.sethi@acmerobotics.io" },
    ],
    related: [
      { label: "Record ID", value: "PER-1001" },
      { label: "Reports to", value: "Head of Engineering" },
      { label: "Department", value: "Platform" },
      { label: "Last activity", value: "Just now" },
    ],
  },
  {
    id: "ritik-verma",
    type: "person",
    name: "Ritik Verma",
    role: "Design Lead · Internal Delivery",
    summary:
      "Drives the enterprise design system, interaction patterns and the quarterly interface refresh.",
    initials: "RV",
    status: "pending",
    city: "New Delhi",
    address: [
      "C-74, Lajpat Nagar II",
      "New Delhi",
      "Delhi 110024",
      "India",
    ],
    email: "ritik.verma@example.com",
    phone: "+91 98110 25567",
    since: "August 2022",
    tags: ["Internal", "Design"],
    stakeholders: [
      { name: "Jasmine Kaur", role: "Project Lead", email: "jasmine.kaur@example.com" },
      { name: "John Doe", role: "Principal Architect", email: "john@example.com" },
    ],
    related: [
      { label: "Record ID", value: "PER-1017" },
      { label: "Reports to", value: "Head of Design" },
      { label: "Department", value: "Product Design" },
      { label: "Last activity", value: "2 days ago" },
    ],
  },
  {
    id: "meera-iyer",
    type: "person",
    name: "Meera Iyer",
    role: "Procurement Head · Northwind Logistics",
    summary:
      "Commercial point of contact for freight contracts, rate cards and annual renewal negotiations.",
    initials: "MI",
    status: "inactive",
    city: "Pune, Maharashtra",
    address: [
      "9, Prabhat Road",
      "Deccan Gymkhana",
      "Pune, Maharashtra 411004",
      "India",
    ],
    email: "meera.iyer@northwindlogistics.com",
    phone: "+91 97640 88012",
    since: "July 2021",
    tags: ["Commercial", "Renewal"],
    stakeholders: [
      { name: "Sandeep Rao", role: "Fleet Operations Lead", email: "sandeep.rao@northwindlogistics.com" },
      { name: "John Doe", role: "Account owner", email: "john@example.com" },
    ],
    related: [
      { label: "Record ID", value: "PER-1155" },
      { label: "Reports to", value: "COO — Amit Kulkarni" },
      { label: "Department", value: "Procurement" },
      { label: "Last activity", value: "3 weeks ago" },
    ],
  },
]
