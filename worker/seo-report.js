// Worker Cloudflare : rapport SEO technique d'un site.
// POST { url } -> faits bruts (indexation, technique, contenu, liens, données structurées, international, GEO, mini crawl).
// Les recommandations sont construites côté page (assets/seo-report.js) pour rester bilingues.

const UA = "Mozilla/5.0 (compatible; KevinNsameSEOAudit/1.0; +https://kevinnsame.github.io/#audit)";
const ALLOWED = [/^https:\/\/kevinnsame\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const MAX_HTML = 600000;
const CRAWL_LIMIT = 12;
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"];

function cors(origin) {
  const ok = ALLOWED.some((r) => r.test(origin || ""));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "https://kevinnsame.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) } });
}

async function get(url, opts = {}) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 9000);
  try {
    const r = await fetch(url, { redirect: opts.follow === false ? "manual" : "follow", headers: { "User-Agent": UA, "Accept": opts.accept || "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "fr,en;q=0.8" }, signal: ctrl.signal, method: opts.method || "GET" });
    const ttfb = Date.now() - t0;
    let body = "";
    if (opts.body !== false && opts.method !== "HEAD") {
      body = await r.text();
      if (body.length > MAX_HTML) body = body.slice(0, MAX_HTML);
    }
    return { ok: true, status: r.status, url: r.url || url, headers: r.headers, body, ttfb, redirected: r.redirected, location: r.headers.get("location") };
  } catch (e) {
    return { ok: false, status: 0, url, error: String(e && e.name === "AbortError" ? "timeout" : e), body: "", headers: new Headers() };
  } finally { clearTimeout(timer); }
}

// Suit les redirections une par une pour connaître la chaîne et les codes.
async function chain(url, max = 6) {
  const hops = [];
  let cur = url;
  for (let i = 0; i < max; i++) {
    const r = await get(cur, { follow: false, body: false, timeout: 7000 });
    hops.push({ url: cur, status: r.status });
    if (r.status >= 300 && r.status < 400 && r.location) { cur = new URL(r.location, cur).href; continue; }
    break;
  }
  return { hops, final: cur, finalStatus: hops[hops.length - 1].status };
}

const decode = (s) => (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
const strip = (s) => decode((s || "").replace(/<[^>]+>/g, " "));
function attr(tag, name) {
  const m = tag.match(new RegExp("\\s" + name + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : null;
}
function tags(html, name) { return html.match(new RegExp("<" + name + "\\b[^>]*>", "gi")) || []; }
function meta(html, key) {
  for (const t of tags(html, "meta")) {
    const n = (attr(t, "name") || attr(t, "property") || "").toLowerCase();
    if (n === key) return attr(t, "content");
  }
  return null;
}

function parse(html, pageUrl) {
  const host = new URL(pageUrl).hostname.replace(/^www\./, "");
  const head = (html.match(/<head\b[\s\S]*?<\/head>/i) || [""])[0];
  const bodyHtml = (html.match(/<body\b[\s\S]*<\/body>/i) || [html])[0];
  const clean = bodyHtml.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ").replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  const text = strip(clean);
  const words = text ? text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;

  const title = strip((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const titles = (html.match(/<title\b/gi) || []).length;
  const desc = meta(html, "description");
  const robots = (meta(html, "robots") || "").toLowerCase();
  const htmlTags = html.slice(0, 20000).match(/<html\b[^>]*>/gi) || [""];
  const htmlTag = htmlTags.find((t) => /\slang\s*=/i.test(t)) || htmlTags[htmlTags.length - 1];

  const links = tags(head + html.slice(0, 400000), "link");
  let canonical = null; const hreflang = []; let favicon = false; let manifest = false; let preconnect = 0;
  for (const l of links) {
    const rel = (attr(l, "rel") || "").toLowerCase();
    if (rel === "canonical" && !canonical) canonical = attr(l, "href");
    if (rel === "alternate" && attr(l, "hreflang")) hreflang.push({ lang: attr(l, "hreflang"), href: attr(l, "href") });
    if (/icon/.test(rel)) favicon = true;
    if (rel === "manifest") manifest = true;
    if (rel === "preconnect" || rel === "dns-prefetch") preconnect++;
  }

  const headings = [];
  const hre = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi; let m;
  while ((m = hre.exec(bodyHtml)) && headings.length < 80) headings.push({ l: +m[1], t: strip(m[2]).slice(0, 120) });
  let skips = 0; for (let i = 1; i < headings.length; i++) if (headings[i].l - headings[i - 1].l > 1) skips++;

  const imgs = tags(bodyHtml, "img");
  const img = { total: imgs.length, noAlt: 0, emptyAlt: 0, noDims: 0, lazy: 0, modern: 0, examples: [] };
  for (const t of imgs) {
    const alt = attr(t, "alt"); const src = attr(t, "src") || attr(t, "data-src") || "";
    if (alt === null) { img.noAlt++; if (img.examples.length < 5) img.examples.push(src.slice(0, 140)); }
    else if (!alt.trim()) img.emptyAlt++;
    if (!attr(t, "width") || !attr(t, "height")) img.noDims++;
    if ((attr(t, "loading") || "").toLowerCase() === "lazy") img.lazy++;
    if (/\.(webp|avif)(\?|$)/i.test(src) || /<picture/i.test(bodyHtml)) img.modern++;
  }

  const anchors = bodyHtml.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const lk = { internal: 0, external: 0, nofollowInternal: 0, empty: 0, generic: 0, genericEx: [], internalUrls: [], tel: false, mail: false };
  const GENERIC = /^(ici|cliquez ici|cliquer ici|en savoir plus|lire la suite|voir plus|plus|d[ée]couvrir|click here|here|read more|learn more|more|lien)$/i;
  for (const a of anchors) {
    const open = a.match(/<a\b[^>]*>/i)[0];
    const href = attr(open, "href"); if (!href) continue;
    if (/^tel:/i.test(href)) { lk.tel = true; continue; }
    if (/^mailto:/i.test(href)) { lk.mail = true; continue; }
    if (/^(#|javascript:)/i.test(href)) continue;
    let u; try { u = new URL(href, pageUrl); } catch { continue; }
    const txt = strip(a.replace(/<img\b[^>]*alt=("([^"]*)"|'([^']*)')[^>]*>/gi, " $2$3 "));
    const label = txt || attr(open, "aria-label") || attr(open, "title") || "";
    if (!label) lk.empty++;
    else if (GENERIC.test(label.trim())) { lk.generic++; if (lk.genericEx.length < 4) lk.genericEx.push(label.trim()); }
    if (u.hostname.replace(/^www\./, "") === host) {
      lk.internal++;
      if (/nofollow/i.test(attr(open, "rel") || "")) lk.nofollowInternal++;
      u.hash = "";
      if (/^https?:$/.test(u.protocol) && !/\.(pdf|jpe?g|png|gif|webp|avif|svg|mp4|webm|zip|docx?|xlsx?|txt|xml|json|css|js)$/i.test(u.pathname)) lk.internalUrls.push(u.href);
    } else if (/^https?:$/.test(u.protocol)) lk.external++;
  }
  lk.internalUrls = [...new Set(lk.internalUrls)];

  const jsonld = { types: [], errors: 0, raw: 0 };
  const jre = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jre.exec(html))) {
    jsonld.raw++;
    try {
      const walk = (o) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach(walk); const t = o["@type"]; if (t) (Array.isArray(t) ? t : [t]).forEach((x) => jsonld.types.push(String(x))); if (o["@graph"]) walk(o["@graph"]); };
      walk(JSON.parse(m[1].trim()));
    } catch { jsonld.errors++; }
  }
  jsonld.types = [...new Set(jsonld.types)];
  const microdata = /itemscope/i.test(bodyHtml);

  const scripts = tags(html, "script");
  const ext = scripts.map((s) => attr(s, "src")).filter(Boolean);
  const headScripts = tags(head, "script").filter((s) => attr(s, "src") && !/\s(async|defer)\b/i.test(s) && !/type\s*=\s*["']module/i.test(s)).length;
  const css = links.filter((l) => /stylesheet/i.test(attr(l, "rel") || "")).length;
  const mixed = pageUrl.startsWith("https:") ? (html.match(/\s(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi) || []).filter((x) => !/href/i.test(x) || /\.(css|js)(\?|["']|$)/i.test(x)).slice(0, 5).map((x) => x.replace(/^\s(?:src|href)\s*=\s*["']/i, "")) : [];

  const low = html.toLowerCase();
  const gen = (meta(html, "generator") || "").trim();
  const cmsRules = [
    ["WordPress", /\/wp-content\/|\/wp-includes\//], ["Shopify", /cdn\.shopify\.com|shopify\.theme/], ["Wix", /static\.wixstatic\.com|_wixcss/],
    ["PrestaShop", /var prestashop\s*=|\/modules\/ps_[a-z]/], ["Webflow", /data-wf-site=|webflow\.js/], ["Squarespace", /static1\.squarespace\.com/],
    ["Drupal", /drupal\.settings|\/sites\/default\/files\//], ["Joomla", /\/media\/jui\/|\/components\/com_/], ["TYPO3", /typo3conf|typo3temp/],
    ["Magento", /mage\/cookies|\/static\/version\d+\/frontend\//], ["HubSpot CMS", /hs-scripts\.com|hubspot\.net\/hub\//],
  ];
  const cmsHit = cmsRules.find(([, re]) => re.test(low));
  const stack = {
    cms: cmsHit ? cmsHit[0] : (gen && !/builder|elementor|divi|yoast|rank math|powered by/i.test(gen) ? gen.slice(0, 40) : null),
    gtm: /googletagmanager\.com\/gtm\.js|['"]gtm-[a-z0-9]{4,}['"]/i.test(html),
    ga4: /googletagmanager\.com\/gtag\/js\?id=g-|gtag\(\s*['"]config['"]\s*,\s*['"]g-/i.test(html),
    ads: /googletagmanager\.com\/gtag\/js\?id=aw-|gtag\(\s*['"]config['"]\s*,\s*['"]aw-|googleadservices\.com/i.test(html),
    meta: /connect\.facebook\.net\/[^"']*fbevents|fbq\(\s*['"]init/i.test(html),
    linkedin: /snap\.licdn\.com|_linkedin_partner_id/i.test(html),
    matomo: /_paq\.push|matomo\.js|piwik\.js/i.test(html),
    hotjar: /static\.hotjar\.com|clarity\.ms\/tag/i.test(html),
    consent: /axeptio|didomi|tarteaucitron|cookiebot|onetrust|cookieyes|complianz|iubenda|usercentrics|quantcast\.mgr/i.test(low),
  };

  return {
    lang: attr(htmlTag, "lang") || (meta(html, "og:locale") ? meta(html, "og:locale").replace("_", "-") : null),
    title, titleLen: title.length, titles,
    desc, descLen: desc ? desc.length : 0,
    robots, noindex: /noindex/.test(robots), nofollow: /nofollow/.test(robots),
    canonical, hreflang,
    viewport: !!meta(html, "viewport"),
    charset: /<meta[^>]+charset/i.test(head),
    favicon, manifest, preconnect,
    h1: headings.filter((h) => h.l === 1).map((h) => h.t),
    headings: headings.slice(0, 40), skips,
    words, text: text.slice(0, 4000),
    htmlBytes: html.length,
    img, links: { ...lk, internalUrls: lk.internalUrls.slice(0, 60), internalCount: lk.internalUrls.length },
    og: { title: meta(html, "og:title"), desc: meta(html, "og:description"), image: meta(html, "og:image"), type: meta(html, "og:type") },
    twitter: meta(html, "twitter:card"),
    jsonld, microdata,
    scripts: { total: scripts.length, external: ext.length, blockingHead: headScripts, thirdParty: [...new Set(ext.map((s) => { try { return new URL(s, pageUrl).hostname; } catch { return ""; } }).filter((h) => h && h.replace(/^www\./, "") !== host))].slice(0, 12) },
    css, mixed, stack,
    iframes: tags(bodyHtml, "iframe").length,
  };
}

function robotsInfo(txt) {
  const lines = (txt || "").split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
  const groups = []; let cur = null;
  for (const l of lines) {
    const [k, ...v] = l.split(":"); const key = k.trim().toLowerCase(); const val = v.join(":").trim();
    if (key === "user-agent") { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); }
    else if ((key === "disallow" || key === "allow") && cur) cur.rules.push({ type: key, path: val });
  }
  const sitemaps = lines.filter((l) => /^sitemap\s*:/i.test(l)).map((l) => l.replace(/^sitemap\s*:/i, "").trim());
  const blocksAll = (agent) => {
    const g = groups.find((x) => x.agents.includes(agent.toLowerCase())) || groups.find((x) => x.agents.includes("*"));
    if (!g) return false;
    return g.rules.some((r) => r.type === "disallow" && r.path === "/") && !g.rules.some((r) => r.type === "allow" && r.path === "/");
  };
  const ai = {}; AI_BOTS.forEach((b) => (ai[b] = blocksAll(b) ? "bloqué" : "autorisé"));
  return { sitemaps, disallowAll: blocksAll("*"), googlebotBlocked: blocksAll("Googlebot"), ai, lines: lines.length, disallows: groups.flatMap((g) => g.rules.filter((r) => r.type === "disallow" && r.path).map((r) => r.path)).slice(0, 15) };
}

async function sitemapInfo(candidates) {
  for (const u of candidates) {
    const r = await get(u, { accept: "application/xml,text/xml,*/*", timeout: 8000 });
    if (r.status === 200 && /<(urlset|sitemapindex)\b/i.test(r.body)) {
      const isIndex = /<sitemapindex\b/i.test(r.body);
      const locs = (r.body.match(/<loc>\s*([^<]+?)\s*<\/loc>/gi) || []).map((x) => x.replace(/<\/?loc>/gi, "").trim());
      const lastmods = (r.body.match(/<lastmod>/gi) || []).length;
      let urls = isIndex ? null : locs.length;
      if (isIndex && locs[0]) {
        const sub = await get(locs[0], { accept: "application/xml,text/xml,*/*", timeout: 8000 });
        urls = (sub.body.match(/<loc>/gi) || []).length;
      }
      return { found: true, url: u, isIndex, children: isIndex ? locs.length : 0, urls, lastmodShare: locs.length ? Math.round((lastmods / locs.length) * 100) : 0, sample: isIndex ? [] : locs.slice(0, 50) };
    }
  }
  return { found: false };
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function audit(input) {
  let start; try { start = new URL(/^https?:\/\//i.test(input) ? input : "https://" + input); } catch { return { error: "url" }; }
  if (!globalThis.__SEO_TEST__ && (!/\./.test(start.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(start.hostname))) return { error: "url" };

  const t0 = Date.now();
  const home = await get(start.href);
  if (!home.ok || !home.body) return { error: "fetch", detail: home.error || "HTTP " + home.status, status: home.status };
  const finalUrl = home.url;
  const origin = new URL(finalUrl).origin;
  const bare = new URL(finalUrl).hostname.replace(/^www\./, "");

  const [httpChain, altChain, robotsR, llmsR, notFound] = await Promise.all([
    chain("http://" + new URL(finalUrl).hostname + "/"),
    chain("https://" + (new URL(finalUrl).hostname.startsWith("www.") ? bare : "www." + bare) + "/"),
    get(origin + "/robots.txt", { accept: "text/plain,*/*", timeout: 7000 }),
    get(origin + "/llms.txt", { accept: "text/plain,*/*", timeout: 7000 }),
    get(origin + "/page-qui-n-existe-pas-" + Math.random().toString(36).slice(2, 8), { timeout: 7000 }),
  ]);

  const page = parse(home.body, finalUrl);
  const robots = robotsR.status === 200 && !/<html/i.test(robotsR.body) ? { found: true, ...robotsInfo(robotsR.body) } : { found: false, status: robotsR.status };
  const smCands = [...new Set([...(robots.sitemaps || []), origin + "/sitemap.xml", origin + "/sitemap_index.xml", origin + "/wp-sitemap.xml"])].slice(0, 4);
  const sitemap = await sitemapInfo(smCands);

  // Mini crawl : liens internes de l'accueil, complétés par le sitemap.
  const seeds = [...page.links.internalUrls, ...(sitemap.sample || [])]
    .filter((u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, "") === bare && x.href.split("#")[0] !== finalUrl; } catch { return false; } })
    .map((u) => u.split("#")[0]);
  const toCrawl = [...new Set(seeds)].slice(0, CRAWL_LIMIT);
  const crawled = await pool(toCrawl, 4, async (u) => {
    const r = await get(u, { timeout: 8000 });
    const isHtml = /text\/html/i.test(r.headers.get("content-type") || "");
    const base = { url: u, status: r.status, final: r.url !== u ? r.url : null, ttfb: r.ttfb };
    if (!isHtml || r.status >= 400 || !r.body) return base;
    const p = parse(r.body, r.url);
    return { ...base, title: p.title, desc: p.desc, h1: p.h1.length, h1t: p.h1[0] || "", canonical: p.canonical, noindex: p.noindex, words: p.words, imgNoAlt: p.img.noAlt, jsonld: p.jsonld.types, xRobots: r.headers.get("x-robots-tag") };
  });

  const h = home.headers;
  return {
    input: start.href, url: finalUrl, host: new URL(finalUrl).hostname, ms: Date.now() - t0,
    http: {
      status: home.status, ttfb: home.ttfb, bytes: home.body.length,
      contentType: h.get("content-type"), encoding: h.get("content-encoding"), cache: h.get("cache-control"),
      hsts: !!h.get("strict-transport-security"), xRobots: h.get("x-robots-tag"), server: h.get("server"),
      https: finalUrl.startsWith("https:"),
      httpToHttps: httpChain, wwwVariant: altChain,
    },
    page, robots,
    llms: { found: llmsR.status === 200 && !/<html/i.test(llmsR.body), size: llmsR.status === 200 ? llmsR.body.length : 0 },
    notFound: { status: notFound.status },
    sitemap: { ...sitemap, sample: undefined },
    crawl: crawled,
  };
}

export default {
  audit,
  async fetch(req) {
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (req.method !== "POST") return json({ error: "method" }, 405, origin);
    let body; try { body = await req.json(); } catch { return json({ error: "json" }, 400, origin); }
    try { return json(await audit(String(body.url || "").slice(0, 300)), 200, origin); }
    catch (e) { return json({ error: "internal", detail: String(e).slice(0, 200) }, 500, origin); }
  },
};
