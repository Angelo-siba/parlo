// Keep the private calendar behavior identical in the standalone deployment
// and the main Parlo artifact. The shared page resolves its @/ imports against
// this app's own components and Supabase client during bundling.
export { default } from "../../../artifacts/parlo/src/pages/calendar";