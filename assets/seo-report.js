/* Rapport SEO complet : lit les faits du worker seo-report, les résultats PageSpeed et les positions Google,
   puis construit un plan d'action priorisé, avec preuves et corrections concrètes. */
(function(){
"use strict";
var REPORT_URL = "https://portfolio-seo-report.kevinsame99.workers.dev/";
var CODE_URL = "https://script.google.com/macros/s/AKfycbyyayLkqZwDsF-_njUeS4-mkwTzo3r7T_8t849Ggpk7YaRw69bcCYt6see_lvdne8tEEw/exec";
var EN = (document.documentElement.lang || "fr").slice(0,2) === "en";
function L(fr,en){ return EN ? en : fr; }
function push(o){ try{ (window.dataLayer = window.dataLayer || []).push(o); }catch(e){} }
function el(tag, cls, txt){ var n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }
function short(u){ try{ var x=new URL(u); return (x.pathname+x.search)||"/"; }catch(e){ return u; } }
function esc(s){ return String(s==null?"":s); }
function contactHref(){ var a=document.querySelector('a[href^="mailto:"]'); return a ? a.getAttribute("href").split("?")[0] : null; }

var SEV = { crit:{w:40, fr:"Critique", en:"Critical"}, high:{w:20, fr:"Importante", en:"High"}, med:{w:10, fr:"Moyenne", en:"Medium"}, low:{w:4, fr:"À améliorer", en:"Minor"} };
var EFF = { quick:L("moins d'une heure","under an hour"), mid:L("une demi-journée","half a day"), proj:L("quelques jours","a few days") };
var CATS = [
  ["index", L("Présence sur Google","Presence on Google")],
  ["tech", L("Sécurité et fiabilité","Security and reliability")],
  ["content", L("Textes et titres","Text and headings")],
  ["links", L("Liens entre les pages","Links between pages")],
  ["schema", L("Fiche d'identité pour Google","Identity card for Google")],
  ["geo", L("Visibilité dans les IA","Visibility in AI tools")],
  ["perf", L("Vitesse","Speed")],
  ["track", L("Mesure et cookies","Tracking and cookies")]
];

var state = { url:null, facts:null, psi:null, pos:null, err:null, box:null };

function brand(f){
  var og=f.page.og||{}, t=(og.title||f.page.title||f.host).split(/[|\-–:]/)[0].trim();
  return t || f.host;
}

/* ---------- Règles ---------- */
function rules(f, psi, pos){
  var R=[], p=f.page, cr=(f.crawl||[]), html=cr.filter(function(c){ return c.title!==undefined; });
  var origin=""; try{ origin=new URL(f.url).origin; }catch(e){}
  function add(o){ R.push(o); }

  // Indexation
  if(p.noindex) add({cat:"index", sev:"crit", eff:"quick", t:L("La page d'accueil est en noindex : Google ne la montre pas","The homepage is set to noindex: Google will not show it"),
    ev:["<meta name=\"robots\" content=\""+p.robots+"\">"], fix:L("Retirez noindex de la balise meta robots (ou du réglage « Demander aux moteurs de ne pas indexer » dans le CMS), puis demandez une indexation dans la Search Console.","Remove noindex from the robots meta tag (or the CMS \"discourage search engines\" setting), then request indexing in Search Console.")});
  if(f.http.xRobots && /noindex/i.test(f.http.xRobots)) add({cat:"index", sev:"crit", eff:"quick", t:L("Le serveur envoie un en-tête X-Robots-Tag: noindex","The server sends an X-Robots-Tag: noindex header"), ev:["X-Robots-Tag: "+f.http.xRobots], fix:L("Supprimez cet en-tête dans la configuration du serveur ou du CDN.","Remove this header from the server or CDN configuration.")});
  if(f.robots.found && f.robots.disallowAll) add({cat:"index", sev:"crit", eff:"quick", t:L("Le robots.txt bloque tout le site","robots.txt blocks the whole site"), ev:["User-agent: *","Disallow: /"], fix:L("Remplacez « Disallow: / » par des règles ciblées (pages d'administration, panier, recherche interne).","Replace \"Disallow: /\" with targeted rules (admin, cart, internal search).")});
  if(!f.robots.found) add({cat:"index", sev:"med", eff:"quick", t:L("Pas de fichier robots.txt","No robots.txt file"), ev:[origin+"/robots.txt → "+(f.robots.status||"absent")],
    fix:L("Créez un robots.txt à la racine qui indique au moins l'adresse du sitemap.","Create a robots.txt at the root that at least points to the sitemap."), code:"User-agent: *\nDisallow:\n\nSitemap: "+origin+"/sitemap.xml"});
  if(!f.sitemap.found) add({cat:"index", sev:"high", eff:"quick", t:L("Aucun sitemap XML trouvé","No XML sitemap found"), ev:[L("Testé : sitemap déclaré dans robots.txt, /sitemap.xml, /sitemap_index.xml","Checked: robots.txt declaration, /sitemap.xml, /sitemap_index.xml")],
    fix:L("Générez un sitemap (Yoast ou Rank Math sur WordPress, natif sur Shopify et Wix), déclarez-le dans robots.txt et soumettez-le dans la Search Console.","Generate a sitemap (Yoast or Rank Math on WordPress, built in on Shopify and Wix), declare it in robots.txt and submit it in Search Console.")});
  else {
    if(f.robots.found && !(f.robots.sitemaps||[]).length) add({cat:"index", sev:"low", eff:"quick", t:L("Le sitemap n'est pas déclaré dans robots.txt","The sitemap is not declared in robots.txt"), ev:[f.sitemap.url], fix:L("Ajoutez la ligne « Sitemap: "+f.sitemap.url+" » en bas du robots.txt.","Add \"Sitemap: "+f.sitemap.url+"\" at the end of robots.txt.")});
    if(f.sitemap.urls!=null && f.sitemap.lastmodShare<50) add({cat:"index", sev:"low", eff:"quick", t:L("Le sitemap n'indique pas les dates de mise à jour","The sitemap has no update dates"), ev:[f.sitemap.lastmodShare+L(" % des URL ont une balise <lastmod>","% of URLs have a <lastmod> tag")], fix:L("Ajoutez <lastmod> à chaque URL : Google recrawle plus vite les pages modifiées.","Add <lastmod> to each URL: Google recrawls changed pages faster.")});
  }
  if(!p.canonical) add({cat:"index", sev:"med", eff:"quick", t:L("Pas de balise canonical sur l'accueil","No canonical tag on the homepage"), ev:[f.url], fix:L("Ajoutez une canonical vers l'URL officielle pour éviter les doublons (paramètres UTM, version avec ou sans slash).","Add a canonical to the official URL to avoid duplicates (UTM parameters, trailing slash variants)."), code:"<link rel=\"canonical\" href=\""+f.url+"\">"});
  else { try{ var cu=new URL(p.canonical,f.url).href; if(cu.replace(/\/$/,"")!==f.url.replace(/\/$/,"")) add({cat:"index", sev:"high", eff:"quick", t:L("La canonical de l'accueil pointe vers une autre adresse","The homepage canonical points to another URL"), ev:[L("Page : ","Page: ")+f.url, "Canonical : "+cu], fix:L("Vérifiez que c'est voulu. Sinon, faites pointer la canonical vers l'URL de la page elle-même.","Check this is intended. Otherwise point the canonical at the page's own URL.")}); }catch(e){} }
  if(f.notFound.status===200) add({cat:"index", sev:"high", eff:"mid", t:L("Les pages inexistantes répondent 200 au lieu de 404 (soft 404)","Missing pages return 200 instead of 404 (soft 404)"), ev:[L("Une URL inventée renvoie le code 200","A made-up URL returns status 200")], fix:L("Configurez le serveur pour renvoyer un vrai code 404 sur les pages introuvables. Sinon Google indexe des pages vides et gaspille son budget de crawl.","Make the server return a real 404 for missing pages. Otherwise Google indexes empty pages and wastes crawl budget.")});
  var broken=cr.filter(function(c){ return c.status>=400 || c.status===0; });
  if(broken.length) add({cat:"index", sev:"high", eff:"quick", t:L(broken.length+" lien(s) interne(s) cassé(s) depuis l'accueil",broken.length+" broken internal link(s) from the homepage"), ev:broken.slice(0,6).map(function(c){ return short(c.url)+" → "+(c.status||L("pas de réponse","no response")); }), fix:L("Corrigez ou retirez ces liens, ou redirigez en 301 les anciennes URL vers la page la plus proche.","Fix or remove these links, or 301-redirect old URLs to the closest page.")});
  var redir=cr.filter(function(c){ return c.final && c.status<400 && c.final.replace(/\/$/,"")!==c.url.replace(/\/$/,""); });
  if(redir.length) add({cat:"links", sev:"low", eff:"quick", t:L(redir.length+" lien(s) interne(s) passent par une redirection",redir.length+" internal link(s) go through a redirect"), ev:redir.slice(0,5).map(function(c){ return short(c.url)+" → "+short(c.final); }), fix:L("Faites pointer les liens directement vers l'URL finale : chaque redirection ralentit la page et dilue un peu l'autorité transmise.","Point links straight to the final URL: each redirect slows the page and leaks a little link equity.")});
  var noidx=html.filter(function(c){ return c.noindex || (c.xRobots && /noindex/i.test(c.xRobots)); });
  if(noidx.length) add({cat:"index", sev:"med", eff:"quick", t:L(noidx.length+" page(s) liée(s) depuis l'accueil "+(noidx.length>1?"sont":"est")+" en noindex",noidx.length+" page(s) linked from the homepage are noindex"), ev:noidx.slice(0,5).map(function(c){ return short(c.url); }), fix:L("Vérifiez que c'est voulu. Une page importante en noindex n'apparaîtra jamais sur Google.","Check this is intended. An important page set to noindex will never rank.")});

  // Technique
  if(!f.http.https) add({cat:"tech", sev:"crit", eff:"mid", t:L("Le site n'est pas en HTTPS","The site is not served over HTTPS"), ev:[f.url], fix:L("Installez un certificat SSL (gratuit avec Let's Encrypt) et redirigez tout le HTTP en 301 vers le HTTPS. Chrome affiche « Non sécurisé » sinon.","Install an SSL certificate (free with Let's Encrypt) and 301-redirect all HTTP to HTTPS. Chrome shows \"Not secure\" otherwise.")});
  var hc=f.http.httpToHttps; if(f.http.https && hc && hc.hops && hc.hops.length){
    var first=hc.hops[0].status;
    if(first===200) add({cat:"tech", sev:"high", eff:"quick", t:L("La version HTTP du site reste accessible sans redirection","The HTTP version is still reachable without a redirect"), ev:[hc.hops[0].url+" → 200"], fix:L("Ajoutez une redirection 301 de http:// vers https:// pour tout le site.","Add a site-wide 301 redirect from http:// to https://.")});
    else if(first===302||first===307) add({cat:"tech", sev:"med", eff:"quick", t:L("La redirection HTTP vers HTTPS est temporaire ("+first+")","The HTTP to HTTPS redirect is temporary ("+first+")"), ev:hc.hops.map(function(x){ return x.url+" → "+x.status; }), fix:L("Passez-la en 301 (permanente) pour transmettre l'autorité des liens.","Make it a 301 (permanent) so link equity is passed on.")});
    if(hc.hops.length>2) add({cat:"tech", sev:"low", eff:"quick", t:L("Chaîne de "+(hc.hops.length-1)+" redirections avant d'arriver sur la page","Chain of "+(hc.hops.length-1)+" redirects before the page loads"), ev:hc.hops.map(function(x){ return x.url+" → "+x.status; }), fix:L("Redirigez en une seule fois vers l'URL finale (https et bon sous-domaine).","Redirect in a single hop to the final URL (https and the right subdomain).")});
  }
  var wv=f.http.wwwVariant; if(wv && wv.hops && wv.hops[0] && wv.hops[0].status===200) add({cat:"tech", sev:"med", eff:"quick", t:L("Le site répond avec et sans « www » : deux versions du même contenu","The site answers with and without \"www\": two copies of the same content"), ev:[wv.hops[0].url+" → 200", f.url+" → 200"], fix:L("Choisissez une version et redirigez l'autre en 301.","Pick one version and 301-redirect the other.")});
  if(f.http.https && !f.http.hsts) add({cat:"tech", sev:"low", eff:"quick", t:L("Pas d'en-tête HSTS","No HSTS header"), ev:["Strict-Transport-Security : "+L("absent","missing")], fix:L("Ajoutez « Strict-Transport-Security: max-age=31536000 » pour forcer le HTTPS dans le navigateur.","Add \"Strict-Transport-Security: max-age=31536000\" to force HTTPS in the browser.")});
  if(f.http.ttfb>800) add({cat:"tech", sev:"med", eff:"proj", t:L("Le serveur met "+f.http.ttfb+" ms à répondre","The server takes "+f.http.ttfb+" ms to respond"), ev:["TTFB "+f.http.ttfb+" ms "+L("(mesuré depuis le réseau Cloudflare)","(measured from Cloudflare's network)")], fix:L("Activez un cache de page (WP Rocket, LiteSpeed Cache, cache CDN) et vérifiez l'hébergement. Objectif : moins de 600 ms.","Enable page caching (WP Rocket, LiteSpeed Cache, CDN cache) and review hosting. Target: under 600 ms.")});
  if(p.mixed && p.mixed.length) add({cat:"tech", sev:"high", eff:"quick", t:L("Contenu mixte : des ressources sont chargées en HTTP sur une page HTTPS","Mixed content: resources loaded over HTTP on an HTTPS page"), ev:p.mixed, fix:L("Passez ces URL en https://. Le navigateur peut les bloquer et afficher un avertissement.","Switch these URLs to https://. Browsers may block them and show a warning.")});
  if(!p.viewport) add({cat:"tech", sev:"high", eff:"quick", t:L("Pas de balise viewport : le site n'est pas adapté au mobile","No viewport tag: the site is not mobile-ready"), ev:["<meta name=\"viewport\"> "+L("absente","missing")], fix:L("Google indexe la version mobile en priorité.","Google indexes the mobile version first."), code:"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"});
  if(!p.lang) add({cat:"tech", sev:"med", eff:"quick", t:L("La langue de la page n'est pas déclarée","The page language is not declared"), ev:["<html> "+L("sans attribut lang","without a lang attribute")], fix:L("Indiquez la langue pour Google, les lecteurs d'écran et la traduction automatique.","Declare the language for Google, screen readers and auto-translation."), code:"<html lang=\"fr\">"});
  if(p.scripts.blockingHead>=2) add({cat:"perf", sev:"med", eff:"mid", t:L(p.scripts.blockingHead+" scripts bloquent l'affichage dans le <head>",p.scripts.blockingHead+" scripts block rendering in the <head>"), ev:[L("Scripts sans async ni defer","Scripts without async or defer")], fix:L("Ajoutez defer aux scripts non essentiels ou déplacez-les en bas de page.","Add defer to non-essential scripts or move them to the end of the page.")});
  if(p.scripts.thirdParty.length>=8) add({cat:"perf", sev:"low", eff:"mid", t:L(p.scripts.thirdParty.length+" domaines tiers chargent des scripts",p.scripts.thirdParty.length+" third-party domains load scripts"), ev:p.scripts.thirdParty.slice(0,8), fix:L("Faites le tri : chaque outil tiers ajoute du temps de chargement. Regroupez-les dans Google Tag Manager.","Prune them: each third-party tool adds load time. Group them in Google Tag Manager.")});
  if(!p.favicon) add({cat:"tech", sev:"low", eff:"quick", t:L("Pas de favicon déclaré","No favicon declared"), ev:["<link rel=\"icon\"> "+L("absent","missing")], fix:L("Google affiche le favicon à côté du site dans les résultats mobiles.","Google shows the favicon next to the site in mobile results.")});

  // Contenu
  if(!p.title) add({cat:"content", sev:"crit", eff:"quick", t:L("Pas de balise title","No title tag"), ev:[f.url], fix:L("Écrivez un titre de 50 à 60 caractères avec l'activité, le mot-clé principal et la ville si c'est local.","Write a 50 to 60 character title with the business, main keyword and city if local.")});
  else if(p.titleLen>65) add({cat:"content", sev:"low", eff:"quick", t:L("Titre trop long ("+p.titleLen+" caractères), coupé dans Google","Title too long ("+p.titleLen+" characters), truncated in Google"), ev:["« "+p.title+" »"], fix:L("Ramenez-le sous 60 caractères en gardant le mot-clé au début.","Cut it under 60 characters and keep the keyword first.")});
  else if(p.titleLen<25) add({cat:"content", sev:"med", eff:"quick", t:L("Titre trop court ("+p.titleLen+" caractères)","Title too short ("+p.titleLen+" characters)"), ev:["« "+p.title+" »"], fix:L("Ajoutez l'activité et le mot-clé visé : c'est le premier signal de pertinence pour Google.","Add the business and target keyword: it is Google's first relevance signal.")});
  if(p.titles>1) add({cat:"content", sev:"med", eff:"quick", t:L(p.titles+" balises title sur la même page",p.titles+" title tags on the same page"), ev:[f.url], fix:L("Gardez une seule balise title (souvent un doublon thème + plugin SEO).","Keep a single title tag (often a theme + SEO plugin duplicate).")});
  var all=[{url:f.url,title:p.title,desc:p.desc,h1:p.h1.length,words:p.words}].concat(html);
  function dups(k){ var m={}; all.forEach(function(x){ var v=(x[k]||"").trim().toLowerCase(); if(v) (m[v]=m[v]||[]).push(x.url); }); return Object.keys(m).filter(function(v){ return m[v].length>1; }).map(function(v){ return {v:v, urls:m[v]}; }); }
  var dt=dups("title"); if(dt.length) add({cat:"content", sev:"high", eff:"mid", t:L("Titres identiques sur plusieurs pages","Identical titles on several pages"), ev:dt.slice(0,3).map(function(d){ return "« "+d.v.slice(0,70)+" » : "+d.urls.map(short).join(", "); }), fix:L("Chaque page doit avoir un titre unique. Sinon Google ne sait pas laquelle positionner et elles se concurrencent.","Each page needs a unique title. Otherwise Google cannot tell which one to rank and they compete.")});
  if(!p.desc) add({cat:"content", sev:"med", eff:"quick", t:L("Pas de meta description","No meta description"), ev:[f.url], fix:L("Rédigez 140 à 155 caractères avec un bénéfice et un appel à l'action : c'est votre annonce gratuite dans Google.","Write 140 to 155 characters with a benefit and a call to action: it is your free ad in Google.")});
  else if(p.descLen>165||p.descLen<70) add({cat:"content", sev:"low", eff:"quick", t:L("Meta description de "+p.descLen+" caractères","Meta description of "+p.descLen+" characters"), ev:["« "+p.desc.slice(0,170)+" »"], fix:L("Visez 140 à 155 caractères.","Aim for 140 to 155 characters.")});
  var dd=dups("desc"); if(dd.length) add({cat:"content", sev:"med", eff:"mid", t:L("Meta descriptions identiques sur plusieurs pages","Identical meta descriptions on several pages"), ev:dd.slice(0,3).map(function(d){ return d.urls.map(short).join(", "); }), fix:L("Écrivez une description propre à chaque page.","Write a description specific to each page.")});
  if(!p.h1.length) add({cat:"content", sev:"high", eff:"quick", t:L("Pas de titre H1 sur l'accueil","No H1 heading on the homepage"), ev:[L("Titres trouvés : ","Headings found: ")+(p.headings.slice(0,4).map(function(x){ return "H"+x.l+" "+x.t; }).join(" / ")||L("aucun","none"))], fix:L("Mettez un seul H1 qui dit clairement ce que fait l'entreprise, avec le mot-clé principal.","Use a single H1 that clearly states what the business does, with the main keyword.")});
  else if(p.h1.length>1) add({cat:"content", sev:"low", eff:"quick", t:L(p.h1.length+" titres H1 sur l'accueil",p.h1.length+" H1 headings on the homepage"), ev:p.h1.slice(0,4), fix:L("Gardez un H1 et passez les autres en H2.","Keep one H1 and turn the others into H2.")});
  if(p.skips>0) add({cat:"content", sev:"low", eff:"quick", t:L("Hiérarchie des titres non respectée","Heading levels are skipped"), ev:p.headings.slice(0,8).map(function(x){ return "H"+x.l+" "+x.t.slice(0,50); }), fix:L("Enchaînez H1, H2, H3 sans sauter de niveau : Google et les IA lisent cette structure comme un plan.","Go H1, H2, H3 without skipping levels: Google and AI engines read it as an outline.")});
  var noH1=html.filter(function(c){ return c.h1===0; }); if(noH1.length) add({cat:"content", sev:"med", eff:"quick", t:L(noH1.length+" page(s) sans H1",noH1.length+" page(s) without an H1"), ev:noH1.slice(0,6).map(function(c){ return short(c.url); }), fix:L("Ajoutez un H1 unique sur chacune.","Add a unique H1 to each.")});
  if(p.words<250) add({cat:"content", sev:"med", eff:"proj", t:L("Page d'accueil pauvre en texte ("+p.words+" mots)","Thin homepage ("+p.words+" words)"), ev:[p.words+L(" mots visibles"," visible words")], fix:L("Visez 400 à 800 mots utiles : services, zones desservies, preuves (chiffres, clients, avis), questions fréquentes. Google et les IA ont besoin de texte pour comprendre l'activité.","Aim for 400 to 800 useful words: services, areas served, proof (figures, clients, reviews), FAQs. Google and AI engines need text to understand the business.")});
  var thin=html.filter(function(c){ return c.words!=null && c.words<200 && !c.noindex; }); if(thin.length) add({cat:"content", sev:"med", eff:"proj", t:L(thin.length+" page(s) au contenu trop mince (moins de 200 mots)",thin.length+" thin page(s) (under 200 words)"), ev:thin.slice(0,6).map(function(c){ return short(c.url)+" : "+c.words+L(" mots"," words"); }), fix:L("Enrichissez ces pages ou fusionnez-les. Les pages minces tirent la qualité globale du site vers le bas.","Expand or merge these pages. Thin pages drag down the site's overall quality.")});
  if(p.img.noAlt>0) add({cat:"content", sev:"med", eff:"quick", t:L(p.img.noAlt+" image(s) sans attribut alt",p.img.noAlt+" image(s) without an alt attribute"), ev:p.img.examples, fix:L("Décrivez chaque image en quelques mots (alt=\"\" pour les images décoratives). Ça compte pour Google Images et l'accessibilité.","Describe each image in a few words (alt=\"\" for decorative ones). It matters for Google Images and accessibility.")});
  if(p.img.total>=3 && p.img.noDims/p.img.total>0.5) add({cat:"perf", sev:"low", eff:"quick", t:L(p.img.noDims+" image(s) sans largeur ni hauteur",p.img.noDims+" image(s) without width and height"), ev:[L("Provoque des décalages de mise en page (CLS)","Causes layout shifts (CLS)")], fix:L("Ajoutez width et height sur chaque <img>.","Add width and height to each <img>.")});
  if(p.img.total>=6 && p.img.lazy===0) add({cat:"perf", sev:"low", eff:"quick", t:L("Aucune image en chargement différé","No lazy-loaded images"), ev:[p.img.total+L(" images sur l'accueil"," images on the homepage")], fix:L("Ajoutez loading=\"lazy\" aux images sous la ligne de flottaison (pas à l'image principale).","Add loading=\"lazy\" to below-the-fold images (not the hero image).")});

  // Liens
  if(p.links.internalCount<5) add({cat:"links", sev:"med", eff:"mid", t:L("Seulement "+p.links.internalCount+" lien(s) interne(s) depuis l'accueil","Only "+p.links.internalCount+" internal link(s) from the homepage"), ev:[f.url], fix:L("Liez l'accueil à chaque page service et aux contenus clés. C'est l'accueil qui transmet le plus d'autorité.","Link the homepage to every service page and key content. The homepage passes the most authority.")});
  if(p.links.generic>0) add({cat:"links", sev:"low", eff:"quick", t:L(p.links.generic+" lien(s) avec un texte générique",p.links.generic+" link(s) with generic text"), ev:p.links.genericEx.map(function(x){ return "« "+x+" »"; }), fix:L("Remplacez « en savoir plus » par le sujet de la page cible (« nos travaux de rénovation à Lyon »). L'ancre est un signal de pertinence.","Replace \"read more\" with the target page's topic (\"our kitchen renovations in Leeds\"). Anchor text is a relevance signal.")});
  if(p.links.empty>0) add({cat:"links", sev:"med", eff:"quick", t:L(p.links.empty+" lien(s) sans texte ni libellé",p.links.empty+" link(s) with no text or label"), ev:[L("Souvent des icônes ou des images sans alt","Often icons or images without alt")], fix:L("Ajoutez un aria-label ou un alt sur l'image du lien.","Add an aria-label or an alt on the linked image.")});
  if(p.links.nofollowInternal>0) add({cat:"links", sev:"med", eff:"quick", t:L(p.links.nofollowInternal+" lien(s) interne(s) en nofollow",p.links.nofollowInternal+" internal nofollow link(s)"), ev:[L("rel=\"nofollow\" sur des liens vers votre propre site","rel=\"nofollow\" on links to your own site")], fix:L("Retirez nofollow des liens internes : il bloque la circulation de l'autorité entre vos pages.","Remove nofollow from internal links: it stops authority flowing between your pages.")});

  // Données structurées
  var types=p.jsonld.types||[], name=brand(f);
  var hasOrg=types.some(function(t){ return /Organization|LocalBusiness|Store|Restaurant|ProfessionalService|Corporation|Person|Hotel|Dentist|Attorney|AutoDealer/i.test(t); });
  if(p.jsonld.errors) add({cat:"schema", sev:"high", eff:"quick", t:L(p.jsonld.errors+" bloc(s) JSON-LD illisible(s)",p.jsonld.errors+" unreadable JSON-LD block(s)"), ev:[L("Erreur de syntaxe JSON","JSON syntax error")], fix:L("Corrigez la syntaxe (virgule, guillemet) et validez sur validator.schema.org. Google ignore un bloc invalide.","Fix the syntax (comma, quote) and validate on validator.schema.org. Google ignores an invalid block.")});
  if(!types.length && !p.microdata && !p.jsonld.errors) add({cat:"schema", sev:"high", eff:"quick", t:L("Aucune donnée structurée Schema.org","No Schema.org structured data"), ev:[L("Ni JSON-LD ni microdonnées","No JSON-LD or microdata")], fix:L("Ajoutez au minimum un bloc Organization (ou LocalBusiness si vous avez une adresse). Google s'en sert pour le panneau d'entreprise, et les IA pour savoir qui vous êtes. Modèle prérempli :","Add at least an Organization block (or LocalBusiness with an address). Google uses it for the knowledge panel, and AI engines to know who you are. Prefilled template:"),
    code:"<script type=\"application/ld+json\">\n"+JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":name,"url":f.url,"logo":origin+"/logo.png","sameAs":["https://www.linkedin.com/company/…"],"contactPoint":{"@type":"ContactPoint","telephone":"+33 …","contactType":"customer service"}},null,2)+"\n</script>"});
  else if(!hasOrg) add({cat:"schema", sev:"med", eff:"quick", t:L("Données structurées présentes, mais pas d'entité Organization","Structured data found, but no Organization entity"), ev:[L("Types trouvés : ","Types found: ")+types.join(", ")], fix:L("Ajoutez un bloc Organization ou LocalBusiness avec nom, logo, coordonnées et sameAs (LinkedIn, Facebook…).","Add an Organization or LocalBusiness block with name, logo, contact details and sameAs (LinkedIn, Facebook…).")});
  var inner=html.filter(function(c){ return c.jsonld; }); if(inner.length>=3 && !inner.some(function(c){ return c.jsonld.indexOf("BreadcrumbList")>-1; })) add({cat:"schema", sev:"low", eff:"mid", t:L("Pas de fil d'Ariane balisé (BreadcrumbList)","No BreadcrumbList markup"), ev:[inner.length+L(" pages internes analysées"," inner pages checked")], fix:L("Le balisage BreadcrumbList remplace l'URL par un chemin lisible dans les résultats Google.","BreadcrumbList markup replaces the URL with a readable path in Google results.")});
  if(!p.og.title || !p.og.image) add({cat:"schema", sev:"med", eff:"quick", t:L("Balises Open Graph incomplètes : aperçu pauvre sur LinkedIn et WhatsApp","Incomplete Open Graph tags: weak previews on LinkedIn and WhatsApp"), ev:["og:title "+(p.og.title?"✓":"✗")+"  og:description "+(p.og.desc?"✓":"✗")+"  og:image "+(p.og.image?"✓":"✗")],
    fix:L("Ajoutez les balises Open Graph avec une image 1200 × 630 px.","Add Open Graph tags with a 1200 × 630 px image."), code:"<meta property=\"og:title\" content=\""+(p.title||name)+"\">\n<meta property=\"og:description\" content=\""+(p.desc||"…").slice(0,150)+"\">\n<meta property=\"og:image\" content=\""+origin+"/partage-1200x630.jpg\">\n<meta property=\"og:url\" content=\""+f.url+"\">"});

  // International
  if(p.hreflang.length && !p.hreflang.some(function(x){ return /x-default/i.test(x.lang); })) add({cat:"index", sev:"low", eff:"quick", t:L("Hreflang sans x-default","Hreflang without x-default"), ev:p.hreflang.map(function(x){ return x.lang+" → "+short(x.href); }), fix:L("Ajoutez une ligne hreflang=\"x-default\" vers la version par défaut.","Add an hreflang=\"x-default\" line pointing to the default version.")});

  // GEO
  var ai=f.robots.ai||{}, searchBots=["OAI-SearchBot","PerplexityBot","ChatGPT-User"].filter(function(b){ return ai[b]==="bloqué"; }), trainBots=["GPTBot","ClaudeBot","Google-Extended","CCBot","Applebot-Extended"].filter(function(b){ return ai[b]==="bloqué"; });
  if(searchBots.length) add({cat:"geo", sev:"high", eff:"quick", t:L("Le robots.txt bloque les robots de recherche IA","robots.txt blocks AI search crawlers"), ev:searchBots.map(function(b){ return b+" : "+L("bloqué","blocked"); }), fix:L("Ces robots alimentent les réponses de ChatGPT Search et Perplexity, avec un lien vers votre site. Les bloquer vous rend invisible dans ces réponses.","These bots feed ChatGPT Search and Perplexity answers, with a link to your site. Blocking them makes you invisible there.")});
  if(trainBots.length) add({cat:"geo", sev:"low", eff:"quick", t:L("Certains robots d'IA sont bloqués","Some AI crawlers are blocked"), ev:trainBots.map(function(b){ return b+" : "+L("bloqué","blocked"); }), fix:L("C'est un choix défendable (ils servent à entraîner les modèles). Vérifiez qu'il est volontaire et pas hérité d'un modèle de robots.txt.","A defensible choice (they train models). Check it is deliberate and not copied from a template.")});
  if(!f.llms.found) add({cat:"geo", sev:"low", eff:"quick", t:L("Pas de fichier llms.txt","No llms.txt file"), ev:[origin+"/llms.txt → 404"], fix:L("Ce fichier texte résume l'activité et liste les pages clés pour les moteurs IA. Il se rédige en 30 minutes.","This text file summarises the business and lists key pages for AI engines. It takes 30 minutes to write."), code:"# "+name+"\n\n> "+((p.desc||L("Ce que fait l'entreprise, en une phrase.","What the business does, in one sentence.")).slice(0,160))+"\n\n## "+L("Pages principales","Key pages")+"\n- ["+L("Accueil","Home")+"]("+f.url+")\n- [Services]("+origin+"/services)\n- [Contact]("+origin+"/contact)"});
  var faq=types.some(function(t){ return /FAQPage/i.test(t); }) || /\bfaq\b|questions fr[ée]quentes|frequently asked/i.test(p.text||"");
  if(!faq) add({cat:"geo", sev:"med", eff:"mid", t:L("Pas de section questions-réponses","No question-and-answer section"), ev:[L("Ni FAQ visible ni balisage FAQPage","No visible FAQ or FAQPage markup")], fix:L("Ajoutez 5 à 8 questions que posent vraiment vos clients, avec des réponses courtes et chiffrées. C'est le format que ChatGPT, Perplexity et les AI Overviews reprennent le plus.","Add 5 to 8 questions customers really ask, with short, specific answers. It is the format ChatGPT, Perplexity and AI Overviews quote most.")});

  // Mesure
  var st=p.stack||{}, tracked=st.ga4||st.gtm||st.matomo;
  if(!tracked) add({cat:"track", sev:"high", eff:"quick", t:L("Aucun outil de mesure d'audience détecté","No analytics tool detected"), ev:[L("Ni GA4, ni Google Tag Manager, ni Matomo dans le code de l'accueil","No GA4, Google Tag Manager or Matomo in the homepage code")], fix:L("Installez GA4 via Google Tag Manager et suivez les conversions (formulaire, clic téléphone, devis). Sans mesure, impossible de savoir ce que rapporte le SEO.","Install GA4 through Google Tag Manager and track conversions (form, phone click, quote). Without it, SEO results cannot be measured.")});
  if((tracked||st.meta||st.ads||st.linkedin||st.hotjar) && !st.consent) add({cat:"track", sev:"high", eff:"mid", t:L("Traceurs présents sans bannière de consentement détectée","Trackers present but no consent banner detected"), ev:[[st.gtm&&"Google Tag Manager",st.ga4&&"GA4",st.ads&&"Google Ads",st.meta&&"Meta Pixel",st.linkedin&&"LinkedIn Insight",st.hotjar&&"Hotjar / Clarity",st.matomo&&"Matomo"].filter(Boolean).join(", ")], fix:L("La CNIL impose le consentement avant tout cookie publicitaire ou de mesure non exempté. Ajoutez une CMP (Axeptio, Didomi, Cookiebot) et le Consent Mode v2 de Google. Si la bannière se charge via GTM, vérifiez-le dans le navigateur.","Consent is required before non-exempt tracking cookies are set. Add a CMP (Axeptio, Didomi, Cookiebot) and Google Consent Mode v2. If the banner loads through GTM, check it in the browser.")});
  if(!p.links.tel && !p.links.mail) add({cat:"track", sev:"low", eff:"quick", t:L("Pas de lien cliquable pour appeler ou écrire","No clickable phone or email link"), ev:[L("Aucun lien tel: ni mailto: sur l'accueil","No tel: or mailto: link on the homepage")], fix:L("Ajoutez un lien tel: : sur mobile, c'est souvent la première conversion. Suivez ensuite les clics dans GTM.","Add a tel: link: on mobile it is often the first conversion. Then track clicks in GTM.")});

  // Performance (PageSpeed)
  if(psi && psi.lighthouseResult){
    var lr=psi.lighthouseResult, au=lr.audits, cat=lr.categories, perf=cat.performance && cat.performance.score;
    var le=psi.loadingExperience && psi.loadingExperience.metrics;
    function sec(ms){ var s=(ms/1000).toFixed(1); return EN ? s : s.replace(".",","); }
    if(le && le.LARGEST_CONTENTFUL_PAINT_MS && le.LARGEST_CONTENTFUL_PAINT_MS.percentile>2500) add({cat:"perf", sev:le.LARGEST_CONTENTFUL_PAINT_MS.percentile>4000?"high":"med", eff:"proj", t:L("Vos visiteurs réels attendent "+sec(le.LARGEST_CONTENTFUL_PAINT_MS.percentile)+" s avant de voir le contenu principal","Real visitors wait "+sec(le.LARGEST_CONTENTFUL_PAINT_MS.percentile)+" s to see the main content"), ev:["LCP (Chrome UX Report) : "+le.LARGEST_CONTENTFUL_PAINT_MS.percentile+" ms. "+L("Seuil Google : 2 500 ms","Google threshold: 2,500 ms")], fix:L("Compressez et redimensionnez l'image principale (WebP, moins de 200 Ko), préchargez-la avec fetchpriority=\"high\" et réduisez les scripts qui passent avant.","Compress and resize the hero image (WebP, under 200 KB), preload it with fetchpriority=\"high\" and cut scripts that load before it.")});
    if(le && le.INTERACTION_TO_NEXT_PAINT && le.INTERACTION_TO_NEXT_PAINT.percentile>200) add({cat:"perf", sev:"med", eff:"proj", t:L("Le site réagit lentement aux clics (INP "+le.INTERACTION_TO_NEXT_PAINT.percentile+" ms)","The site reacts slowly to clicks (INP "+le.INTERACTION_TO_NEXT_PAINT.percentile+" ms)"), ev:[L("Seuil Google : 200 ms","Google threshold: 200 ms")], fix:L("Allégez le JavaScript (sliders, chats, pixels) et différez ce qui n'est pas utile au premier clic.","Lighten JavaScript (sliders, chat widgets, pixels) and defer what the first click does not need.")});
    if(le && le.CUMULATIVE_LAYOUT_SHIFT_SCORE && le.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile>10) add({cat:"perf", sev:"med", eff:"mid", t:L("La page bouge pendant le chargement (CLS "+(le.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile/100).toFixed(2)+")","The page shifts while loading (CLS "+(le.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile/100).toFixed(2)+")"), ev:[L("Seuil Google : 0,1","Google threshold: 0.1")], fix:L("Réservez la place des images, publicités et bannières (width/height, min-height).","Reserve space for images, ads and banners (width/height, min-height).")});
    var opps=Object.keys(au).map(function(id){ var a=au[id], d=a.details||{}; return (d.type==="opportunity" && a.score!==null && a.score<0.9 && d.overallSavingsMs>=300) ? {t:a.title.replace(/\[([^\]]+)\]\([^)]+\)/g,"$1"), s:d.overallSavingsMs} : null; }).filter(Boolean).sort(function(a,b){ return b.s-a.s; });
    if(perf!=null && perf<0.9 && opps.length) add({cat:"perf", sev:perf<0.5?"high":"med", eff:"mid", t:L("Score de performance mobile : "+Math.round(perf*100)+"/100","Mobile performance score: "+Math.round(perf*100)+"/100"), ev:opps.slice(0,5).map(function(o){ return o.t+" : −"+sec(o.s)+" s"; }), fix:L("Traitez ces chantiers dans l'ordre : ils sont classés par temps gagné, mesuré par Lighthouse.","Work through these in order: they are ranked by time saved, as measured by Lighthouse.")});
  }

  // Positions
  if(pos && pos.keywords && pos.keywords.length){
    var out=pos.keywords.filter(function(k){ return !k.error && !k.position; });
    if(out.length) add({cat:"content", sev:"med", eff:"proj", t:L(out.length+" mot(s)-clé(s) hors du top 10 Google",out.length+" keyword(s) outside Google's top 10"), ev:out.slice(0,4).map(function(k){ return "« "+k.keyword+" »"+((k.top&&k.top[0])?L(" : 1er "," : #1 ")+k.top[0].host:""); }), fix:L("Créez ou renforcez une page dédiée à chaque requête (titre, H1, 600 mots qui répondent à l'intention, maillage depuis l'accueil). Étudiez la page n°1 pour voir ce qu'elle couvre et vous pas.","Create or strengthen a page for each query (title, H1, 600 words matching intent, link from the homepage). Study the #1 page to see what it covers that you don't.")});
  }
  return R;
}

function passes(f){
  var p=f.page, ok=[];
  function o(c,t){ if(c) ok.push(t); }
  o(f.http.https, L("Site en HTTPS","Served over HTTPS"));
  o(f.robots.found && !f.robots.disallowAll, L("robots.txt présent et ouvert","robots.txt present and open"));
  o(f.sitemap.found, L("Sitemap XML trouvé"+(f.sitemap.urls?" ("+f.sitemap.urls+" URL)":""),"XML sitemap found"+(f.sitemap.urls?" ("+f.sitemap.urls+" URLs)":"")));
  o(p.canonical, L("Balise canonical","Canonical tag"));
  o(p.title && p.titleLen>=25 && p.titleLen<=65, L("Titre de bonne longueur","Title length OK"));
  o(p.desc && p.descLen>=70 && p.descLen<=165, L("Meta description de bonne longueur","Meta description length OK"));
  o(p.h1.length===1, L("Un seul H1","Single H1"));
  o(p.viewport, L("Adapté au mobile (viewport)","Mobile viewport"));
  o(p.jsonld.types.length, L("Données structurées : ","Structured data: ")+p.jsonld.types.slice(0,4).join(", "));
  o(p.hreflang.length, L("Versions linguistiques reliées par hreflang","Language versions linked with hreflang"));
  o(f.llms.found, L("Fichier llms.txt pour les IA","llms.txt for AI engines"));
  o(f.notFound.status===404, L("Vraies erreurs 404","Proper 404 errors"));
  o(p.stack && (p.stack.ga4||p.stack.gtm), L("Mesure d'audience installée","Analytics installed"));
  o(p.stack && p.stack.consent, L("Bannière de consentement","Consent banner"));
  return ok;
}

/* ---------- Rendu ---------- */
function score(list, cat){ var pen=list.filter(function(r){ return r.cat===cat; }).reduce(function(s,r){ return s+SEV[r.sev].w; },0); return Math.max(0, 100-pen); }
function tone(s){ return s>=85?"good":(s>=60?"mid":"bad"); }

var NS="http://www.w3.org/2000/svg";
var ICONS={
  index:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  tech:'<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  content:'<path d="M5 6h14M5 10.5h14M5 15h9"/>',
  links:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  schema:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2M14.5 10h3.5M14.5 13.5h3.5"/>',
  geo:'<path d="M4.5 6.5h15v9h-8l-4 3.5v-3.5h-3z"/><path d="M9 11h6"/>',
  perf:'<path d="M4.5 16a7.5 7.5 0 1 1 15 0"/><path d="M12 16l3.5-4.5"/>',
  track:'<path d="M5 19V9M10 19V5M15 19v-7M20 19v-4"/>'
};
function icon(cat){ var s=document.createElementNS(NS,"svg"); s.setAttribute("viewBox","0 0 24 24"); s.setAttribute("aria-hidden","true"); s.innerHTML=ICONS[cat]||ICONS.index; return s; }
function ringEl(score){
  var w=el("div","rp-ring"), r=52, c=2*Math.PI*r, svg=document.createElementNS(NS,"svg"); svg.setAttribute("viewBox","0 0 128 128"); svg.setAttribute("aria-hidden","true");
  function circ(cls){ var x=document.createElementNS(NS,"circle"); x.setAttribute("cx","64"); x.setAttribute("cy","64"); x.setAttribute("r",r); x.setAttribute("class",cls); return x; }
  svg.appendChild(circ("rp-ring-bg")); var fg=circ("rp-ring-fg"); fg.setAttribute("stroke-dasharray",c); fg.setAttribute("stroke-dashoffset",c); svg.appendChild(fg);
  w.appendChild(svg);
  var n=el("div","rp-ring-n"); var strong=el("strong",null,"0"); n.appendChild(strong); n.appendChild(el("span",null,"/100")); w.appendChild(n);
  w.setAttribute("role","img"); w.setAttribute("aria-label",score+"/100");
  var reduce=window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ fg.style.strokeDashoffset=c*(1-score/100); }); });
  if(reduce){ strong.textContent=score; } else { var t0=null; (function f(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/1200); k=1-Math.pow(1-k,3); strong.textContent=Math.round(score*k); if(k<1) requestAnimationFrame(f); })(performance.now());  }
  return w;
}
function pdfMock(f, global){
  var m=el("div","rp-pdf"); m.setAttribute("aria-hidden","true");
  var pg=el("div","rp-pdf-page");
  pg.appendChild(el("p","rp-pdf-k",L("Rapport SEO","SEO report")));
  pg.appendChild(el("p","rp-pdf-h",f.host.replace(/^www\./,"")));
  var sc=el("div","rp-pdf-score is-"+(global>=85?"good":global>=60?"mid":"bad")); sc.textContent=global; pg.appendChild(sc);
  for(var i=0;i<6;i++){ var ln=el("div","rp-pdf-line"); ln.style.width=(55+((i*37)%40))+"%"; pg.appendChild(ln); }
  m.appendChild(pg);
  var pg2=el("div","rp-pdf-page rp-pdf-back"); m.insertBefore(pg2, pg);
  return m;
}
function verdict(s, n){
  if(!n) return L("Rien à corriger sur les points contrôlés. Le site est en très bonne forme.","Nothing to fix on the points checked. The site is in very good shape.");
  if(s>=85) return L("Bonne base. Quelques réglages suffiront à gagner encore en visibilité.","Solid base. A few tweaks will bring more visibility.");
  if(s>=65) return L("Le site tient la route, mais plusieurs points freinent sa visibilité sur Google.","The site holds up, but several issues hold back its Google visibility.");
  return L("Des problèmes importants empêchent le site d'être bien trouvé sur Google. À traiter en priorité.","Major issues stop the site from being found on Google. Fix these first.");
}
function level(s){ return s>=85 ? L("Bon","Good") : s>=60 ? L("À améliorer","Needs work") : L("Faible","Weak"); }
var SEVTXT={crit:L("Urgent","Urgent"), high:L("Important","Important"), med:L("Utile","Useful"), low:L("Bonus","Nice to have")};

