/* Everything J&K — Supabase client configuration */
window.JK_SUPABASE_URL = "https://myrshzdfhrxjaqsitjkn.supabase.co";
window.JK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C87X56f2AqzWSRQBj2-RQA_lwHdU74B";
window.jkSupabase = window.supabase.createClient(
  window.JK_SUPABASE_URL,
  window.JK_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
