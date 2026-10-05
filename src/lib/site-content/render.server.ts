import { getContentSnapshot, isSiteLang, SITE_LANGS, type SiteLang } from "./server";
import { PAGE_SOURCE } from "./pages.server";
import { renderPage } from "./transform";
import { createTreatmentPage } from "./treatment-page";
import { getTreatment } from "./treatments";
import originalAssets from "@/assets/original-map.json";
import heroPortrait from "@/assets/hero-portrait.png.asset.json";
import optimizedAssets from "@/assets/optimized-map.json";
import optimizedPortrait from "@/assets/hero-portrait-new.webp.asset.json";

/**
 * Builds one public page from the bundled language snapshot; the
 * markup itself is untouched so the design stays identical to the original.
 * Each supported language is rendered server-side via ?lang=xx.
 */
export async function renderSitePage(request: Request, slug: string): Promise<Response> {
  if (slug === "gallery") {
    return Response.redirect(new URL("/service.html", request.url), 301);
  }
  const source = PAGE_SOURCE[slug];
  if (!source) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const editMode = url.searchParams.get("edit") === "1";
  const langParam = url.searchParams.get("lang") || "";
  const cookieLang = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)site_lang=(en|ar)(?:;|$)/)?.[1];
  const lang: SiteLang = isSiteLang(langParam)
    ? langParam
    : cookieLang && isSiteLang(cookieLang)
      ? cookieLang
      : "en";

  const snapshot = await getContentSnapshot();
  const texts = snapshot.langs[lang];

  // Fully rendered pages are memoised per slug+language+content version, so a
  // repeat request skips the HTML parse/transform entirely.
  const cacheKey = `${slug}|${lang}|${snapshot.version}|${url.origin}|${url.pathname}`;
  if (!editMode) {
    const cached = RENDER_CACHE.get(cacheKey);
     if (cached) return htmlResponse(cached, snapshot.version, false);
  }

  const bootstrap =
    `<script>window.__SITE_LANG__=${JSON.stringify(lang)};` +
    `window.__SITE_LANGS__=${JSON.stringify([...SITE_LANGS])};` +
    `window.__SITE_EDIT__=${editMode ? "true" : "false"};</script>`;


  let html = renderPage(source, {
    texts,
    images: snapshot.images,
    editMode,
    lang,
    bodyScripts: bootstrap,
  });

  // SEO: self-referential hreflang alternates for every published language.
  const links = SITE_LANGS.map((code) => {
    const href =
      code === "en" ? url.origin + url.pathname : `${url.origin}${url.pathname}?lang=${code}`;
    return `<link rel="alternate" hreflang="${code}" href="${href}" />`;
  });
  links.push(`<link rel="alternate" hreflang="x-default" href="${url.origin}${url.pathname}" />`);
  const headIndex = html.lastIndexOf("</head>");
  if (headIndex !== -1) html = html.slice(0, headIndex) + links.join("") + html.slice(headIndex);

  html = prepareHtml(html);
  if (!editMode) {
    if (RENDER_CACHE.size > 64) RENDER_CACHE.clear();
    RENDER_CACHE.set(cacheKey, html);
  }

  return htmlResponse(html, snapshot.version, editMode);
}

export async function renderTreatmentPage(request: Request, slug: string): Promise<Response> {
  const treatment = getTreatment(slug);
  if (!treatment) return new Response("Treatment not found", { status: 404 });

  const url = new URL(request.url);
  const editMode = url.searchParams.get("edit") === "1";
  const langParam = url.searchParams.get("lang") || "";
  const cookieLang = request.headers.get("cookie")?.match(/(?:^|;\s*)site_lang=(en|ar)(?:;|$)/)?.[1];
  const lang: SiteLang = isSiteLang(langParam) ? langParam : cookieLang && isSiteLang(cookieLang) ? cookieLang : "en";
  const snapshot = await getContentSnapshot();
  const cacheKey = `t:${slug}|${lang}|${snapshot.version}|${url.origin}|${url.pathname}`;
  if (!editMode) {
    const hit = RENDER_CACHE.get(cacheKey);
    if (hit) return htmlResponse(hit, snapshot.version, false);
  }
  const bootstrap = `<script>window.__SITE_LANG__=${JSON.stringify(lang)};window.__SITE_LANGS__=${JSON.stringify([...SITE_LANGS])};window.__SITE_EDIT__=${editMode ? "true" : "false"};</script>`;
  let html = renderPage(createTreatmentPage(treatment), {
    texts: snapshot.langs[lang],
    images: snapshot.images,
    editMode,
    lang,
    bodyScripts: bootstrap,
  });
  const links = SITE_LANGS.map((code) => `<link rel="alternate" hreflang="${code}" href="${url.origin}${url.pathname}${code === "en" ? "" : `?lang=${code}`}" />`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${url.origin}${url.pathname}" />`);
  html = html.replace("</head>", `${links.join("")}</head>`);
  html = prepareHtml(html);
  if (!editMode) {
    if (RENDER_CACHE.size > 64) RENDER_CACHE.clear();
    RENDER_CACHE.set(cacheKey, html);
  }
  return htmlResponse(html, snapshot.version, editMode);
}

/** slug|lang|version|path -> fully rendered HTML */
const RENDER_CACHE = new Map<string, string>();

function prepareHtml(html: string): string {
  // Preserve all original markup and styling; replace only the homepage portrait.
  html = html.replace(/(<img\b[^>]*class="hero-reference-doctor"[^>]*src=")[^"]*(")/g, `$1${optimizedPortrait.url}$2`);
  if (html.includes('class="hero-reference-doctor"')) {
    html = html.replace(/(<link rel="preload" as="image" href=")\/img\/dental-care-portrait\.jpg(")/g, `$1${optimizedPortrait.url}$2`);
    html = html.split(heroPortrait.url).join(optimizedPortrait.url);
    // Only the visible portrait receives high image priority.
    html = html.replace(/<link\b[^>]*rel="preload"[^>]*href="\/arabian-logo\.png"[^>]*>/g, "");
    html = html.replace(/<img\b[^>]*class="hero-reference-doctor"[^>]*>/g, (tag) => tag.replace(/\s(?:loading|decoding|fetchpriority)="[^"]*"/g, "").replace(/>$/, ' loading="eager" decoding="async" fetchpriority="high">'));
  }
  for (const [path, url] of Object.entries(originalAssets)) {
    const optimized = optimizedAssets[path as keyof typeof optimizedAssets] ?? url;
    html = html.split(path).join(optimized).split(url).join(optimized);
  }
  html = html.replace(/(href|src)="(css\/|lib\/|js\/|home\.css|theme-gold\.css|premium\.css)/g, '$1="/$2');
  if (!html.includes('property="og:title"')) {
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? 'Dr. Zaid Khaled Alamoudi';
    const description = 'General and aesthetic dental care with Dr. Zaid Khaled Alamoudi in Amman, Jordan.';
    html = html.replace('</head>', `<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head>`);
  }
  return html;
}

function htmlResponse(html: string, version: number | string, editMode: boolean): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": editMode
        ? "no-store"
        : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Version": String(version),
      "Vary": "Cookie",
    },
  });
}
