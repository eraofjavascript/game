import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow GET requests for easy setup
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin already exists (check both old and new email formats)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => 
      u.email === 'admin@matchschedule.local' || u.email === 'admin@gamezone.com'
    );

    if (adminExists) {
      return new Response(
        JSON.stringify({ message: 'Admin already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user with username-based email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@matchschedule.local',
      password: 'ilovefootballandcricket',
      email_confirm: true,
      user_metadata: { username: 'admin' },
    });

    if (authError) {
      throw authError;
    }

    if (authData.user) {
      // Create profile
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: 'admin',
      });

      // Assign admin role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'admin',
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Admin user created!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});