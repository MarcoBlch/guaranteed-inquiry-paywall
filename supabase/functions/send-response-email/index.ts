import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, responseContent, recipientEmail } = await req.json();
    
    if (!messageId || !responseContent || !recipientEmail) {
      throw new Error("Missing required parameters");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get message details
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single();
      
    if (messageError || !message) {
      throw new Error("Message not found");
    }

    // Send response email
    const emailResponse = await resend.emails.send({
      from: "FastPass <noreply@fastpass.email>",
      to: [recipientEmail],
      subject: `Response to your message - FastPass`,
      html: `
        <h2>Response to Your Message</h2>
        <p>Hello,</p>
        <p>You have received a response to your message sent via FastPass:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Your Original Message:</h3>
          <p>${message.content}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Response:</h3>
          <p>${responseContent}</p>
        </div>
        
        <p>Thank you for using FastPass!</p>
        <p>Best regards,<br>The FastPass Team</p>
      `,
    });

    // Mark message as responded
    await supabase
      .from("message_responses")
      .upsert({
        message_id: messageId,
        has_response: true,
        response_received_at: new Date().toISOString(),
      });

    console.log("Response email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error sending response email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});