/* Portfolio Kevin Nsamè : audit en direct, personnalisation par entreprise, compteurs */
(function(){
"use strict";

/* Clé API PageSpeed Insights (gratuite). Laisser vide fonctionne, mais le quota sans clé
   est partagé et parfois saturé. Créer la clé : console.cloud.google.com, API PageSpeed Insights. */
var PSI_KEY = "AIzaSyBbuUYGQvWH6eqwA4ANDVMrxtUG6LXl3XI";

var EN = (document.documentElement.lang || "fr").slice(0,2) === "en";
var T = EN ? {
  greet: "Prepared for",
  focus: "Most relevant for you",
  run: "Run audit", running: "Analysing…",
  steps: ["Loading the page on a simulated mobile phone…","Measuring load speed and Core Web Vitals…","Checking SEO, accessibility and best practices…","Ranking what to fix first…"],
  cats: {performance:"Performance", seo:"SEO", accessibility:"Accessibility", "best-practices":"Best practices"},
  field: "Real-user data (Chrome UX Report, 28 days)", lab: "Lab measurement (simulated mobile)",
  prio: "What I would fix first", gain: "Estimated saving:",
  none: "No major issue found. The site is in good shape.",
  cta: "Let's talk about it", mailSub: "Audit of ", mailBody: "Hello Kevin,%0D%0A%0D%0AI ran the audit of {d} on your portfolio.",
  bad: "Enter a valid address, for example example.com",
  err: "The analysis failed: ", quota: "The audit service is unavailable right now. Please try again later or email me.",
  sec: "s", noField: "Not enough Chrome traffic for real-user data, lab figures shown."
} : {
  greet: "Préparé pour",
  focus: "Le plus proche de votre besoin",
  run: "Lancer l'audit", running: "Analyse en cours…",
  steps: ["Chargement de la page sur un mobile simulé…","Mesure de la vitesse et des Core Web Vitals…","Vérification SEO, accessibilité et bonnes pratiques…","Classement des priorités…"],
  cats: {performance:"Performance", seo:"SEO", accessibility:"Accessibilité", "best-practices":"Bonnes pratiques"},
  field: "Données d'utilisateurs réels (Chrome UX Report, 28 jours)", lab: "Mesure en laboratoire (mobile simulé)",
  prio: "Ce que je corrigerais en premier", gain: "Gain estimé :",
  none: "Aucun problème majeur détecté. Le site est en bonne santé.",
  cta: "En parler ensemble", mailSub: "Audit de ", mailBody: "Bonjour Kevin,%0D%0A%0D%0AJ'ai lancé l'audit de {d} sur votre portfolio.",
  bad: "Saisissez une adresse valide, par exemple exemple.fr",
  err: "L'analyse a échoué : ", quota: "Le service d'audit est indisponible pour le moment. Réessayez plus tard ou écrivez-moi.",
  sec: " s", noField: "Pas assez de trafic Chrome pour des données réelles, mesures de laboratoire affichées."
};

function push(o){ try{ (window.dataLayer = window.dataLayer || []).push(o); }catch(e){} }
function el(tag, cls, txt){ var n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }

/* 1. Personnalisation : ?e=Entreprise&p=seo|sea|contenu */
(function(){
  var q = new URLSearchParams(location.search);
  var e = (q.get("e") || "").replace(/[<>"]/g,"").replace(/[-_+]/g," ").trim().slice(0,40);
  var p = (q.get("p") || "").toLowerCase();
  try{
    if(e){ sessionStorage.setItem("kn_e", e); if(p) sessionStorage.setItem("kn_p", p); }
    else { e = sessionStorage.getItem("kn_e") || ""; p = p || sessionStorage.getItem("kn_p") || ""; }
  }catch(x){}
  if(!e) return;
  var hero = document.querySelector("header.hero");
  if(hero){
    var g = el("div","greet on"); g.appendChild(el("span","dot"));
    var t = el("span"); t.appendChild(document.createTextNode(T.greet+" ")); t.appendChild(el("strong",null,e));
    g.appendChild(t);
    hero.insertBefore(g, hero.querySelector(".eyebrow"));
  }
  if(p){
    var map = {seo:/seo-amada/, sea:/(sea|google-ads)-castles/, ads:/(sea|google-ads)-castles/, contenu:/videos\//, content:/videos\//};
    var re = map[p], grid = document.querySelector(".projects-grid");
    if(re && grid){
      var card = [].slice.call(grid.querySelectorAll(".project-card")).filter(function(c){
        var a=c.querySelector(".project-link"); return a && re.test(a.getAttribute("href"));
      })[0];
      if(card){
        card.classList.add("focus");
        var body = card.querySelector(".project-body");
        body.insertBefore(el("div","focus-tag",T.focus), body.firstChild);
        grid.insertBefore(card, grid.firstChild);
      }
    }
  }
  push({event:"candidature_view", entreprise:e, focus:p||"aucun"});
})();

/* 2. Compteurs animés sur les chiffres clés */
(function(){
  var nums = document.querySelectorAll(".fact .num");
  if(!nums.length || !("IntersectionObserver" in window)) return;
  if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return; io.unobserve(en.target);
      var n=en.target, txt=n.textContent, m=txt.match(/^(\D*)(\d+)(.*)$/);
      if(!m) return;
      var end=+m[2], t0=null;
      function f(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/1100); k=1-Math.pow(1-k,3);
        n.textContent=m[1]+Math.round(end*k)+m[3]; if(k<1) requestAnimationFrame(f); else n.textContent=txt; }
      requestAnimationFrame(f);
    });
  },{threshold:0.6});
  nums.forEach(function(n){ io.observe(n); });
})();

