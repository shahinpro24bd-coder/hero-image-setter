/* Lightweight instant navigation: cache documents, never their image payloads. */
(function () {
  "use strict";
  if (window.__SITE_EDIT__) return;

  var prefetched = Object.create(null);

  function internal(href) {
    if (!href) return null;
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      if (!(/\/$/.test(url.pathname) || /\.html$/.test(url.pathname) || /^\/treatments\/[^/]+$/.test(url.pathname))) return null;
      if (/^\/admin(?:\/|\.html|$)/.test(url.pathname) || url.searchParams.has("edit")) return null;
      if (url.pathname === location.pathname && url.search === location.search) return null;
      url.hash = "";
      return url.href;
    } catch (e) {
      return null;
    }
  }

  function prefetch(href) {
    var connection = navigator.connection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) return;
    var url = internal(href);
    if (!url || prefetched[url]) return;
    prefetched[url] = true;
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = url;
    document.head.appendChild(link);
  }

  function targetLink(event) {
    var target = event.target;
    return target && target.closest ? target.closest("a[href]") : null;
  }

  document.addEventListener("pointerover", function (event) {
    var link = targetLink(event);
    if (link) prefetch(link.href);
  }, { passive: true });

  document.addEventListener("touchstart", function (event) {
    var link = targetLink(event);
    if (link) prefetch(link.href);
  }, { passive: true });

  function warmNavigation() {
    var links = document.querySelectorAll("a.nav-link[href], .navbar-actions a[href], .lang-menu a[href]");
    for (var i = 0; i < links.length; i++) prefetch(links[i].href);
  }

  function scheduleWarmNavigation() {
    if ("requestIdleCallback" in window) requestIdleCallback(warmNavigation, { timeout: 800 });
    else setTimeout(warmNavigation, 300);
  }

  document.addEventListener("focusin", function (event) {
    var link = targetLink(event);
    if (link) prefetch(link.href);
  });

  if (document.readyState !== "loading") scheduleWarmNavigation();
  else document.addEventListener("DOMContentLoaded", scheduleWarmNavigation, { once: true });
})();
