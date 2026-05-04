import { createClient } from "@supabase/supabase-js";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim();

if (!rawUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

const supabaseUrl = rawUrl.replace(/\/+$/, "");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = "parlo-files";

export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export type Project = {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: ProjectStatus;
  created_at: string;
  share_token: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  approved: boolean;
  approved_at: string | null;
  feedback: string | null;
  created_at: string;
};

export type ActivityEventType =
  | "file_uploaded"
  | "file_deleted"
  | "file_approved"
  | "feedback_submitted";

export type ActivityLog = {
  id: string;
  project_id: string;
  event_type: ActivityEventType;
  description: string;
  created_at: string;
};

export async function logActivity(
  projectId: string,
  eventType: ActivityEventType,
  description: string,
) {
  await supabase
    .from("activity_log")
    .insert({ project_id: projectId, event_type: eventType, description });
}
