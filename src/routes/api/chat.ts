import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayProvider,
  LORD_MODELS,
  LORD_SYSTEM_PROMPT,
  type LordMode,
} from "@/lib/ai-gateway.server";
import { apiErrorResponse, getSafeErrorMessage } from "@/lib/api-error";

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant", "system"]),
          parts: z.array(z.unknown()).max(100),
        })
        .passthrough(),
    )
    .min(1)
    .max(100),
  mode: z.enum(["fast", "balanced", "reasoning", "coding", "creative"]).optional(),
  context: z
    .object({
      page: z.string().max(200).optional(),
      workflow: z.string().max(200).nullable().optional(),
    })
    .passthrough()
    .optional(),
});

async function getAuthenticatedUserId(): Promise<string | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  const request = getRequest();
  if (!request?.headers) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return null;
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return null;
    }

    return data.claims.sub;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID();

        // Verify authentication
        const userId = await getAuthenticatedUserId();
        if (!userId) {
          console.warn(`[chat:${requestId}] Unauthorized: No valid auth token`);
          return apiErrorResponse(401, "UNAUTHORIZED", "Authentication required.", requestId);
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          console.error(`[chat:${requestId}] Lovable AI is not configured`);
          return apiErrorResponse(
            503,
            "AI_NOT_CONFIGURED",
            "AI is temporarily unavailable.",
            requestId,
          );
        }

        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return apiErrorResponse(
            400,
            "INVALID_REQUEST",
            "Request body must be valid JSON.",
            requestId,
          );
        }
        const parsed = ChatRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
          console.warn(`[chat:${requestId}] Invalid request`, parsed.error.flatten());
          return apiErrorResponse(
            400,
            "INVALID_REQUEST",
            "Please send a valid conversation with 1–100 messages.",
            requestId,
          );
        }
        const body = parsed.data;
        const mode: LordMode = body.mode ?? "balanced";
        const modelId = LORD_MODELS[mode];

        // Construct enriched system prompt with application context
        let systemPrompt = LORD_SYSTEM_PROMPT;
        if (body.context) {
          systemPrompt += `\n\nCURRENT APPLICATION CONTEXT:\n${JSON.stringify(body.context, null, 2)}`;
        }

        try {
          const gateway = createLovableAiGatewayProvider(apiKey);
          const result = streamText({
            model: gateway(modelId),
            system: systemPrompt,
            messages: await convertToModelMessages(body.messages as unknown as UIMessage[]),
            onError: ({ error }) => console.error(`[chat:${requestId}] Stream failed`, error),
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          const detail = getSafeErrorMessage(err);
          console.error(`[chat:${requestId}] Request failed: ${detail}`, err);
          const lower = detail.toLowerCase();
          if (lower.includes("credit") || lower.includes("payment required"))
            return apiErrorResponse(
              402,
              "AI_CREDITS_EXHAUSTED",
              "AI credits are exhausted. Add workspace credits and try again.",
              requestId,
            );
          if (lower.includes("rate limit") || lower.includes("too many requests"))
            return apiErrorResponse(
              429,
              "AI_RATE_LIMITED",
              "AI is receiving too many requests. Please retry shortly.",
              requestId,
            );
          return apiErrorResponse(
            502,
            "AI_UPSTREAM_ERROR",
            "The AI provider could not complete this request. Please retry.",
            requestId,
          );
        }
      },
    },
  },
});
