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

export type Project = {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: string;
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
