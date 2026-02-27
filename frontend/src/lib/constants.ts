/**
 * Canonical list of departments used across the entire application.
 * Must stay in sync with the agent onboarding dropdown and the report form.
 * The backend DEPT_MAP in routers/tickets.py maps categories → these exact strings.
 */
export const DEPARTMENTS = [
    "Water & Sewage",
    "Electrical",
    "Sanitation",
    "Roads & Transport",
    "Parks & Gardens",
    "Environment",
    "Building & Planning",
    "Public Health",
    "Public Safety",
    "Other",
] as const;

export type Department = typeof DEPARTMENTS[number];
