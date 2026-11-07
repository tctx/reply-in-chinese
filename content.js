// Reply in Chinese — adds a 中 button to each post's action bar on X.
// Click: reads the post, asks the background worker for a satirical reply,
// opens the reply box and types the Chinese in. A small bubble shows the English.
// It never presses Post.

const MARK = "data-ric-done";
let bubble = null;
let bubbleWatch = null;

function postInfo(article) {
  const text = article.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || "";
  const author = article.querySelector('[data-testid="User-Name"]')?.innerText?.replace(/\n+/g, " ").trim() || "";
  return { text, author };
}

function waitFor(selector, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeoutMs);
  });
}

function insertText(editor, text) {
  editor.focus();
  document.execCommand("insertText", false, text); // works with X's Draft.js editor
  if (editor.textContent.includes(text.slice(0, 8))) return true;
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  return editor.textContent.includes(text.slice(0, 8));
}

// ---- Bubble -------------------------------------------------------------

function closeBubble() {
  bubble?.remove();
  bubble = null;
  clearInterval(bubbleWatch);
}

// Shows a small bubble under `anchor`. kind: "info" | "error".
// If `stayWhile` is given, the bubble closes once that element leaves the page.
function showBubble(anchor, { label, text, kind = "info", stayWhile = null }) {
  closeBubble();
  bubble = document.createElement("div");
  bubble.className = `ric-bubble ric-${kind}`;
  bubble.setAttribute("role", "status");

  const head = document.createElement("div");
  head.className = "ric-bubble-head";
  head.textContent = label;
  const x = document.createElement("button");
  x.type = "button";
  x.className = "ric-bubble-x";
  x.setAttribute("aria-label", "Close");
  x.textContent = "×";
  x.addEventListener("click", closeBubble);
  head.appendChild(x);

  const body = document.createElement("div");
  body.className = "ric-bubble-body";
  body.textContent = text;

  bubble.append(head, body);
  document.body.appendChild(bubble);

  const place = () => {
    if (!bubble || !anchor.isConnected) return;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(360, window.innerWidth - 24);
    bubble.style.width = `${w}px`;
    bubble.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - w - 12))}px`;
    const below = r.bottom + 8;
    const h = bubble.offsetHeight;
    bubble.style.top = `${below + h > window.innerHeight - 12 ? Math.max(12, r.top - h - 8) : below}px`;
  };
  place();

  bubbleWatch = setInterval(() => {
    if (stayWhile && !stayWhile.isConnected) return closeBubble();
    if (!anchor.isConnected) return closeBubble();
    place();
  }, 300);
  if (kind === "error") setTimeout(() => bubble?.classList.contains("ric-error") && closeBubble(), 8000);
}

// ---- Button -------------------------------------------------------------

function setState(btn, state) {
  btn.dataset.state = state;
  btn.disabled = state === "busy";
  btn.textContent = state === "busy" ? "…" : state === "error" ? "!" : "中";
  if (state === "error") setTimeout(() => setState(btn, "idle"), 4000);
}

function fail(btn, message) {
  setState(btn, "error");
  showBubble(btn, { label: "Reply in Chinese", text: message, kind: "error" });
}

async function handleClick(article, btn) {
  const { text, author } = postInfo(article);
  if (!text) return fail(btn, "This post has no text to reply to.");
  closeBubble();
  setState(btn, "busy");

  let res;
  try {
    res = await chrome.runtime.sendMessage({ type: "ric-generate", text, author });
  } catch (e) {
    res = { ok: false, error: "The extension was reloaded. Refresh this tab and try again." };
  }
  if (!res?.ok) return fail(btn, res?.error || "Something went wrong.");

  article.querySelector('[data-testid="reply"]')?.click();
  const editor = await waitFor('[role="dialog"] [data-testid="tweetTextarea_0"]');
  if (!editor) {
    navigator.clipboard?.writeText(res.zh).catch(() => {});
    return fail(btn, "The reply box didn't open. The Chinese reply is copied: paste it with ⌘V.");
  }

  setTimeout(() => {
    const ok = insertText(editor, res.zh);
    if (!ok) navigator.clipboard?.writeText(res.zh).catch(() => {});
    setState(btn, "idle");
    const dialog = editor.closest('[role="dialog"]');
    showBubble(editor, {
      label: ok ? "What it says" : "Couldn't type it in. Copied: paste with ⌘V",
      text: res.en || "(no translation)",
      stayWhile: dialog
    });
  }, 150);
}

function addButton(article) {
  if (article.hasAttribute(MARK)) return;
  const bar = article.querySelector('[role="group"]');
  if (!bar || !article.querySelector('[data-testid="reply"]')) return;
  article.setAttribute(MARK, "1");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ric-btn";
  btn.title = "Draft a satirical reply in Chinese";
  btn.setAttribute("aria-label", "Draft a satirical reply in Chinese");
  setState(btn, "idle");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleClick(article, btn);
  });
  bar.appendChild(btn);
}

function scan() {
  document.querySelectorAll('article[data-testid="tweet"]').forEach(addButton);
}

scan();
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
