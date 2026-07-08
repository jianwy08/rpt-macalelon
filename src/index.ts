import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("🚀 Edge Function triggered!");
    
    const body = await req.json();
    console.log("📦 Received payload:", body);
    
    const { userId, password, action } = body;
    
    // Grab keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceRoleKey) {
        console.error("❌ ERROR: Missing Service Role Key in environment variables!");
        throw new Error("Missing Service Role Key.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'update_password') {
      console.log(`🔐 Attempting to update password for user ID: ${userId}`);
      
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      
      if (error) {
          console.error("❌ SUPABASE API ERROR:", error);
          throw error;
      }
      
      console.log("✅ Password updated successfully!");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true, message: "Ignored: Action was not update_password" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("🚨 FATAL CATCH BLOCK ERROR:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})