function render(){
  var f=state.facts, box=state.box; if(!box) return;
  box.innerHTML=""; box.hidden=false;
  if(state.err){ box.appendChild(el("p","audit-err",L("Le rapport détaillé n'a pas pu être généré pour ce site : ","The detailed report could not be generated for this site: ")+state.err)); return; }
  if(!f){ box.hidden=true; return; }

  var list=rules(f, state.psi, state.pos), order={crit:0,high:1,med:2,low:3}, effo={quick:0,mid:1,proj:2};
  list.sort(function(a,b){ return order[a.sev]-order[b.sev] || effo[a.eff]-effo[b.eff]; });
  var cats=CATS.filter(function(c){ return c[0]!=="perf" || state.psi || list.some(function(r){ return r.cat==="perf"; }); });
  var scores=cats.map(function(c){ return score(list,c[0]); });
  var global=Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
  var counts={crit:0,high:0,med:0,low:0}; list.forEach(function(r){ counts[r.sev]++; });

  // En-tête : site, note, verdict en une phrase
  var head=el("div","rp-head");
  var left=el("div","rp-id");
  left.appendChild(el("p","rp-kicker",L("Rapport SEO de","SEO report for")));
  left.appendChild(el("h3","rp-title",f.host.replace(/^www\./,"")));
  var d=new Date();
  left.appendChild(el("p","rp-meta",d.toLocaleDateString(EN?"en-GB":"fr-FR",{day:"numeric",month:"long",year:"numeric"})+" · "+(1+(f.crawl||[]).length)+L(" pages visitées"," pages visited")+" · Kevin Nsamè"));
  head.appendChild(left);
  var sc=el("div","rp-score is-"+tone(global));
  sc.appendChild(ringEl(global));
  sc.appendChild(el("p","rp-score-l",level(global)));
  head.appendChild(sc);
  box.appendChild(head);
  box.appendChild(el("p","rp-verdict",verdict(global, list.length)));

  var unlocked=false; try{ unlocked=sessionStorage.getItem("kn_rp_ok")===f.host; }catch(x){}
  if(!CODE_URL || CODE_URL.indexOf("__")===0) unlocked=true;
  var SHOW=3, rest=Math.max(list.length-SHOW,0), pagesN=1+(f.crawl||[]).length;

  function item(r,i,full){
    var li=el("li","rp-item sev-"+r.sev+(full?"":" is-teaser"));
    if(full) li.appendChild(el("span","rp-num",String(i+1)));
    else { var ic=el("span","rp-ico"); ic.appendChild(icon(r.cat)); li.appendChild(ic); }
    li.style.setProperty("--i",i);
    var body=el("div","rp-body");
    var tt=r.t, nm=tt.match(/^(\d+)\s/); if(nm) tt=tt.replace(/\(s\)/g, +nm[1]>1?"s":"");
    body.appendChild(el("p","rp-t",tt));
    var tg=el("p","rp-tags"); tg.appendChild(el("span","rp-sev",SEVTXT[r.sev])); tg.appendChild(document.createTextNode(" · "+(CATS.filter(function(c){return c[0]===r.cat;})[0]||["",""])[1]+" · "+EFF[r.eff])); body.appendChild(tg);
    if(!full){ li.appendChild(body); return li; }
    body.appendChild(el("p","rp-fix",r.fix));
    if(r.ev && r.ev.length){ var ev=el("div","rp-ev"); ev.appendChild(el("p","rp-lbl",L("Ce que j'ai trouvé","What I found"))); var ul=el("ul"); r.ev.forEach(function(x){ ul.appendChild(el("li",null,esc(x))); }); ev.appendChild(ul); body.appendChild(ev); }
    if(r.code){ var pre=el("pre","rp-code"); pre.appendChild(el("code",null,r.code)); body.appendChild(pre); }
    li.appendChild(body); return li;
  }
  function imprimerNavigateur(){ document.body.classList.add("print-report"); window.print(); setTimeout(function(){ document.body.classList.remove("print-report"); },500); }
  function imprimer(btn){
    push({event:"rapport_pdf", domaine:f.host});
    var b=btn && btn.nodeType ? btn : box.querySelector(".rp-cta-body .rp-btn"), lbl=b?b.textContent:"";
    if(b){ b.disabled=true; b.textContent=L("Préparation du PDF…","Preparing the PDF…"); }
    function fin(){ if(b){ b.disabled=false; b.textContent=lbl; } }
    chargerPdf(function(ok){
      if(!ok || !window.html2pdf){ fin(); imprimerNavigateur(); return; }
      var w=el("div","pdf-export"), c=box.cloneNode(true);
      c.removeAttribute("id"); c.hidden=false;
      var s0=c.querySelector(".rp-screen"); if(s0) s0.parentNode.removeChild(s0);
      var oR=box.querySelector(".rp-ring"), cR=c.querySelector(".rp-ring");
      if(oR && cR){ var oc=oR.querySelectorAll("circle"), sv=cR.querySelector("svg"), cv=document.createElement("canvas"); cv.width=260; cv.height=260; cv.style.width="100%"; cv.style.height="100%";
        var x=cv.getContext("2d"), bgc=getComputedStyle(oc[0]).stroke, fgc=getComputedStyle(oc[1]).stroke;
        x.lineWidth=20; x.strokeStyle=bgc; x.beginPath(); x.arc(130,130,113,0,2*Math.PI); x.stroke();
        x.lineCap="round"; x.strokeStyle=fgc; x.beginPath(); x.arc(130,130,113,-Math.PI/2,-Math.PI/2+2*Math.PI*global/100); x.stroke();
        if(sv) sv.parentNode.replaceChild(cv,sv); var st=cR.querySelector("strong"); if(st) st.textContent=global; }
      w.appendChild(c); var hold=el("div","pdf-hold"); hold.appendChild(w); document.body.appendChild(hold);
      var nom="rapport-seo-"+f.host.replace(/^www\./,"").replace(/[^a-z0-9.-]/gi,"-")+".pdf";
      window.html2pdf().set({ margin:[12,12,14,12], filename:nom, image:{type:"jpeg", quality:0.95},
        html2canvas:{scale:2, useCORS:true, backgroundColor:"#ffffff", scrollX:0, scrollY:0},
        jsPDF:{unit:"mm", format:"a4", orientation:"portrait"},
        pagebreak:{mode:["css","legacy"], before:[".pdf-brk"], avoid:[".rp-item",".rp-tile",".rp-count","tr",".rp-ok li",".rp-head",".rp-h"]}
      }).from(w).save().then(function(){ hold.parentNode.removeChild(hold); fin(); }, function(){ if(hold.parentNode) hold.parentNode.removeChild(hold); fin(); imprimerNavigateur(); });
    });
  }
  var mh=contactHref();
  function mailLink(){ if(!mh || f.host==="kevinnsame.github.io") return null; var a=el("a","rp-mail",L("M'écrire pour en parler","Email me to discuss it")); a.href=mh+"?subject="+encodeURIComponent(L("Rapport SEO de ","SEO report for ")+f.host); a.addEventListener("click",function(){ push({event:"audit_contact", domaine:f.host, canal:"rapport_email"}); }); return a; }

  // A l'écran : 3 problèmes et l'accès au PDF, rien de plus
  var scr=el("div","rp-screen");
  if(list.length){
    scr.appendChild(el("h4","rp-h",L("Les "+Math.min(SHOW,list.length)+" problèmes les plus urgents","The "+Math.min(SHOW,list.length)+" most urgent issues")));
    var ol0=el("ol","rp-list"); list.slice(0,SHOW).forEach(function(r,i){ ol0.appendChild(item(r,i,false)); }); scr.appendChild(ol0);
  }
  var lock=el("div","rp-lock"), cta=el("div","rp-cta");
  cta.appendChild(pdfMock(f, global));
  var ctaBody=el("div","rp-cta-body"); cta.appendChild(ctaBody);
  if(!unlocked){
    ctaBody.appendChild(el("p","rp-cta-t", rest>0 ? L("+ "+rest+" autre"+(rest>1?"s":"")+" correction"+(rest>1?"s":"")+" dans le rapport complet", "+ "+rest+" more fix"+(rest>1?"es":"")+" in the full report") : L("Les solutions sont dans le rapport complet","The fixes are in the full report")));
    ctaBody.appendChild(el("p","rp-cta-s",L("La solution pour chaque problème, vos notes par thème et le détail des "+pagesN+" pages visitées. Gratuit, en PDF.","The fix for each issue, your scores by area and details of the "+pagesN+" pages visited. Free, as a PDF.")));
    var gate=gateBox(f, global, function(){ render(); setTimeout(imprimer, 300); });
    gate.hidden=false; ctaBody.appendChild(gate);
  } else {
    ctaBody.appendChild(el("p","rp-cta-t",L("Votre rapport complet est prêt","Your full report is ready")));
    ctaBody.appendChild(el("p","rp-cta-s",L(list.length+" corrections expliquées, vos notes par thème et le détail des "+pagesN+" pages visitées.",list.length+" fixes explained, your scores by area and details of the "+pagesN+" pages visited.")));
    var pdf=el("button","rp-btn",L("Télécharger le PDF","Download the PDF")); pdf.type="button"; pdf.addEventListener("click",function(){ imprimer(pdf); }); ctaBody.appendChild(pdf);
  }
  lock.appendChild(cta); scr.appendChild(lock);
  var m0=mailLink(); if(m0){ var a0=el("div","rp-actions"); a0.appendChild(m0); scr.appendChild(a0); }
  box.appendChild(scr);

  // Rapport complet : uniquement dans le PDF
  if(unlocked){
    var full=el("div","rp-full");
    if(list.length){
      var ct=el("div","rp-counts");
      ["crit","high","med","low"].forEach(function(k){ if(!counts[k]) return; var c=el("div","rp-count sev-"+k); c.appendChild(el("strong",null,String(counts[k]))); c.appendChild(el("span",null,SEVTXT[k]+(!EN && counts[k]>1 && k!=="low" ? "s" : ""))); ct.appendChild(c); });
      full.appendChild(ct);
    }
    full.appendChild(el("h4","rp-h",L("Vos notes, thème par thème","Your scores, area by area")));
    var tl=el("div","rp-tiles");
    cats.forEach(function(c,i){ var s=scores[i], t=el("div","rp-tile is-"+tone(s)); t.appendChild(el("strong",null,String(s))); t.appendChild(el("span",null,c[1])); tl.appendChild(t); });
    full.appendChild(tl);
    if(list.length){
      full.appendChild(el("h4","rp-h pdf-brk",L("Ce qu'il faut corriger, dans l'ordre","What to fix, in order")));
      var ol=el("ol","rp-list"); list.forEach(function(r,i){ ol.appendChild(item(r,i,true)); }); full.appendChild(ol);
    }
    var ok=passes(f); if(ok.length){ full.appendChild(el("h4","rp-h",L("Ce qui fonctionne déjà","What already works"))); var ul2=el("ul","rp-ok"); ok.forEach(function(x){ ul2.appendChild(el("li",null,x)); }); full.appendChild(ul2); }
    var pages=[{url:f.url,status:f.http.status,title:f.page.title,h1:f.page.h1.length,words:f.page.words,noindex:f.page.noindex}].concat(f.crawl||[]);
    full.appendChild(el("h4","rp-h",L("Les pages visitées","Pages visited")));
    var tw=el("div","rp-tablew"), t=el("table","rp-table"), th=el("thead"), hr=el("tr");
    [L("Adresse","Address"),L("Réponse","Response"),L("Titre","Title"),L("Titre principal (H1)","Main heading (H1)"),L("Mots","Words"),L("Visible sur Google","Visible on Google")].forEach(function(x){ hr.appendChild(el("th",null,x)); });
    th.appendChild(hr); t.appendChild(th); var tbo=el("tbody");
    pages.forEach(function(c){ var r=el("tr"), okp=c.status>=200&&c.status<300;
      r.appendChild(el("td","rp-url",short(c.url)));
      r.appendChild(el("td",okp?"is-ok":"is-bad", !c.status ? L("aucune","none") : okp ? "OK" : c.status>=300&&c.status<400 ? L("redirigée","redirected") : L("erreur ","error ")+c.status));
      r.appendChild(el("td",null,c.title!=null?(c.title||L("(vide)","(empty)")).slice(0,60):"–"));
      r.appendChild(el("td",c.h1==null?null:c.h1===1?"is-ok":"is-bad",c.h1==null?"–":c.h1===0?L("absent","missing"):c.h1===1?L("oui","yes"):c.h1+L(" titres"," headings")));
      r.appendChild(el("td",null,c.words!=null?String(c.words):"–"));
      r.appendChild(el("td",c.title===undefined?null:c.noindex?"is-bad":"is-ok",c.title===undefined?"–":(c.noindex?L("non","no"):L("oui","yes"))));
      tbo.appendChild(r); });
    t.appendChild(tbo); tw.appendChild(t); full.appendChild(tw);
    var st=f.page.stack||{}, tech=[st.cms, st.gtm&&"Google Tag Manager", st.ga4&&"GA4", st.ads&&"Google Ads", st.meta&&"Meta Pixel", st.linkedin&&"LinkedIn Insight", st.matomo&&"Matomo", st.hotjar&&"Hotjar / Clarity", st.consent&&L("bannière de cookies","cookie banner")].filter(Boolean);
    if(tech.length) full.appendChild(el("p","rp-note",L("Outils repérés sur le site : ","Tools found on the site: ")+tech.join(", ")+"."));
    full.appendChild(el("p","rp-note",L("Analyse automatique de la page d'accueil et de "+(f.crawl||[]).length+" pages liées. La vitesse et les positions viennent de Google. Un audit complet ajoute la Search Console, toutes les pages du site et les liens externes.","Automated analysis of the homepage and "+(f.crawl||[]).length+" linked pages. Speed and rankings come from Google. A full audit adds Search Console, every page of the site and backlinks.")));
    box.appendChild(full);
  }

  push({event:"rapport_seo", domaine:f.host, score:global, points:list.length});
}

