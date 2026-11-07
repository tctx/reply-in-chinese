// Calls OpenAI to write a satirical reply for one post.
// The OpenAI key is entered in the extension settings and kept in chrome.storage.local.
// It is never stored in this code.

importScripts("prompt.js");

const DEFAULT_MODEL = "gpt-5.5";

async function generate({ text, author }) {
  const s = await chrome.storage.local.get(["openaiKey", "model", "lang"]);
  const key = (s.openaiKey || "").trim();
  if (!key) throw new Error("No OpenAI key. Click the extension icon and add one.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: s.model || DEFAULT_MODEL,
      messages: ricBuildMessages({ text, author, lang: s.lang || "zh" }),
      max_completion_tokens: 2000
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
  const out = (data.choices?.[0]?.message?.content || "").trim().replace(/^["“]|["”]$/g, "");
  if (!out) throw new Error("Empty reply from OpenAI.");
  if (out === "SKIP") throw new Error("Not a policy post. Skipped.");
  return out;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "ric-generate") return;
  generate(msg)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true; // async response
});
