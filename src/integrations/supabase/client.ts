import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://elfqgpegkcbrizccrzbv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZnFncGVna2Nicml6Y2NyemJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjAzNzksImV4cCI6MjA4MDE5NjM3OX0.QRRssTF0vUEH6TvErnd15uMhs3uiUGJ00xUK7VSKbFw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// For React:
// import { supabase } from "@/integrations/supabase/client";
// For React Native:
// import { supabase } from "@/src/integrations/supabase/client";
