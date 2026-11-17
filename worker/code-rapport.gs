// Apps Script : code de vérification par e-mail avant le téléchargement du rapport SEO.
// Déployé en application web (exécuter en tant que : moi, accès : tout le monde).
var TTL = 900;            // code valable 15 minutes
var MAX_SEND = 3;         // envois max par adresse et par quart d'heure
var MAX_TRY = 5;          // essais max par code
var JETABLES = ["yopmail.com","yopmail.fr","mailinator.com","guerrillamail.com","10minutemail.com","temp-mail.org","tempmail.com","trashmail.com","getnada.com","sharklasers.com","dispostable.com","maildrop.cc","fakeinbox.com","throwawaymail.com","mohmal.com","emailondeck.com","mintemail.com","spambox.us","jetable.org","mail-temporaire.fr"];

function doPost(e) {
  var d = {};
  try { d = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) {}
  var out;
  try {
    if (d.action === "send") out = envoyer(d);
    else if (d.action === "verify") out = verifier(d);
    else out = { ok: false, error: "action" };
  } catch (x) { out = { ok: false, error: "interne" }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function norm(m) { return String(m || "").trim().toLowerCase().slice(0, 120); }

function domaineValide(dom) {
  if (JETABLES.indexOf(dom) > -1) return false;
  try {
    var r = UrlFetchApp.fetch("https://dns.google/resolve?type=MX&name=" + encodeURIComponent(dom), { muteHttpExceptions: true });
    var j = JSON.parse(r.getContentText());
    return !!(j.Answer && j.Answer.length);
  } catch (x) { return true; }
}

function envoyer(d) {
  var mail = norm(d.email);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(mail)) return { ok: false, error: "format" };
  var dom = mail.split("@")[1];
  if (!domaineValide(dom)) return { ok: false, error: "domaine" };
  if (MailApp.getRemainingDailyQuota() < 3) return { ok: false, error: "quota" };
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get("n:" + mail) || 0);
  if (n >= MAX_SEND) return { ok: false, error: "trop" };
  cache.put("n:" + mail, String(n + 1), TTL);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put("c:" + mail, JSON.stringify({ code: code, essais: 0, site: String(d.site || "").slice(0, 100), score: d.score }), TTL);
  var en = d.lang === "en";
  MailApp.sendEmail({
    to: mail,
    name: "Kevin Nsamè",
    subject: en ? "Your SEO report code: " + code : "Votre code pour le rapport SEO : " + code,
    htmlBody: (en
      ? "<p>Hello,</p><p>Here is your code to download the SEO report" + (d.site ? " for <b>" + d.site + "</b>" : "") + ":</p>"
      : "<p>Bonjour,</p><p>Voici votre code pour télécharger le rapport SEO" + (d.site ? " de <b>" + d.site + "</b>" : "") + " :</p>")
      + "<p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">" + code + "</p>"
      + (en ? "<p>It is valid for 15 minutes.</p><p>Kevin Nsamè</p>" : "<p>Il est valable 15 minutes.</p><p>Kevin Nsamè</p>")
  });
  return { ok: true };
}

function verifier(d) {
  var mail = norm(d.email);
  var cache = CacheService.getScriptCache();
  var raw = cache.get("c:" + mail);
  if (!raw) return { ok: false, error: "expire" };
  var o = JSON.parse(raw);
  if (o.essais >= MAX_TRY) { cache.remove("c:" + mail); return { ok: false, error: "trop" }; }
  if (String(d.code || "").replace(/\D/g, "") !== o.code) {
    o.essais++; cache.put("c:" + mail, JSON.stringify(o), TTL);
    return { ok: false, error: "code", reste: MAX_TRY - o.essais };
  }
  cache.remove("c:" + mail);
  var moi = Session.getEffectiveUser().getEmail();
  if (moi) MailApp.sendEmail({
    to: moi,
    subject: "Rapport SEO téléchargé : " + (o.site || "site inconnu"),
    htmlBody: "<p>Adresse vérifiée : <b>" + mail + "</b></p><p>Site audité : " + (o.site || "-") + "<br>Note : " + (o.score != null ? o.score + "/100" : "-") + "</p>"
  });
  return { ok: true };
}
