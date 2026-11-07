const $ = (id) => document.getElementById(id);

chrome.storage.local.get({ lang: "zh", model: "", openaiKey: "" }, (s) => {
  $("lang").value = s.lang;
  $("model").value = s.model;
  $("key").value = s.openaiKey;
});

$("save").addEventListener("click", () => {
  chrome.storage.local.set(
    { lang: $("lang").value, model: $("model").value.trim(), openaiKey: $("key").value.trim() },
    () => {
      $("status").textContent = "Saved";
      setTimeout(() => ($("status").textContent = ""), 1500);
    }
  );
});
