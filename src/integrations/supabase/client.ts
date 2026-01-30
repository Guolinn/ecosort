import { createClient } from '@supabase/supabase-js';

// Public values (safe to ship in client) for calling Edge Functions.
export const SUPABASE_URL = 'https://aissiibxhylpbwnvtamc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpc3NpaWJ4aHlscGJ3bnZ0YW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTQyNDQsImV4cCI6MjA4NTA3MDI0NH0.io2VHLVHXvCJkpjQHFnlU-ERrmufAHMRQYQ--KkRBuQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
