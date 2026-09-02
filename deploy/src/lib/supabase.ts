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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
  review_status: FileReviewStatus;
  version_group_id: string | null;
  version_number: number;
  created_at: string;
};

export type FileReviewStatus = "pending" | "changes_requested" | "approved";

export function isReviewWorkflowSchemaError(
  error: { code?: string | null; message?: string | null } | null | undefined,
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST204" ||
    message.includes("review_status") ||
    message.includes("version_group_id") ||
    message.includes("version_number")
  );
}

const MODERN_FILE_COLUMNS =
  "id, project_id, file_name, file_url, file_size, approved, approved_at, feedback, review_status, version_group_id, version_number, created_at";
const LEGACY_FILE_COLUMNS =
  "id, project_id, file_name, file_url, file_size, approved, approved_at, feedback, created_at";

export function normalizeProjectFiles(rows: any[] | null): ProjectFile[] {
  return (rows ?? []).map((file) => ({
    ...file,
    review_status:
      file.review_status ??
      (file.feedback && !file.approved ? "changes_requested" : file.approved ? "approved" : "pending"),
    version_group_id: file.version_group_id ?? file.id,
    version_number: file.version_number ?? 1,
  })) as ProjectFile[];
}

export async function loadProjectFiles(projectId: string) {
  const modern = await supabase
    .from("files")
    .select(MODERN_FILE_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (!modern.error) {
    return {
      data: normalizeProjectFiles(modern.data),
      error: null,
      usedLegacySchema: false,
    };
  }

  const legacy = await supabase
    .from("files")
    .select(LEGACY_FILE_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return {
    data: normalizeProjectFiles(legacy.data),
    error: legacy.error,
    usedLegacySchema: !legacy.error,
  };
}

export async function loadAllProjectFiles() {
  const modern = await supabase
    .from("files")
    .select(`id, project_id, approved, feedback, review_status, version_group_id, version_number, created_at`);

  if (!modern.error) {
    return {
      data: normalizeProjectFiles(modern.data),
      error: null,
      usedLegacySchema: false,
    };
  }

  const legacy = await supabase
    .from("files")
    .select("id, project_id, approved, feedback, created_at");

  return {
    data: normalizeProjectFiles(legacy.data),
    error: legacy.error,
    usedLegacySchema: !legacy.error,
  };
}

export type ActivityEventType =
  | "file_uploaded"
  | "file_version_uploaded"
  | "file_deleted"
  | "file_approved"
  | "feedback_submitted"
  | "changes_requested"
  | "client_reminder_sent";

export type ActivityLog = {
  id: string;
  project_id: string;
  event_type: ActivityEventType;
  description: string;
  created_at: string;
};

export type InvoiceLineItem = {
  description: string;
  amount: number;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type Invoice = {
  id: string;
  project_id: string;
  invoice_number: string;
  line_items: InvoiceLineItem[];
  total_amount: number;
  due_date: string;
  paypal_email: string;
  status: InvoiceStatus;
  created_at: string;
};

export type FreelancerSettings = {
  user_id: string;
  display_name: string | null;
  logo_url: string | null;
  accent_color: string | null;
  updated_at: string;
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
