
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get message details
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        attachments,
        sender_email,
        amount_paid,
        created_at,
        user_id,
        profiles:user_id (
          paypal_email
        )
      `)
      .eq("id", message_id)
      .single();
      
    if (messageError || !message) {
      throw new Error("Message not found");
    }
    
    // For a real implementation, you would use an email service like Resend, SendGrid, etc.
    // For now, we'll just log the email that would be sent
    console.log("Would send email to:", message.profiles.paypal_email);
    console.log("Email subject: You've received a new paid message");
    console.log("Email content:", {
      senderEmail: message.sender_email,
      messageContent: message.content,
      attachments: message.attachments,
      amountPaid: message.amount_paid
    });
    
    // Update message status
    await supabase
      .from("messages")
      .update({ notification_sent: true })
      .eq("id", message_id);
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in sending email notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
