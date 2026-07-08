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
    
    // 🌟 We make sure to grab ALL the variables you might send
    const { userId, password, action, email, fullName, role } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceRoleKey) {
        throw new Error("Missing Service Role Key.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ==========================================
    // LOGIC 1: UPDATE PASSWORD
    // ==========================================
    if (action === 'update_password') {
      console.log(`🔐 Attempting to update password for user ID: ${userId}`);
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      
      if (error) throw error;
      
      console.log("✅ Password updated successfully!");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ==========================================
    // LOGIC 2: CREATE NEW ACCOUNT
    // ==========================================
    if (action === 'create_user') {
      console.log(`👤 Attempting to create new auth user for: ${email}`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { 
          full_name: fullName, 
          role: role || 'client' 
        }
      });
      
      if (error) throw error;
      
      console.log("✅ User successfully created in Auth table! ID:", data.user.id);
      return new Response(JSON.stringify({ success: true, user: data.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // If it reaches here, no valid action was sent
    console.log("⚠️ No valid action provided in payload.");
    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    console.error("🚨 FATAL CATCH BLOCK ERROR:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})