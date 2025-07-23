// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ⬇️ Replace these strings with your actual Supabase values
const SUPABASE_URL = 'https://ttavhdyciroempevbdga.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YXZoZHljaXJvZW1wZXZiZGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ3ODUsImV4cCI6MjA2ODY3MDc4NX0.avAlp7QF3FU79nCOHsXNyu2gEFY75piVUIPiitMG-Ec';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