function gateBox(f, global, done){
  var g=el("div","rp-gate"); g.hidden=true;
  var MSG={format:L("Cette adresse e-mail n'est pas valide.","This email address is not valid."), domaine:L("Ce domaine ne reçoit pas d'e-mails, ou c'est une adresse jetable. Utilisez une adresse réelle.","This domain cannot receive email, or it is a disposable address. Please use a real address."), quota:L("Le service est saturé pour aujourd'hui. Réessayez demain ou écrivez-moi.","The service is busy today. Try again tomorrow or email me."), trop:L("Trop de tentatives. Patientez 15 minutes.","Too many attempts. Please wait 15 minutes."), expire:L("Ce code a expiré. Demandez-en un nouveau.","This code has expired. Request a new one."), code:L("Code incorrect.","Wrong code."), reseau:L("Le service ne répond pas. Réessayez dans un instant.","The service is not responding. Try again shortly.")};
  var mail="";
  function call(o){ return fetch(CODE_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(o)}).then(function(r){ return r.json(); }); }
  function step1(){
    g.innerHTML="";
    g.appendChild(el("p","rp-gate-s",L("Saisissez votre adresse e-mail : vous recevez un code à 6 chiffres pour débloquer le rapport.","Enter your email address: you will receive a 6-digit code to unlock the report.")));
    var fm=el("form","rp-gate-f"); var lb=el("label","sr",L("Adresse e-mail","Email address")); lb.htmlFor="rp-mail-in"; fm.appendChild(lb);
    var inp=el("input"); inp.id="rp-mail-in"; inp.type="email"; inp.required=true; inp.autocomplete="email"; inp.placeholder=L("vous@entreprise.fr","you@company.com"); inp.value=mail; fm.appendChild(inp);
    var b=el("button",null,L("Recevoir mon code","Send my code")); b.type="submit"; fm.appendChild(b);
    var er=el("p","rp-gate-e"); g.appendChild(fm); g.appendChild(er);
    fm.addEventListener("submit",function(ev){ ev.preventDefault(); mail=inp.value.trim(); if(!mail) return; b.disabled=true; b.textContent=L("Envoi…","Sending…"); er.textContent="";
      call({action:"send", email:mail, site:f.host, score:global, lang:EN?"en":"fr"}).then(function(j){ if(j.ok){ push({event:"rapport_code_envoye", domaine:f.host}); step2(); } else { er.textContent=MSG[j.error]||MSG.reseau; b.disabled=false; b.textContent=L("Recevoir mon code","Send my code"); } })
      .catch(function(){ er.textContent=MSG.reseau; b.disabled=false; b.textContent=L("Recevoir mon code","Send my code"); }); });
  }
  function step2(){
    g.innerHTML="";
    g.appendChild(el("p","rp-gate-t",L("Code envoyé à ","Code sent to ")+mail));
    g.appendChild(el("p","rp-gate-s",L("Pensez à regarder dans les indésirables si vous ne le voyez pas.","Check your spam folder if you cannot see it.")));
    var fm=el("form","rp-gate-f"); var lb=el("label","sr",L("Code à 6 chiffres","6-digit code")); lb.htmlFor="rp-code-in"; fm.appendChild(lb);
    var inp=el("input","rp-code-in"); inp.id="rp-code-in"; inp.inputMode="numeric"; inp.autocomplete="one-time-code"; inp.maxLength=6; inp.placeholder="123456"; fm.appendChild(inp);
    var b=el("button",null,L("Débloquer le rapport","Unlock the report")); b.type="submit"; fm.appendChild(b);
    var er=el("p","rp-gate-e"); g.appendChild(fm); g.appendChild(er);
    var back=el("button","rp-gate-back",L("Changer d'adresse ou renvoyer le code","Change address or resend the code")); back.type="button"; back.addEventListener("click",step1); g.appendChild(back);
    inp.focus();
    fm.addEventListener("submit",function(ev){ ev.preventDefault(); b.disabled=true; er.textContent="";
      call({action:"verify", email:mail, code:inp.value}).then(function(j){
        if(j.ok){ try{ sessionStorage.setItem("kn_rp_ok",f.host); }catch(x){} push({event:"rapport_code_valide", domaine:f.host}); step1(); done(); }
        else { er.textContent=(MSG[j.error]||MSG.reseau)+(j.reste!=null?L(" Essais restants : "," Attempts left: ")+j.reste+".":""); b.disabled=false; }
      }).catch(function(){ er.textContent=MSG.reseau; b.disabled=false; }); });
  }
  step1();
  return g;
}

