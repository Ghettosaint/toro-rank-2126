/*
 * TORO RANK 2126 — /crawl
 *
 * A simulated old-web search surface. Ten blue links open fake
 * websites in a modal, each exposing a different kind of machine
 * unreadability from the pre-agent web.
 */

(function () {
  const modal = document.getElementById("fakeSite");
  if (!modal) return;

  const title = document.getElementById("fakeSiteTitle");
  const url = document.getElementById("fakeSiteUrl");
  const tag = document.getElementById("fakeSiteTag");
  const body = document.getElementById("fakeSiteBody");
  const noise = document.getElementById("fakeSiteNoise");
  let lastFocused = null;

  const SITES = {
    agency: {
      url: "rankfastpro.example/ai-seo-services",
      tag: "SPONSORED SURFACE",
      title: "RankFastPro promises visibility in 14 days.",
      body: "The page says everything a human buyer expects: packages, badges, testimonials, and a free audit. The entity behind it is vague. The agent sees a sales page with no durable proof.",
      noise: ["FREE AUDIT", "LIMITED SLOTS", "TRUSTED BY 500+ BRANDS"],
    },
    blog: {
      url: "content-harbor.example/blog/agentic-seo-guide",
      tag: "CONTENT FOG",
      title: "A complete guide that completes nothing.",
      body: "Twelve headings, seven definitions, zero original signal. It can be summarized, but not trusted. The page is readable; the source is not.",
      noise: ["UPDATED FOR 2026", "WHAT IS AI SEO?", "CONCLUSION"],
    },
    tool: {
      url: "visibility-checker.example",
      tag: "LEAD CAPTURE",
      title: "The scanner wants your email before it scans.",
      body: "The interface imitates diagnostics, but the result is a funnel. Agents cannot call it, verify it, or reuse its output.",
      noise: ["ENTER WORK EMAIL", "SCORE LOCKED", "BOOK DEMO"],
    },
    forum: {
      url: "forum.example/thread/traffic-disappeared",
      tag: "HUMAN DISTRESS",
      title: "A thread full of symptoms, no model of the problem.",
      body: "People describe collapse in fragments. The page has real pain, but no structured cause, no timeline, no canonical answer.",
      noise: ["SAME HERE", "+1", "ANY UPDATE?"],
    },
    directory: {
      url: "top-vendors.example/ai-seo",
      tag: "RANKED LIST",
      title: "A leaderboard where position means payment.",
      body: "The old web loved lists. Agents learned to ask what the list optimizes for. This one optimizes for placement.",
      noise: ["FEATURED", "VERIFIED", "TOP PICK"],
    },
    pdf: {
      url: "assets.example/checklist-v7-final.pdf",
      tag: "DOCUMENT ISLAND",
      title: "A checklist sealed away from the living site.",
      body: "Useful information, trapped in a download. No endpoint, no updates, no relationship to the rest of the entity graph.",
      noise: ["FINAL_FINAL.pdf", "PAGE 38", "DOWNLOAD"],
    },
    shop: {
      url: "schema-shop.example/templates",
      tag: "MARKUP THEATER",
      title: "Templates pretending to be understanding.",
      body: "Schema can describe a thing. It cannot make a false thing true. The agent reads the markup, then asks for evidence.",
      noise: ["COPY JSON-LD", "NO CODE", "INSTANT"],
    },
    news: {
      url: "daily-index.example/search-is-dead-again",
      tag: "PANIC CYCLE",
      title: "Search dies every quarter and still invoices monthly.",
      body: "The article is loud enough for humans and thin enough for machines. It reports the shift without becoming useful inside it.",
      noise: ["BREAKING", "EXPERTS SAY", "SHARE"],
    },
    local: {
      url: "local-pack.example/bg/technical-seo",
      tag: "LOCAL PACK ECHO",
      title: "A map result with no map to meaning.",
      body: "Address, hours, stars, phone. Good for a human trying to call. Weak for an agent trying to understand capability.",
      noise: ["OPEN NOW", "3 REVIEWS", "CALL"],
    },
    ghost: {
      url: "cached.example/404/entity-not-found",
      tag: "ENTITY MISSING",
      title: "Untitled is not a strategy.",
      body: "No owner, no author, no canonical trail. The old crawler could index it. The agent refuses to believe it.",
      noise: ["404", "NO TITLE", "CACHE ONLY"],
    },
  };

  function openSite(key, trigger) {
    const site = SITES[key];
    if (!site) return;
    lastFocused = trigger;
    url.textContent = site.url;
    tag.textContent = site.tag;
    title.textContent = site.title;
    body.textContent = site.body;
    noise.innerHTML = "";
    site.noise.forEach((item) => {
      const span = document.createElement("span");
      span.textContent = item;
      noise.appendChild(span);
    });
    modal.hidden = false;
    modal.classList.add("is-visible");
    modal.querySelector(".fake-site__close")?.focus();
  }

  function closeSite() {
    modal.classList.remove("is-visible");
    window.setTimeout(() => {
      modal.hidden = true;
      lastFocused?.focus();
    }, 180);
  }

  document.querySelectorAll(".old-link").forEach((link) => {
    link.addEventListener("click", () => openSite(link.dataset.site, link));
  });

  modal.querySelectorAll("[data-close-fake-site]").forEach((control) => {
    control.addEventListener("click", closeSite);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-visible")) {
      closeSite();
    }
  });
})();
