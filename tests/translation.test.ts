import assert from "node:assert/strict";
import test from "node:test";
import { handleTranslationRequest } from "../worker/translation";

function request(body: unknown, origin = "https://psr.espacios.me") {
  return new Request("https://psr.espacios.me/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function translationEnv() {
  return {
    AI: {
      async run(model: string, input: { text: string | string[]; target_lang?: string; target_language?: string }) {
        if (model.includes("indictrans2")) {
          const texts = Array.isArray(input.text) ? input.text : [input.text];
          return { translations: texts.map((text) => `hi:${text}`) };
        }
        return { translated_text: `${input.target_lang}:${input.text}` };
      },
    },
  } as Pick<Env, "AI">;
}

test("translation endpoint translates a bounded Arabic text batch in source order", async () => {
  const response = await handleTranslationRequest(
    request({ target: "ar", texts: ["Projects", "Speak with an advisor"] }),
    translationEnv() as Env,
  );
  assert.equal(response?.status, 200);
  assert.deepEqual(await response?.json(), {
    target: "ar",
    translations: ["ar:Projects", "ar:Speak with an advisor"],
  });
});

test("translation endpoint uses the dedicated Hindi batch model", async () => {
  const response = await handleTranslationRequest(
    request({ target: "hi", texts: ["Projects", "Communities"] }),
    translationEnv() as Env,
  );
  assert.deepEqual(await response?.json(), {
    target: "hi",
    translations: ["hi:Projects", "hi:Communities"],
  });
});

test("translation endpoint rejects unsupported languages and cross-origin requests", async () => {
  const unsupported = await handleTranslationRequest(
    request({ target: "fr", texts: ["Projects"] }),
    translationEnv() as Env,
  );
  const crossOrigin = await handleTranslationRequest(
    request({ target: "ar", texts: ["Projects"] }, "https://example.com"),
    translationEnv() as Env,
  );
  assert.equal(unsupported?.status, 400);
  assert.equal(crossOrigin?.status, 403);
});