function start(url){
  var grid=document.querySelector("#audit .audit-grid"); if(!grid) return;
  if(!state.box){ state.box=el("div","seo-report"); state.box.id="seo-report"; state.box.setAttribute("aria-live","polite"); var pn=document.getElementById("audit-panel"); if(pn && pn.parentNode===grid){ var rc=el("div","audit-right"); grid.insertBefore(rc,pn); rc.appendChild(pn); rc.appendChild(state.box); } else grid.parentNode.insertBefore(state.box, grid.nextSibling); }
  state.url=url; state.facts=null; state.psi=null; state.pos=null; state.err=null; render();
  var my=url;
  fetch(REPORT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url})})
    .then(function(r){ return r.json(); })
    .then(function(j){ if(state.url!==my) return; if(!j || j.error) state.err=(j&&j.detail)||L("site injoignable","site unreachable"); else state.facts=j; render(); if(state.facts && !document.querySelector("#audit-panel .audit-status")) compactPanel(); })
    .catch(function(){ if(state.url!==my) return; state.box.hidden=true; state.box.innerHTML=""; });
}

// Quand le rapport est prêt, le panneau de droite se réduit à une ligne : tout le reste est dans le rapport.
var pdfLib=null;
function chargerPdf(cb){
  if(window.html2pdf) return cb(true);
  if(pdfLib){ pdfLib.push(cb); return; }
  pdfLib=[cb]; var sc=document.createElement("script"); sc.src="/assets/vendor/html2pdf.bundle.min.js"; sc.async=true;
  sc.onload=function(){ var l=pdfLib; pdfLib=null; l.forEach(function(f){ f(true); }); };
  sc.onerror=function(){ var l=pdfLib; pdfLib=null; l.forEach(function(f){ f(false); }); };
  document.head.appendChild(sc);
}
function compactPanel(){
  var panel=document.getElementById("audit-panel"); if(!panel || !state.facts || !state.box) return;
  panel.hidden=true;
}
document.addEventListener("kn:audit-start",function(e){ var panel=document.getElementById("audit-panel"); if(panel){ panel.classList.remove("is-compact"); panel.hidden=false; } start(e.detail.url); });
document.addEventListener("kn:audit-psi",function(e){ state.psi=e.detail.data; if(state.facts){ render(); compactPanel(); } });
document.addEventListener("kn:audit-pos",function(e){ state.pos=e.detail.data; if(state.facts){ render(); compactPanel(); } });
window.KNSeoReport={rules:rules, passes:passes, _state:state, _render:render, _start:start, _setUrl:function(u){ REPORT_URL=u; }};
})();
