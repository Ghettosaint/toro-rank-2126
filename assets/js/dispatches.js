(function () {
  const details = [
    {
      outcome: "Index memory rebuilt without asking the humans to remember every old URL.",
      steps: ["Canonical signals fused", "Log noise quarantined", "Agent-readable schema restored"],
      score: "RECOVERY :: 94%",
    },
    {
      outcome: "One entity, four locales, zero semantic drift. The same brand survives translation.",
      steps: ["Locale graph aligned", "Schema vocabulary normalized", "Cross-market identity pinned"],
      score: "CONSISTENCY :: 91%",
    },
    {
      outcome: "The site stopped being a brochure and became a queryable surface.",
      steps: ["Audit tools exposed", "Diagnostics returned as structured output", "Crawler assumptions removed"],
      score: "MACHINE ACCESS :: 98%",
    },
    {
      outcome: "A migration with the boring result everyone secretly wants: nothing caught fire.",
      steps: ["Redirect graph mapped", "Internal equity preserved", "Entity trail carried forward"],
      score: "DECAY :: SUPPRESSED",
    },
    {
      outcome: "Crawler attention was leaking into fake corridors. The corridors were sealed.",
      steps: ["Facet traps identified", "Parameter rules rewritten", "Canonical paths prioritized"],
      score: "WASTE :: -73%",
    },
    {
      outcome: "The page became fast enough for impatient humans and even more impatient agents.",
      steps: ["Critical path trimmed", "Render blocks removed", "Interaction budget stabilized"],
      score: "LCP :: 1.6S",
    },
    {
      outcome: "The brand gained a durable identity layer instead of hoping the model guessed correctly.",
      steps: ["sameAs anchors expanded", "Author trail clarified", "Knowledge graph ambiguity reduced"],
      score: "CONFUSION :: LOW",
    },
    {
      outcome: "Content stopped fighting itself. The cluster became the thing agents could recommend.",
      steps: ["Topic graph rebuilt", "Internal links reweighted", "Semantic overlap resolved"],
      score: "CLUSTER SIGNAL :: STRONG",
    },
  ];

  const rainChars = "アイウエオカキクケコサシスセソ0123456789{}<>/\\";
  let modal;
  let modalCanvas;
  let modalCtx;
  let modalRaf = null;
  let drops = [];

  function makeModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "dispatch-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="dispatch-modal__backdrop" data-dispatch-close></div>',
      '<section class="dispatch-modal__panel" role="dialog" aria-modal="true" aria-labelledby="dispatch-modal-title">',
      '<canvas class="dispatch-modal__rain" aria-hidden="true"></canvas>',
      '<button class="dispatch-modal__close" type="button" data-dispatch-close aria-label="Close dossier">x</button>',
      '<p class="dispatch-modal__eyebrow" data-dispatch-id></p>',
      '<h2 id="dispatch-modal-title" data-dispatch-title></h2>',
      '<p class="dispatch-modal__outcome" data-dispatch-outcome></p>',
      '<ul class="dispatch-modal__steps" data-dispatch-steps></ul>',
      '<code class="dispatch-modal__score" data-dispatch-score></code>',
      '</section>',
    ].join("");
    document.body.appendChild(modal);
    modalCanvas = modal.querySelector(".dispatch-modal__rain");
    modalCtx = modalCanvas.getContext("2d");
    modal.addEventListener("click", function (event) {
      if (event.target.closest("[data-dispatch-close]")) closeModal();
    });
    return modal;
  }

  function sizeRain() {
    if (!modalCanvas) return;
    const panel = modal.querySelector(".dispatch-modal__panel");
    const rect = panel.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    modalCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    modalCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    modalCanvas.style.width = rect.width + "px";
    modalCanvas.style.height = rect.height + "px";
    modalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(rect.width / 15);
    drops = Array.from({ length: cols }, () => Math.random() * -30);
    modalCtx.font = '15px "JetBrains Mono", Consolas, monospace';
  }

  function rainFrame() {
    if (!modal || !modal.classList.contains("is-open")) return;
    const width = modalCanvas.clientWidth;
    const height = modalCanvas.clientHeight;
    modalCtx.fillStyle = "rgba(1, 12, 5, 0.11)";
    modalCtx.fillRect(0, 0, width, height);
    drops.forEach(function (drop, i) {
      const x = i * 15;
      const y = drop * 15;
      modalCtx.fillStyle = i % 7 === 0 ? "#e8ffe8" : "#00ff66";
      modalCtx.fillText(rainChars[Math.floor(Math.random() * rainChars.length)], x, y);
      if (y > height && Math.random() > 0.965) drops[i] = 0;
      drops[i]++;
    });
    modalRaf = requestAnimationFrame(rainFrame);
  }

  function startModalRain() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sizeRain();
    modalCtx.clearRect(0, 0, modalCanvas.clientWidth, modalCanvas.clientHeight);
    modalRaf = requestAnimationFrame(rainFrame);
  }

  function stopModalRain() {
    if (modalRaf !== null) cancelAnimationFrame(modalRaf);
    modalRaf = null;
  }

  function openModal(card, index) {
    const data = details[index] || details[0];
    const root = makeModal();
    root.querySelector("[data-dispatch-id]").textContent =
      card.querySelector(".dispatch__id")?.textContent || "DSP :: sealed";
    root.querySelector("[data-dispatch-title]").textContent =
      card.querySelector(".dispatch__title")?.textContent || "Classified dispatch";
    root.querySelector("[data-dispatch-outcome]").textContent = data.outcome;
    root.querySelector("[data-dispatch-score]").textContent = data.score;
    root.querySelector("[data-dispatch-steps]").innerHTML = data.steps
      .map((step) => "<li>" + step + "</li>")
      .join("");
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("dispatch-modal-open");
    startModalRain();
    root.querySelector(".dispatch-modal__close").focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("dispatch-modal-open");
    stopModalRain();
  }

  function upgradeCard(card, index) {
    if (card.dataset.dispatchReady === "true") return;
    card.dataset.dispatchReady = "true";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Open dispatch dossier");

    const original = Array.from(card.childNodes);
    const inner = document.createElement("div");
    inner.className = "dispatch__inner";
    const front = document.createElement("div");
    front.className = "dispatch__face dispatch__face--front";
    const back = document.createElement("div");
    back.className = "dispatch__face dispatch__face--back";
    original.forEach((node) => front.appendChild(node));
    const data = details[index] || details[0];
    back.innerHTML = [
      '<span class="dispatch__back-label">AGENT READOUT</span>',
      "<p>" + data.outcome + "</p>",
      '<code class="dispatch__back-score">' + data.score + "</code>",
      '<span class="dispatch__open">Open dossier</span>',
    ].join("");
    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => openModal(card, index));
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal(card, index);
      }
    });
  }

  function init() {
    document.querySelectorAll(".dispatch").forEach(upgradeCard);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    window.addEventListener("resize", function () {
      if (modal && modal.classList.contains("is-open")) sizeRain();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
