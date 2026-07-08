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
    const body = await req.json();
    
    // 🌟 We grab the position from the frontend now
    const { userId, password, action, email, fullName, role, position } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceRoleKey) throw new Error("Missing Service Role Key.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ==========================================
    // LOGIC 1: UPDATE PASSWORD
    // ==========================================
    if (action === 'update_password') {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ==========================================
    // LOGIC 2: CREATE NEW ACCOUNT & PROFILE
    // ==========================================
    if (action === 'create_user') {
      console.log(`👤 Creating auth account for: ${email}`);
      
      // 1. Create the secure login account
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: role }
      });
      
      if (authError) throw authError;

      const newUserId = authData.user.id;
      console.log(`✅ Auth account created. ID: ${newUserId}. Inserting profile...`);

      // 2. 🌟 Insert them into your public user_profiles table using the new ID!
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert([
          {
            id: newUserId,
            full_name: fullName,
            role: role || 'cashier',
            position: position || null,
            is_active: true
          }
        ]);

      if (profileError) {
         console.error("❌ Profile Insert Error:", profileError);
         throw profileError;
      }
      
      console.log("✅ Profile successfully added to user_profiles table!");
      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    console.error("🚨 ERROR:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})