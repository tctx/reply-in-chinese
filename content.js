// Reply in Chinese — adds a 中 button to each post's action bar on X.
// Click: reads the post, asks the background worker for a satirical reply,
// opens the reply box and types it in. It never presses Post.

const MARK = "data-ric-done";

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
  if (editor.textContent.includes(text.slice(0, 10))) return true;
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  return editor.textContent.includes(text.slice(0, 10));
}

function setState(btn, state, title) {
  btn.dataset.state = state;
  btn.disabled = state === "busy";
  btn.textContent = state === "busy" ? "…" : state === "error" ? "!" : "中";
  btn.title = title || "Draft a satirical reply";
  if (state === "error") setTimeout(() => setState(btn, "idle"), 4000);
}

async function handleClick(article, btn) {
  const { text, author } = postInfo(article);
  if (!text) return setState(btn, "error", "This post has no text to reply to.");
  setState(btn, "busy", "Writing…");

  let res;
  try {
    res = await chrome.runtime.sendMessage({ type: "ric-generate", text, author });
  } catch (e) {
    res = { ok: false, error: "Extension was reloaded. Refresh this tab." };
  }
  if (!res?.ok) return setState(btn, "error", res?.error || "Something went wrong.");

  article.querySelector('[data-testid="reply"]')?.click();
  const editor = await waitFor('[role="dialog"] [data-testid="tweetTextarea_0"]');
  if (!editor) {
    navigator.clipboard?.writeText(res.text).catch(() => {});
    return setState(btn, "error", "Reply box didn't open. Reply copied: paste with ⌘V.");
  }
  setTimeout(() => {
    if (!insertText(editor, res.text)) {
      navigator.clipboard?.writeText(res.text).catch(() => {});
      setState(btn, "error", "Couldn't type it in. Reply copied: paste with ⌘V.");
    } else {
      setState(btn, "idle");
    }
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
  btn.setAttribute("aria-label", "Draft a satirical reply");
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
