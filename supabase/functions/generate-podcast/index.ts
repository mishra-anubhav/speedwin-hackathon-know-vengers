import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, style } = await req.json();
    console.log('Generating podcast for:', { topic, duration, style });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert podcast script writer. Create engaging, conversational podcast scripts with dialogue between a Host and an Interviewer.

CRITICAL FORMATTING RULES:
- Always use "Host:" and "Interviewer:" labels before each speaker's dialogue
- Write ONLY the spoken words - no stage directions, no sound effects, no music cues
- Never include text in parentheses like (pause), (laughs), (music fades)
- Never use asterisks or formatting markers like **bold** or *italic*
- Write natural, conversational dialogue that flows smoothly
- Use a ${style} style/tone`;

    const userPrompt = `Write a ${duration} podcast script about: ${topic}

Format as a dialogue between Host and Interviewer with these rules:
1. Start each line with "Host:" or "Interviewer:"
2. Write ONLY spoken dialogue - no stage directions, parentheses, or formatting
3. Include:
   - Captivating introduction with both speakers
   - 3-4 key points explored through conversation
   - Natural back-and-forth dialogue
   - Engaging questions and answers
   - Memorable conclusion

Example format:
Host: Welcome to today's episode where we explore [topic].
Interviewer: Thanks for having me. This is such a fascinating subject.
Host: Let's dive right in. What makes this so interesting?

Remember: ONLY dialogue with speaker labels. No stage directions or formatting.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const script = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        script,
        title: `${topic}`,
        description: `A ${duration} podcast about ${topic}`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-podcast function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});