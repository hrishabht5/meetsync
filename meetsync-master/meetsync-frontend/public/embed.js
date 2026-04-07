(function () {
  var s = document.currentScript;
  if (!s) return;

  var BASE = "https://meetsync-seven.vercel.app";
  var token = s.getAttribute("data-token");
  var username = s.getAttribute("data-username");
  var slug = s.getAttribute("data-slug");
  var width = s.getAttribute("data-width") || "100%";
  var height = s.getAttribute("data-height") || "680";

  var src;
  if (token) {
    src = BASE + "/book/" + encodeURIComponent(token) + "?embed=1";
  } else if (username && slug) {
    src = BASE + "/u/" + encodeURIComponent(username) + "/" + encodeURIComponent(slug) + "?embed=1";
  } else {
    return; // missing required attributes
  }

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.width = width;
  iframe.height = height;
  iframe.style.cssText = "border:none;border-radius:16px;display:block;max-width:100%;";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowtransparency", "true");
  iframe.setAttribute("title", "MeetSync Booking");

  s.parentNode.insertBefore(iframe, s.nextSibling);

  // Forward booking_confirmed messages to host page
  window.addEventListener("message", function (e) {
    if (e.source === iframe.contentWindow && e.data && e.data.type === "meetsync:booking_confirmed") {
      window.dispatchEvent(new CustomEvent("meetsync:booking_confirmed", { detail: e.data }));
    }
  });
})();
