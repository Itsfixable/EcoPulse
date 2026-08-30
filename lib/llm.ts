import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "gemini" | "openai" | "anthropic" | "none";

/**
 * Secrets pasted through a web form often carry a trailing newline or space,
 * which the provider rejects as an invalid key. Trim before use.
 */
function key(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";

/** Whichever key is present wins, cheapest-to-run first. */
export function detectProvider(): Provider {
  if (key("GEMINI_API_KEY")) return "gemini";
  if (key("OPENAI_API_KEY")) return "openai";
  if (key("ANTHROPIC_API_KEY")) return "anthropic";
  return "none";
}

/**
 * Gemini's newest flash models return 503 under load, so try a chain and fall
 * through on overload. GEMINI_MODEL pins a single model when set.
 */
const GEMINI_CHAIN = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

function geminiModels(): string[] {
  const pinned = process.env.GEMINI_MODEL;
  return pinned ? [pinned] : GEMINI_CHAIN;
}

export function providerLabel(p: Provider): string {
  return p === "gemini"
    ? geminiModels()[0]
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
  /** Which model actually served the reply, after any fallback. */
  model?: string;
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
    // Replit keeps secrets in its own pane, so pointing a Replit user at a
    // .env.local file sends them somewhere that will not work.
    const onReplit = Boolean(process.env.REPL_ID ?? process.env.REPLIT_DEV_DOMAIN);
    const where = onReplit
      ? "Add GEMINI_API_KEY in the Secrets pane (the lock icon), then stop and re-run the Repl."
      : "Add GEMINI_API_KEY to .env.local, then restart the dev server.";
    return {
      reply: `No model API key is set, so the assistant is offline. ${where} A key is free at aistudio.google.com/apikey. OPENAI_API_KEY and ANTHROPIC_API_KEY work too. Everything else on this page works without one.`,
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
      ? new OpenAI({ apiKey: key("GEMINI_API_KEY"), baseURL: GEMINI_BASE })
      : new OpenAI({ apiKey: key("OPENAI_API_KEY") });

  const models = provider === "gemini" ? geminiModels() : [providerLabel(provider)];

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
  let modelIndex = 0;

  /** Falls through the chain when a model is overloaded or retired. */
  const complete = async () => {
    let lastErr: unknown;
    for (; modelIndex < models.length; modelIndex++) {
      try {
        return await client.chat.completions.create({
          model: models[modelIndex],
          messages,
          tools,
        });
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        if (status !== 503 && status !== 404 && status !== 429) throw e;
      }
    }
    throw lastErr;
  };

  for (let round = 0; round <= (opts.maxToolRounds ?? 2); round++) {
    const res = await complete();
    const msg = res.choices[0]?.message;
    if (!msg) break;

    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      return { reply: (msg.content ?? "").trim(), toolInput, model: models[modelIndex] };
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

  return { reply: "I could not finish that request.", toolInput, model: models[modelIndex] };
}

/* --------------------------------- Anthropic --------------------------------- */

async function viaAnthropic(opts: ChatOptions): Promise<ChatResult> {
  const client = new Anthropic({ apiKey: key("ANTHROPIC_API_KEY") });
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

  return { reply, toolInput, model: "claude-opus-5" };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
