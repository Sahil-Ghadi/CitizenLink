export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  severity: 'emergency' | 'high' | 'medium' | 'low';
  status: 'submitted' | 'in-progress' | 'resolved' | 'emergency';
  location: string;
  coordinates: { lat: number; lng: number };
  citizenName: string;
  citizenVerified: boolean;
  createdAt: string;
  updatedAt: string;
  aiSummary: string;
  recommendedAction: string;
  priorityScore: number;
  photoUrl?: string;
  rating?: number;
  estimatedDays: number;
  similarCases: number;
}

export interface Message {
  id: string;
  sender: 'citizen' | 'agent';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'update' | 'resolved' | 'alert' | 'info';
}

export const citizenUser = {
  name: "Aditya",
  fullName: "Aditya Sharma",
  email: "aditya.sharma@gmail.com",
  phone: "+91 98765 43210",
  verified: true,
  totalReported: 12,
  active: 4,
  resolved: 8,
  pin: "400028",
};

export const agentUser = {
  name: "Priya Mehta",
  department: "Public Works",
  badge: "AGT-4X92K",
  assignedToday: 7,
  resolvedToday: 3,
  avgResolutionHours: 36,
  overdue: 2,
};

export const tickets: Ticket[] = [
  {
    id: "PS-2025-00847",
    title: "Broken water main flooding street",
    description: "A large water main has burst near the intersection of MG Road and Station Road, causing significant flooding. Multiple vehicles stuck. Water is ankle-deep and spreading to nearby shops.",
    category: "Water Supply",
    department: "Water & Sewage",
    severity: "emergency",
    status: "emergency",
    location: "MG Road & Station Road, Bandra West",
    coordinates: { lat: 19.0596, lng: 72.8295 },
    citizenName: "Aditya Sharma",
    citizenVerified: true,
    createdAt: "2025-02-27T06:30:00",
    updatedAt: "2025-02-27T07:15:00",
    aiSummary: "Critical water main rupture causing street flooding. Multiple citizens affected. Requires emergency dispatch.",
    recommendedAction: "Dispatch emergency water maintenance crew. Close road to traffic. Alert traffic police.",
    priorityScore: 98,
    estimatedDays: 1,
    similarCases: 12,
  },
  {
    id: "PS-2025-00842",
    title: "Streetlight out on residential lane",
    description: "Three consecutive streetlights on Lane 4 in Khar West have been out for over a week. Area is very dark at night, creating safety concerns especially for women.",
    category: "Street Lighting",
    department: "Electrical",
    severity: "medium",
    status: "in-progress",
    location: "Lane 4, Khar West",
    coordinates: { lat: 19.0728, lng: 72.8347 },
    citizenName: "Aditya Sharma",
    citizenVerified: true,
    createdAt: "2025-02-20T14:00:00",
    updatedAt: "2025-02-25T09:30:00",
    aiSummary: "Multiple streetlights non-functional for 7+ days in residential area. Safety concern flagged.",
    recommendedAction: "Schedule electrical inspection. Replace faulty bulbs/wiring.",
    priorityScore: 65,
    estimatedDays: 3,
    similarCases: 47,
  },
  {
    id: "PS-2025-00838",
    title: "Garbage not collected for 3 days",
    description: "The community garbage bins at Sector 7 junction have not been emptied in 3 days. Overflowing waste is causing stench and attracting stray animals.",
    category: "Sanitation",
    department: "Sanitation",
    severity: "high",
    status: "submitted",
    location: "Sector 7 Junction, Andheri East",
    coordinates: { lat: 19.1136, lng: 72.8697 },
    citizenName: "Rajesh Kumar",
    citizenVerified: true,
    createdAt: "2025-02-26T08:00:00",
    updatedAt: "2025-02-26T08:00:00",
    aiSummary: "Waste collection missed for 3 consecutive days. Health hazard developing. Multiple bins overflowing.",
    recommendedAction: "Priority pickup dispatch. Review route schedule. Warn contractor.",
    priorityScore: 78,
    estimatedDays: 1,
    similarCases: 23,
  },
  {
    id: "PS-2025-00830",
    title: "Pothole causing accidents on highway",
    description: "A large pothole approximately 2 feet wide has appeared on the Western Express Highway near Goregaon exit. Two minor accidents reported.",
    category: "Roads",
    department: "Roads & Transport",
    severity: "high",
    status: "in-progress",
    location: "Western Express Highway, Goregaon",
    coordinates: { lat: 19.1663, lng: 72.8526 },
    citizenName: "Sneha Patel",
    citizenVerified: false,
    createdAt: "2025-02-22T11:00:00",
    updatedAt: "2025-02-26T16:00:00",
    aiSummary: "Dangerous pothole on major highway. Accidents already occurring. Urgent repair needed.",
    recommendedAction: "Temporary barricading ASAP. Schedule repair crew for off-peak hours.",
    priorityScore: 88,
    estimatedDays: 2,
    similarCases: 31,
  },
  {
    id: "PS-2025-00820",
    title: "Park maintenance neglected",
    description: "Joggers Park in Bandra has overgrown grass, broken benches, and non-functional drinking water fountain. Regular maintenance appears halted.",
    category: "Parks & Gardens",
    department: "Parks",
    severity: "low",
    status: "resolved",
    location: "Joggers Park, Bandra West",
    coordinates: { lat: 19.0508, lng: 72.8206 },
    citizenName: "Aditya Sharma",
    citizenVerified: true,
    createdAt: "2025-02-10T09:00:00",
    updatedAt: "2025-02-24T14:00:00",
    aiSummary: "General park maintenance required. Non-urgent but affects community amenity usage.",
    recommendedAction: "Schedule routine maintenance. Repair fountain. Replace broken furniture.",
    priorityScore: 35,
    rating: 4,
    estimatedDays: 7,
    similarCases: 15,
  },
  {
    id: "PS-2025-00815",
    title: "Noise pollution from construction site",
    description: "Construction work at the new commercial complex on SV Road continues past 10 PM daily, violating noise regulations.",
    category: "Noise Pollution",
    department: "Environment",
    severity: "medium",
    status: "resolved",
    location: "SV Road, Borivali West",
    coordinates: { lat: 19.2307, lng: 72.8567 },
    citizenName: "Aditya Sharma",
    citizenVerified: true,
    createdAt: "2025-02-05T22:00:00",
    updatedAt: "2025-02-18T10:00:00",
    aiSummary: "Noise regulation violation by construction site. After-hours work reported.",
    recommendedAction: "Issue warning notice. Schedule inspection. Enforce penalties if repeated.",
    priorityScore: 52,
    rating: 5,
    estimatedDays: 5,
    similarCases: 8,
  },
];