/* 3. Audit SEO en direct via l'API PageSpeed Insights */
(function(){
  var form = document.getElementById("audit-form");
  if(!form) return;
  var input = form.querySelector("input"), btn = form.querySelector("button");
  var panel = document.getElementById("audit-panel");
  var self = document.getElementById("audit-self");
  var busy = false;

  function norm(v){
    v=(v||"").trim(); if(!v) return null;
    if(!/^https?:\/\//i.test(v)) v="https://"+v;
    try{ var u=new URL(v); if(!/\./.test(u.hostname)) return null; return u.href; }catch(e){ return null; }
  }
  function cls(s){ return s>=90?"good":(s>=50?"mid":"bad"); }
  function ring(score,label){
    var d=el("div","score"), r=30, c=2*Math.PI*r, ns="http://www.w3.org/2000/svg";
    var svg=document.createElementNS(ns,"svg"); svg.setAttribute("viewBox","0 0 76 76"); svg.setAttribute("aria-hidden","true");
    function circ(k){ var x=document.createElementNS(ns,"circle"); x.setAttribute("cx","38"); x.setAttribute("cy","38"); x.setAttribute("r",r);
      x.setAttribute("fill","none"); x.setAttribute("stroke-width","6"); x.setAttribute("class",k); return x; }
    svg.appendChild(circ("ring-bg"));
    var fg=circ("g-"+cls(score)); fg.setAttribute("stroke-linecap","round"); fg.setAttribute("transform","rotate(-90 38 38)");
    fg.setAttribute("stroke-dasharray",c); fg.setAttribute("stroke-dashoffset",c); fg.style.transition="stroke-dashoffset 1s ease-out";
    svg.appendChild(fg);
    var tx=document.createElementNS(ns,"text"); tx.setAttribute("x","38"); tx.setAttribute("y","45"); tx.setAttribute("text-anchor","middle");
    tx.setAttribute("class","val"); tx.textContent=score; svg.appendChild(tx);
    d.appendChild(svg); d.appendChild(el("div","lbl",label));
    d.setAttribute("aria-label",label+" : "+score+"/100");
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ fg.setAttribute("stroke-dashoffset", c*(1-score/100)); }); });
    return d;
  }
  function fmtMs(ms){ return ms>=1000 ? (ms/1000).toFixed(1).replace(".", EN?".":",")+T.sec : Math.round(ms)+" ms"; }
  function vital(k,v,rating){ var d=el("div","vital"); d.appendChild(el("div","k",k)); d.appendChild(el("div","v t-"+rating,v)); return d; }

  function render(data, url){
    var lr=data.lighthouseResult, cats=lr.categories, au=lr.audits;
    panel.innerHTML="";
    panel.appendChild(el("div","audit-site",lr.finalDisplayedUrl||lr.finalUrl||url));
    var sc=el("div","scores");
    ["performance","seo","accessibility","best-practices"].forEach(function(k){
      if(cats[k]) sc.appendChild(ring(Math.round(cats[k].score*100), T.cats[k]));
    });
    panel.appendChild(sc);

    var le=data.loadingExperience, m=le&&le.metrics, vit=el("div","vitals"), note;
    var rate={FAST:"good",AVERAGE:"mid",SLOW:"bad"};
    if(m && m.LARGEST_CONTENTFUL_PAINT_MS){
      note=T.field;
      vit.appendChild(vital("LCP", fmtMs(m.LARGEST_CONTENTFUL_PAINT_MS.percentile), rate[m.LARGEST_CONTENTFUL_PAINT_MS.category]||"mid"));
      if(m.INTERACTION_TO_NEXT_PAINT) vit.appendChild(vital("INP", fmtMs(m.INTERACTION_TO_NEXT_PAINT.percentile), rate[m.INTERACTION_TO_NEXT_PAINT.category]||"mid"));
      if(m.CUMULATIVE_LAYOUT_SHIFT_SCORE) vit.appendChild(vital("CLS", (m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile/100).toFixed(2), rate[m.CUMULATIVE_LAYOUT_SHIFT_SCORE.category]||"mid"));
    } else {
      note=T.noField;
      function lab(id,k){ var a=au[id]; if(a) vit.appendChild(vital(k, a.displayValue||"–", cls(Math.round((a.score||0)*100)))); }
      lab("largest-contentful-paint","LCP"); lab("total-blocking-time","TBT"); lab("cumulative-layout-shift","CLS");
    }
    panel.appendChild(vit);
    var n=el("p","small",note); n.style.margin="-12px 0 22px"; panel.appendChild(n);

    /* Priorités : gains de vitesse les plus forts, puis échecs SEO */
    var list=[];
    Object.keys(au).forEach(function(id){
      var a=au[id], det=a.details||{};
      if(det.type==="opportunity" && a.score!==null && a.score<0.9 && det.overallSavingsMs>=150)
        list.push({t:a.title, s:det.overallSavingsMs, kind:"perf"});
    });
    list.sort(function(a,b){ return b.s-a.s; });
    var seo=[];
    (cats.seo&&cats.seo.auditRefs||[]).forEach(function(r){ var a=au[r.id]; if(r.weight>0 && a && a.score===0) seo.push({t:a.title, kind:"seo"}); });
    var a11y=[];
    (cats.accessibility&&cats.accessibility.auditRefs||[]).forEach(function(r){ var a=au[r.id]; if(r.weight>=7 && a && a.score===0) a11y.push({t:a.title, kind:"a11y"}); });
    var top=list.slice(0,2).concat(seo.slice(0,2)).concat(a11y.slice(0,1)).concat(list.slice(2)).slice(0,3);

    panel.appendChild(el("h3",null,T.prio));
    if(top.length){
      var ol=el("ol","prio");
      top.forEach(function(x){ var li=el("li",null,x.t.replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")); if(x.s) li.appendChild(el("span",null,T.gain+" "+fmtMs(x.s))); ol.appendChild(li); });
      panel.appendChild(ol);
    } else panel.appendChild(el("p","audit-empty",T.none));

    var host=""; try{ host=new URL(url).hostname; }catch(e){}
    if(host!=="kevinnsame.github.io"){
      var a=el("a","audit-cta",T.cta);
      a.href="mailto:kevinsame99@gmail.com?subject="+encodeURIComponent(T.mailSub+host)+"&body="+T.mailBody.replace("{d}",encodeURIComponent(host));
      a.addEventListener("click",function(){ push({event:"audit_contact", domaine:host}); });
      panel.appendChild(a);
    }
    push({event:"audit_termine", domaine:host, score_perf:Math.round((cats.performance||{score:0}).score*100), score_seo:Math.round((cats.seo||{score:0}).score*100)});
  }

  function run(url){
    if(busy) return; busy=true; btn.disabled=true; btn.textContent=T.running;
    panel.innerHTML="";
    var st=el("div","audit-status"), msg=el("div",null,T.steps[0]), bar=el("div","bar");
    bar.appendChild(el("span")); st.appendChild(msg); st.appendChild(bar); panel.appendChild(st);
    try{ panel.scrollIntoView({block:"nearest", behavior:"smooth"}); }catch(x){}
    var i=0, iv=setInterval(function(){ i=Math.min(i+1,T.steps.length-1); msg.textContent=T.steps[i]; },7000);
    var host=""; try{ host=new URL(url).hostname; }catch(e){}
    push({event:"audit_lance", domaine:host});
    var api="https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&locale="+(EN?"en":"fr")+
      "&category=performance&category=seo&category=accessibility&category=best-practices&url="+encodeURIComponent(url)+
      (PSI_KEY?"&key="+PSI_KEY:"");
    fetch(api).then(function(r){ return r.json().then(function(j){ return {ok:r.ok, status:r.status, j:j}; }); })
    .then(function(res){
      clearInterval(iv);
      if(!res.ok || !res.j.lighthouseResult){
        var m=(res.j.error&&res.j.error.message)||("HTTP "+res.status);
        throw new Error(res.status===429||/quota/i.test(m) ? T.quota : m);
      }
      render(res.j, url);
    })
    .catch(function(e){
      clearInterval(iv); panel.innerHTML="";
      var msgTxt = e.message===T.quota ? T.quota : T.err+e.message;
      panel.appendChild(el("p","audit-err",msgTxt));
    })
    .then(function(){ busy=false; btn.disabled=false; btn.textContent=T.run; });
  }

  form.addEventListener("submit",function(ev){
    ev.preventDefault();
    var u=norm(input.value);
    if(!u){ panel.innerHTML=""; panel.appendChild(el("p","audit-err",T.bad)); input.focus(); return; }
    run(u);
  });
  if(self) self.addEventListener("click",function(){ input.value="kevinnsame.github.io"; run("https://kevinnsame.github.io/"+(EN?"en/":"")); });
})();
})();
