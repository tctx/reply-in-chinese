const $ = (id) => document.getElementById(id);

chrome.storage.local.get({ model: "", openaiKey: "" }, (s) => {
  $("model").value = s.model;
  $("key").value = s.openaiKey;
});

$("save").addEventListener("click", () => {
  chrome.storage.local.set(
    { model: $("model").value.trim(), openaiKey: $("key").value.trim() },
    () => {
      $("status").textContent = "Saved";
      setTimeout(() => ($("status").textContent = ""), 1500);
    }
  );
});
