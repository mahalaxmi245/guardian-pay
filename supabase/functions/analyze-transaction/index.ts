import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, sender_upi, receiver_upi, device_type, location, transaction_time } = await req.json();

    // Call Lovable AI for risk analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a UPI fraud detection AI. Analyze transaction data and return a JSON risk assessment. Consider these fraud indicators:
- Unusually high amounts (>50000 INR is suspicious, >100000 is very suspicious)
- Late night transactions (11PM-5AM) are riskier
- New/unknown devices increase risk
- Transactions from unusual locations increase risk
- Rapid succession of transactions (if mentioned)
- Mismatched sender/receiver patterns

Return ONLY valid JSON with this exact structure:
{"risk_score": <number 0-1>, "reasoning": "<brief explanation>", "flags": ["<flag1>", "<flag2>"]}`
          },
          {
            role: "user",
            content: `Analyze this UPI transaction:
Amount: ₹${amount}
Sender UPI: ${sender_upi}
Receiver UPI: ${receiver_upi}
Device: ${device_type}
Location: ${location}
Time: ${transaction_time}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "assess_risk",
            description: "Return fraud risk assessment for a UPI transaction",
            parameters: {
              type: "object",
              properties: {
                risk_score: { type: "number", description: "Risk score from 0 (safe) to 1 (fraudulent)" },
                reasoning: { type: "string", description: "Brief explanation of the risk assessment" },
                flags: { type: "array", items: { type: "string" }, description: "List of risk flags detected" }
              },
              required: ["risk_score", "reasoning", "flags"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "assess_risk" } }
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let riskResult = { risk_score: 0.5, reasoning: "Unable to analyze", flags: [] as string[] };

    if (toolCall?.function?.arguments) {
      try {
        riskResult = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI response");
      }
    }

    // Determine status based on risk score
    const status = riskResult.risk_score >= 0.7 ? "blocked" :
                   riskResult.risk_score >= 0.4 ? "flagged" : "approved";

    // Insert transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount,
        sender_upi,
        receiver_upi,
        device_type,
        location,
        transaction_time: transaction_time || new Date().toISOString(),
        risk_score: riskResult.risk_score,
        status,
        ai_reasoning: riskResult.reasoning,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Create alert if risky
    if (riskResult.risk_score >= 0.4) {
      const alertType = riskResult.risk_score >= 0.7 ? "critical" : "warning";
      const alertMessage = riskResult.risk_score >= 0.7
        ? `🚨 BLOCKED: High-risk transaction of ₹${amount} detected. ${riskResult.reasoning}`
        : `⚠️ FLAGGED: Suspicious transaction of ₹${amount}. ${riskResult.reasoning}`;

      await supabase.from("alerts").insert({
        user_id: user.id,
        transaction_id: transaction.id,
        alert_type: alertType,
        message: alertMessage,
      });
    }

    return new Response(JSON.stringify({
      transaction,
      risk_analysis: riskResult,
      status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-transaction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
