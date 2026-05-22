document.body.classList.add("js-ready");

const demoSection = document.getElementById("demo");
const fetchButtons = document.querySelectorAll(".js-fetch-trigger");
const responseCard = document.getElementById("responseCard");
const responseContent = document.getElementById("responseContent");
const responseMeta = document.getElementById("responseMeta");
const statusMessage = document.getElementById("statusMessage");
const revealItems = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let activeController = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] || character;
  });
}

function formatTimestamp(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function setButtonsDisabled(disabled) {
  fetchButtons.forEach((button) => {
    button.disabled = disabled;
    button.setAttribute("aria-busy", String(disabled));
  });
}

function renderLoading() {
  responseCard.dataset.state = "loading";
  responseMeta.textContent = "Loading";
  statusMessage.textContent = "Loading...";
  responseContent.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div>
        <p class="empty-title">Loading data</p>
      </div>
    </div>
  `;
}

function renderResult(post, requestTime) {
  responseCard.dataset.state = "success";
  responseMeta.textContent = `Loaded at ${formatTimestamp(requestTime)}`;
  statusMessage.textContent = `Loaded post ${post.id}.`;
  responseContent.innerHTML = `
    <article class="response-body">
      <h3 class="response-title">${escapeHtml(post.title)}</h3>
      <p class="response-copy">${escapeHtml(post.body)}</p>
      <ul class="response-tags">
        <li>Post ${post.id}</li>
        <li>User ${post.userId}</li>
        <li>JSONPlaceholder</li>
      </ul>
    </article>
  `;
}

function renderError(message) {
  responseCard.dataset.state = "error";
  responseMeta.textContent = "Error";
  statusMessage.textContent = "Request failed.";
  responseContent.innerHTML = `
    <div class="error-state">
      <div>
        <p class="error-title">Unable to load data</p>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

async function fetchDemoData({ scrollIntoView = false } = {}) {
  if (scrollIntoView) {
    demoSection.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;
  const postId = Math.floor(Math.random() * 100) + 1;

  setButtonsDisabled(true);
  renderLoading();

  try {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${postId}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const post = await response.json();

    if (controller !== activeController) {
      return;
    }

    renderResult(post, new Date());
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    renderError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading the API response."
    );
  } finally {
    if (controller === activeController) {
      activeController = null;
      setButtonsDisabled(false);
    }
  }
}

function setupRevealAnimations() {
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function bindEvents() {
  fetchButtons.forEach((button) => {
    const shouldScroll = button.closest(".hero") !== null;

    button.addEventListener("click", () => {
      fetchDemoData({ scrollIntoView: shouldScroll });
    });
  });
}

setupRevealAnimations();
bindEvents();
