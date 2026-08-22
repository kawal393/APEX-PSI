/*!
 * APEX PSI — Verified by Apex badge (embeddable, dependency-free)
 *
 * Usage:
 *   <script src="https://ai-governance-standard.com/badge.js"
 *           data-name="Your Company" data-hash="YOUR_RECORD_HASH" async></script>
 *
 * The badge attests existence and integrity of a public verification record.
 * It is not an endorsement, a certification, or legal advice.
 * No cookies. No tracking. No external CSS.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("badge.js") !== -1) {
        script = all[i];
        break;
      }
    }
  }
  if (!script) return;

  var name = script.getAttribute("data-name") || "Unnamed record";
  var hash = (script.getAttribute("data-hash") || "").trim().toLowerCase();
  var recordUrl = "https://www.ai-governance-standard.com/r/" + encodeURIComponent(hash);
  var api =
    "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash?hash=" +
    encodeURIComponent(hash);

  var link = document.createElement("a");
  link.href = recordUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.cssText =
    "display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:4px;" +
    "font:600 11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "letter-spacing:.12em;text-transform:uppercase;text-decoration:none;" +
    "border:1px solid #4b5563;background:#111827;color:#d1d5db;";

  var dot = document.createElement("span");
  dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:#6b7280;flex:none;";
  var label = document.createElement("span");
  label.textContent = "CHECKING RECORD · " + name;
  link.appendChild(dot);
  link.appendChild(label);

  if (script.parentNode) script.parentNode.insertBefore(link, script);

  function setVerified(ok) {
    if (ok) {
      link.style.borderColor = "#c9a227";
      link.style.background = "#161208";
      link.style.color = "#e8c65a";
      dot.style.background = "#c9a227";
      label.textContent = "VERIFIED BY APEX · " + name;
      link.title = "Public verification record — attests existence and integrity, not the truth of any claim.";
    } else {
      link.style.borderColor = "#4b5563";
      link.style.background = "#111827";
      link.style.color = "#9ca3af";
      dot.style.background = "#6b7280";
      label.textContent = "NO PUBLIC RECORD · " + name;
      link.title = "No public verification record found for this hash.";
    }
  }

  if (!/^[0-9a-f]{64}$/.test(hash)) {
    setVerified(false);
    return;
  }

  fetch(api, { method: "GET", credentials: "omit", cache: "no-store" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      setVerified(!!(data && data.found === true && data.status === "APPROVED"));
    })
    .catch(function () {
      setVerified(false);
    });
})();
