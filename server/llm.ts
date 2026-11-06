import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { request as httpsRequest, Agent } from "node:https";
import { resolve } from "node:path";
import { ENV } from "./_core/env";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type GigaToken = { access_token?: string; expires_at?: number };
type JsonResponse = { status: number; payload: any };

const GIGACHAT_API_URL = "https://api.giga.chat";
const GIGACHAT_TOKEN_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL || "GigaChat-2";
const caPath = resolve(process.cwd(), "certs/russian-trusted-ca.pem");
const gigaAgent = existsSync(caPath)
  ? new Agent({ ca: readFileSync(caPath), keepAlive: true })
  : undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function fallbackReply(name: string) {
  return name === "Лея"
    ? "Я рядом. Давай разложим это на маленький шаг, который можно сделать уже сегодня."
    : `Я — ${name}. Интересная мысль. Расскажи чуть больше — хочу понять, что для тебя здесь самое важное.`;
}

function requestJson(url: string, options: { method: string; headers: Record<string, string> }, body: string): Promise<JsonResponse> {
  return new Promise((resolvePromise, reject) => {
    const request = httpsRequest(url, { ...options, agent: gigaAgent }, response => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { raw += chunk; });
      response.on("end", () => {
        let payload: any = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { error: raw }; }
        resolvePromise({ status: response.statusCode ?? 500, payload });
      });
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function getAccessToken() {
  if (!ENV.gigachatApiKey) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const response = await requestJson(
    GIGACHAT_TOKEN_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${ENV.gigachatApiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: randomUUID(),
      },
    },
    new URLSearchParams({ scope: "GIGACHAT_API_PERS" }).toString(),
  );
  const payload = response.payload as GigaToken & { error?: string; error_description?: string };
  if (response.status < 200 || response.status >= 300 || !payload.access_token) {
    throw new Error(`GigaChat token request failed: ${payload.error_description ?? payload.error ?? response.status}`);
  }

  const expiresAt = payload.expires_at ? payload.expires_at * 1000 : Date.now() + 25 * 60 * 1000;
  cachedToken = { value: payload.access_token, expiresAt: Math.max(Date.now() + 30_000, expiresAt - 60_000) };
  return cachedToken.value;
}

async function requestCompletion(messages: ChatMessage[], token: string) {
  return requestJson(
    `${GIGACHAT_API_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
    JSON.stringify({ model: GIGACHAT_MODEL, messages, temperature: 0.78, max_tokens: 700 }),
  );
}

export async function generateCharacterReply(input: {
  name: string;
  persona: string;
  history: ChatMessage[];
  message: string;
}) {
  const fallback = fallbackReply(input.name);
  if (!ENV.gigachatApiKey) return fallback;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Ты — персонаж «${input.name}». Твоя личность и правила поведения: ${input.persona}. Отвечай по-русски, тепло и естественно. Не говори, что ты языковая модель. Не выдумывай действия в реальном мире и не обещай невозможного. Поддерживай характер персонажа, но не будь карикатурным.`,
    },
    ...input.history.slice(-12),
    { role: "user", content: input.message },
  ];

  try {
    let token = await getAccessToken();
    if (!token) return fallback;
    let response = await requestCompletion(messages, token);
    if (response.status === 401) {
      cachedToken = null;
      token = await getAccessToken();
      if (token) response = await requestCompletion(messages, token);
    }

    const payload = response.payload as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (response.status < 200 || response.status >= 300 || payload.error) {
      console.warn("[GigaChat] Completion failed", payload.error?.message ?? response.status);
      return fallback;
    }
    return payload.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    console.warn("[GigaChat] Request error", error instanceof Error ? error.message : "unknown");
    return fallback;
  }
}
