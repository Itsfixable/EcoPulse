import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "gemini" | "openai" | "anthropic" | "none";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";

/** Whichever key is present wins, cheapest-to-run first. */
export function detectProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

export function providerLabel(p: Provider): string {
  return p === "gemini"
    ? (process.env.GEMINI_MODEL ?? "gemini-2.5-flash")
    : p === "openai"
      ? (process.env.OPENAI_MODEL ?? "gpt-4o")
      : p === "anthropic"
        ? "claude-opus-5"
        : "offline";
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, unknown>;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  toolInput: unknown | null;
}

interface ChatOptions {
  system: string;
  messages: ChatTurn[];
  tool: ToolSpec;
  /** Runs the tool and returns a plain-text result for the model to read. */
  runTool: (input: unknown) => string;
  maxToolRounds?: number;
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const provider = detectProvider();
  if (provider === "none") {
    return {
      reply:
        "No model API key is set, so the assistant is offline. Add GEMINI_API_KEY (free at aistudio.google.com), OPENAI_API_KEY, or ANTHROPIC_API_KEY to .env.local and restart the dev server. Everything else on this page works without it.",
      toolInput: null,
    };
  }
  return provider === "anthropic" ? viaAnthropic(opts) : viaOpenAICompatible(opts, provider);
}

/* ------------------------------- OpenAI / Gemini ------------------------------ */

async function viaOpenAICompatible(
  opts: ChatOptions,
  provider: Extract<Provider, "gemini" | "openai">,
): Promise<ChatResult> {
  const client =
    provider === "gemini"
      ? new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: GEMINI_BASE })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const model = providerLabel(provider);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: opts.tool.name,
        description: opts.tool.description,
        parameters: opts.tool.parameters,
      },
    },
  ];

  let toolInput: unknown | null = null;

  for (let round = 0; round <= (opts.maxToolRounds ?? 2); round++) {
    const res = await client.chat.completions.create({ model, messages, tools });
    const msg = res.choices[0]?.message;
    if (!msg) break;

    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      return { reply: (msg.content ?? "").trim(), toolInput };
    }

    messages.push(msg);
    for (const call of calls) {
      if (call.type !== "function") continue;
      const parsed = safeParse(call.function.arguments);
      toolInput = parsed;
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: opts.runTool(parsed),
      });
    }
  }

  return { reply: "I could not finish that request.", toolInput };
}

/* --------------------------------- Anthropic --------------------------------- */

async function viaAnthropic(opts: ChatOptions): Promise<ChatResult> {
  const client = new Anthropic();
  const tools: Anthropic.Tool[] = [
    {
      name: opts.tool.name,
      description: opts.tool.description,
      input_schema: opts.tool.parameters as Anthropic.Tool.InputSchema,
      strict: true,
    },
  ];

  const convo: Anthropic.MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let toolInput: unknown | null = null;
  let res = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1400,
    system: opts.system,
    output_config: { effort: "low" },
    tools,
    messages: convo,
  });

  let guard = 0;
  while (res.stop_reason === "tool_use" && guard++ <= (opts.maxToolRounds ?? 2)) {
    const call = res.content.find((b) => b.type === "tool_use");
    if (!call || call.type !== "tool_use") break;
    toolInput = call.input;
    convo.push({ role: "assistant", content: res.content });
    convo.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: call.id, content: opts.runTool(call.input) },
      ],
    });
    res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1400,
      system: opts.system,
      output_config: { effort: "low" },
      tools,
      messages: convo,
    });
  }

  const reply = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();

  return { reply, toolInput };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
