// Calls OpenAI to write a satirical reply for one post.
// The OpenAI key is entered in the extension settings and kept in chrome.storage.local.
// It is never stored in this code.

importScripts("prompt.js");

const DEFAULT_MODEL = "gpt-5.5";

async function generate({ text, author }) {
  const s = await chrome.storage.local.get(["openaiKey", "model"]);
  const key = (s.openaiKey || "").trim();
  if (!key) throw new Error("No OpenAI key yet. Click the extension icon in the toolbar and paste one in.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: s.model || DEFAULT_MODEL,
      messages: ricBuildMessages({ text, author }),
      response_format: { type: "json_object" },
      max_completion_tokens: 2000
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);

  let out;
  try {
    out = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    throw new Error("OpenAI sent back something unreadable. Try again.");
  }
  if (out.skip) throw new Error("Not a policy post, so it was skipped.");
  if (!out.zh) throw new Error("Empty reply from OpenAI. Try again.");
  return { zh: out.zh.trim(), en: (out.en || "").trim() };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "ric-generate") return;
  generate(msg)
    .then((reply) => sendResponse({ ok: true, ...reply }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true; // async response
});
