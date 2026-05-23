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

  // Event delegation — works for both the static initial results
  // and any dynamically regenerated ones after a user search.
  const resultsList = document.querySelector(".old-web__results");
  if (resultsList) {
    resultsList.addEventListener("click", function (e) {
      const link = e.target.closest(".old-link");
      if (link) openSite(link.dataset.site, link);
    });
  }

  // -----------------------------------------------------------
  // Interactive search — no backend. Each of the 10 archetypal
  // "old web" failure modes gets a template that weaves the user's
  // query into a title / URL / snippet. Clicking still opens the
  // existing SITES modal (kind-keyed) so the diagnosis stays.
  //
  // To change result phrasing: edit RESULT_TEMPLATES below.
  // -----------------------------------------------------------
  const searchForm = document.querySelector(".old-web__search");
  const searchInput = searchForm ? searchForm.querySelector('input[type="search"]') : null;
  const searchMeta = document.querySelector(".old-web__meta");

  const SITE_KINDS = [
    "agency", "blog", "tool", "forum", "directory",
    "pdf", "shop", "news", "local", "ghost"
  ];

  function slug(s) {
    return (
      s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40) ||
      "query"
    );
  }
  function cap(s) {
    s = s.trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function low(s) {
    return s.toLowerCase().trim();
  }

  // Quote the query — handles any shape (question, phrase, gibberish)
  // by treating it as a verbatim search string rather than trying to
  // inject it as a noun phrase. Long queries get truncated.
  function quoted(q) {
    const trimmed = q.trim();
    if (trimmed.length > 60) return '"' + trimmed.slice(0, 57) + '..."';
    return '"' + trimmed + '"';
  }

  const RESULT_TEMPLATES = {
    agency: function (q) { return {
      title: "We rank brands for searches like " + quoted(q) + " | RankFastPro",
      url: "rankfastpro.example/queries/" + slug(q),
      snippet: "Need visibility for searches like " + quoted(q) + "? Free audit, proven packages, trust badges."
    }; },
    blog: function (q) { return {
      title: "What people really mean when they search " + quoted(q),
      url: "content-harbor.example/intent/" + slug(q),
      snippet: "Twelve interpretations, seven assumptions, zero verified answers. Updated for 2026."
    }; },
    tool: function (q) { return {
      title: "Why agents struggle with queries like " + quoted(q),
      url: "visibility-checker.example/diagnose/" + slug(q),
      snippet: "Run a free scan. We will show you why agents miss searches like this. Work email required."
    }; },
    forum: function (q) { return {
      title: "Anyone else searching " + quoted(q) + "?",
      url: "forum.example/thread/" + slug(q),
      snippet: "Started 3 days ago · 47 replies · Same · +1 · Bumping this · Any update?"
    }; },
    directory: function (q) { return {
      title: "Top 10 experts for queries like " + quoted(q),
      url: "top-vendors.example/queries/" + slug(q),
      snippet: "Ranked list of professionals who answer searches like this. Sponsored placements disclosed."
    }; },
    pdf: function (q) { return {
      title: "FAQ document on " + quoted(q) + " (PDF)",
      url: "assets.example/faq-" + slug(q) + "-v7-final.pdf",
      snippet: "38 pages. Last updated 2024. Email gate. No web version of this content exists."
    }; },
    shop: function (q) { return {
      title: "Schema templates for answering " + quoted(q),
      url: "schema-shop.example/answer/" + slug(q),
      snippet: "Pre-built JSON-LD markup for FAQ pages targeting queries like this. No coding required."
    }; },
    news: function (q) { return {
      title: "Search volume for " + quoted(q) + " spikes again — analysts react",
      url: "daily-index.example/trends/" + slug(q),
      snippet: "Industry analysts comment on renewed interest in this query. Breaking story · share now."
    }; },
    local: function (q) { return {
      title: "Locals discussing " + quoted(q),
      url: "local-pack.example/bg/" + slug(q),
      snippet: "Open now · 3 reviews · People nearby asking the same. Call · directions · share."
    }; },
    ghost: function (q) { return {
      title: "Cached result for " + quoted(q) + " — source not found",
      url: "cached.example/404/" + slug(q),
      snippet: "This page may no longer exist. No description, no canonical, no author trail."
    }; }
  };

  function renderResults(query) {
    if (!resultsList) return;
    const q = (query || "").trim() || "the web";
    resultsList.innerHTML = "";
    SITE_KINDS.forEach(function (kind) {
      const data = RESULT_TEMPLATES[kind](q);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "old-link";
      btn.dataset.site = kind;

      const tEl = document.createElement("span");
      tEl.className = "old-link__title";
      tEl.textContent = data.title;
      const uEl = document.createElement("span");
      uEl.className = "old-link__url";
      uEl.textContent = "https://" + data.url;
      const sEl = document.createElement("span");
      sEl.className = "old-link__snippet";
      sEl.textContent = data.snippet;

      btn.appendChild(tEl);
      btn.appendChild(uEl);
      btn.appendChild(sEl);
      li.appendChild(btn);
      resultsList.appendChild(li);
    });

    if (searchMeta) {
      const count = (Math.floor(Math.random() * 900000) + 100000).toLocaleString();
      const time = "0." + (Math.floor(Math.random() * 80) + 12);
      searchMeta.textContent = "About " + count + " results (" + time + " seconds)";
    }
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      renderResults(searchInput.value);
    });
  }

  modal.querySelectorAll("[data-close-fake-site]").forEach((control) => {
    control.addEventListener("click", closeSite);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-visible")) {
      closeSite();
    }
  });
})();