export const ticketMessages: Record<string, Message[]> = {
  "PS-2025-00842": [
    { id: "m1", sender: "citizen", senderName: "Aditya Sharma", text: "The streetlights have been out for a week now. It's really unsafe at night.", timestamp: "2025-02-20T14:00:00" },
    { id: "m2", sender: "agent", senderName: "Priya Mehta", text: "Thank you for reporting. We've dispatched an inspection team. Expected visit: Feb 22.", timestamp: "2025-02-21T09:00:00" },
    { id: "m3", sender: "citizen", senderName: "Aditya Sharma", text: "The team came but only fixed one light. Two are still out.", timestamp: "2025-02-23T18:00:00" },
    { id: "m4", sender: "agent", senderName: "Priya Mehta", text: "We apologize for the incomplete work. A follow-up crew has been scheduled for Feb 26.", timestamp: "2025-02-24T10:00:00" },
  ],
};

export const notifications: Notification[] = [
  { id: "n1", title: "Ticket Updated", message: "PS-2025-00842 status changed to In Progress", time: "2 min ago", read: false, type: "update" },
  { id: "n2", title: "Issue Resolved", message: "PS-2025-00820 has been marked as resolved", time: "1 hour ago", read: false, type: "resolved" },
  { id: "n3", title: "Emergency Alert", message: "Water main burst reported near your area", time: "3 hours ago", read: true, type: "alert" },
  { id: "n4", title: "Weekly Summary", message: "4 issues resolved in your area this week", time: "1 day ago", read: true, type: "info" },
];

export const departments = [
  "Water & Sewage", "Electrical", "Sanitation", "Roads & Transport", 
  "Parks", "Environment", "Building & Planning", "Public Health"
];

export const categories = [
  "Water Supply", "Street Lighting", "Sanitation", "Roads", 
  "Parks & Gardens", "Noise Pollution", "Building Violations", "Public Health"
];
