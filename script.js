const SITE_CONFIG = Object.freeze({
  showReviews: false,
});

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const navLinks = [...document.querySelectorAll(".main-nav a")];
const tabs = [...document.querySelectorAll("[data-filter]")];
const menuCards = [...document.querySelectorAll("[data-category]")];
const promoModal = document.querySelector("[data-promo-modal]");
const promoOpen = document.querySelector("[data-promo-open]");
const promoCloseButtons = [...document.querySelectorAll("[data-promo-close]")];
const reviewsContainer = document.querySelector("[data-google-reviews]");
const googleRating = document.querySelector("[data-google-rating]");
const googleCount = document.querySelector("[data-google-count]");
const googleReviewsLink = document.querySelector(".reviews-link");
const reviewsSection = document.querySelector("[data-reviews-section]");
let lastFocusedElement = null;

if (reviewsSection) reviewsSection.hidden = !SITE_CONFIG.showReviews;

const createReviewCard = (review) => {
  const card = document.createElement("blockquote");
  const stars = document.createElement("div");
  const text = document.createElement("p");
  const meta = document.createElement("cite");
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));

  stars.className = "quote-rating";
  stars.setAttribute("aria-label", `${rating} out of 5 stars`);
  stars.textContent = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  text.textContent = `“${review.text || "Google rating"}”`;
  const dateLabel = review.updateTime
    ? new Intl.DateTimeFormat(document.documentElement.lang || "hu-HU", {
        year: "numeric",
        month: "long",
      }).format(new Date(review.updateTime))
    : review.dateLabel;
  meta.textContent = [review.author, dateLabel].filter(Boolean).join(" · ") || "Google review";

  card.append(stars, text, meta);
  return card;
};

const loadGoogleReviews = async () => {
  if (!reviewsContainer) return;

  try {
    const response = await fetch("/api/google-reviews", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Google reviews are temporarily unavailable");

    const data = await response.json();
    if (!Array.isArray(data.reviews) || data.reviews.length === 0) return;

    reviewsContainer.replaceChildren(...data.reviews.slice(0, 5).map(createReviewCard));
    if (googleRating && Number.isFinite(Number(data.averageRating))) {
      googleRating.textContent = Number(data.averageRating).toFixed(1);
    }
    if (googleCount && Number.isFinite(Number(data.totalReviewCount))) {
      googleCount.textContent = new Intl.NumberFormat("hu-HU").format(Number(data.totalReviewCount));
    }
    if (googleReviewsLink && data.googleReviewsUrl) googleReviewsLink.href = data.googleReviewsUrl;
  } catch (error) {
    console.info("Using saved Google review highlights.");
  }
};

if (SITE_CONFIG.showReviews) loadGoogleReviews();

const setPromoState = (isOpen) => {
  if (!promoModal) return;
  promoModal.classList.toggle("is-visible", isOpen);
  promoModal.setAttribute("aria-hidden", String(!isOpen));
  document.body.classList.toggle("has-modal", isOpen);

  if (isOpen) {
    lastFocusedElement = document.activeElement;
    window.setTimeout(() => promoModal.querySelector(".promo-modal__close")?.focus(), 80);
    sessionStorage.setItem("promoSeen", "true");
  } else if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
};

promoOpen?.addEventListener("click", () => setPromoState(true));
promoCloseButtons.forEach((button) => button.addEventListener("click", () => setPromoState(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && promoModal?.classList.contains("is-visible")) setPromoState(false);
});

if (promoModal && sessionStorage.getItem("promoSeen") !== "true") {
  window.setTimeout(() => setPromoState(true), 700);
}

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 20);
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter;

    tabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    menuCards.forEach((card) => {
      card.classList.toggle("is-hidden", card.dataset.category !== filter);
    });
  });
});

menuCards.forEach((card) => {
  card.classList.toggle("is-hidden", card.dataset.category !== "cocktails");
});

const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-42% 0px -48% 0px" }
);

sections.forEach((section) => observer.observe(section));
