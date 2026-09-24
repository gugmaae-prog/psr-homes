const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b" as const;
const HINDI_TRANSLATION_MODEL = "@cf/ai4bharat/indictrans2-en-indic-1B" as const;

const TARGET_LANGUAGES = new Set(["ar", "ru", "zh", "hi"]);
const MAX_TEXTS = 20;
const MAX_TEXT_LENGTH = 700;
const MAX_TOTAL_LENGTH = 7_500;

type TranslationPayload = {
  target?: unknown;
  texts?: unknown;
};

function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if (!origin) return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (origin === url.origin) return true;
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-language": "en",
      "x-content-type-options": "nosniff",
    },
  });
}

function validTexts(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TEXTS) return false;
  let total = 0;
  for (const item of value) {
    if (typeof item !== "string") return false;
    const text = item.trim();
    if (!text || text.length > MAX_TEXT_LENGTH) return false;
    total += text.length;
  }
  return total <= MAX_TOTAL_LENGTH;
}

async function translateWithM2M100(env: Env, texts: string[], target: string) {
  const translations = new Array<string>(texts.length);
  let nextIndex = 0;

  async function translateNext() {
    while (nextIndex < texts.length) {
      const index = nextIndex;
      nextIndex += 1;
      const source = texts[index];
      try {
        const result = await env.AI.run(TRANSLATION_MODEL, {
          text: source,
          source_lang: "en",
          target_lang: target,
        });
        translations[index] = "translated_text" in result && typeof result.translated_text === "string"
          ? result.translated_text.trim() || source
          : source;
      } catch (error) {
        console.error(JSON.stringify({
          event: "site_translation_item_failed",
          target,
          message: error instanceof Error ? error.message.slice(0, 240) : "Translation failed",
        }));
        translations[index] = source;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, texts.length) }, () => translateNext()));
  return translations;
}

async function translateTexts(env: Env, texts: string[], target: string) {
  if (target === "hi") {
    try {
      const result = await env.AI.run(HINDI_TRANSLATION_MODEL, {
        text: texts,
        target_language: "hin_Deva",
      });
      if (Array.isArray(result.translations) && result.translations.length === texts.length) {
        return result.translations.map((translation, index) =>
          typeof translation === "string" && translation.trim() ? translation.trim() : texts[index],
        );
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: "site_hindi_translation_failed",
        message: error instanceof Error ? error.message.slice(0, 240) : "Hindi translation failed",
      }));
    }
  }
  return translateWithM2M100(env, texts, target);
}

export async function handleTranslationRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/translate") return null;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!sameOriginRequest(request)) return jsonResponse({ error: "Invalid request origin." }, 403);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 24_000) return jsonResponse({ error: "Translation request is too large." }, 413);

  let payload: TranslationPayload;
  try {
    payload = await request.json<TranslationPayload>();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const target = typeof payload.target === "string" ? payload.target.toLowerCase() : "";
  if (!TARGET_LANGUAGES.has(target) || !validTexts(payload.texts)) {
    return jsonResponse({ error: "Invalid translation request." }, 400);
  }

  const translations = await translateTexts(env, payload.texts.map((text) => text.trim()), target);
  return jsonResponse({ target, translations });
}
