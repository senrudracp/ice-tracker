import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://toweihaqxumykvdppdqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvd2VpaGFxeHVteWt2ZHBwZHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTU1MzYsImV4cCI6MjA5Mjc3MTUzNn0.vQYm9FbYd7DbMWZn3aU4pxpz4DoHaJQljWD-MFKya58';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
