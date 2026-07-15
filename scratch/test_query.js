import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnsjqebgztigubuyrbew.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuc2pxZWJnenRpZ3VidXlyYmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDI2OTAsImV4cCI6MjA5OTYxODY5MH0.fr7NTdULC_zS9wPUWdIh4JjnaYzh0-K40ctXzxp1ZTA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*');
  
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
