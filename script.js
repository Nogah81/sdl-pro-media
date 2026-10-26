// SDL Pro Media – Public site scripts

document.addEventListener("DOMContentLoaded", () => {
  // Track page view
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: "home" }),
  }).catch(() => {});

  // Header scroll
  const header = document.getElementById("header");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  // Load portfolio from server
  loadPortfolio();

  // Contact form → save registration immediately
  const contactForm = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formNote.textContent = "Sending…";
    formNote.style.color = "";

    const data = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      service: document.getElementById("service").value,
      message: document.getElementById("message").value.trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        formNote.textContent = result.error || "Something went wrong";
        formNote.style.color = "#e74c3c";
        return;
      }
      formNote.textContent = result.message || "Thank you! We'll be in touch soon.";
      formNote.style.color = "#c9a87c";
      contactForm.reset();
      setTimeout(() => (formNote.textContent = ""), 6000);
    } catch (err) {
      formNote.textContent = "Could not send. Please try again or email us directly.";
      formNote.style.color = "#e74c3c";
    }
  });

  // Active nav on scroll
  const sections = document.querySelectorAll("section[id]");
  const navAnchors = document.querySelectorAll(".nav-links a");

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY + 100;
      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute("id");
        if (scrollY >= top && scrollY < top + height) {
          navAnchors.forEach((a) => {
            a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
          });
        }
      });
    },
    { passive: true }
  );
});

async function loadPortfolio() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  try {
    const res = await fetch("/api/media");
    const data = await res.json();

    if (!data.media || data.media.length === 0) {
      gallery.innerHTML = `
        <div class="gallery-empty">
          <p>Portfolio coming soon. Check back shortly.</p>
        </div>`;
      return;
    }

    gallery.innerHTML = data.media
      .map((item) => {
        const mediaTag =
          item.type === "video"
            ? `<video src="${item.url}" muted loop playsinline preload="metadata"></video>`
            : `<img src="${item.url}" alt="${escapeHtml(item.title)}" loading="lazy" />`;

        return `
          <div class="gallery-item" data-category="${item.category}" data-id="${item.id}" data-type="${item.type}" data-url="${item.url}">
            ${mediaTag}
            <div class="gallery-overlay">
              <span>${capitalize(item.category)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <small class="view-count">${item.views} views</small>
            </div>
          </div>`;
      })
      .join("");

    setupFilters();
    setupLightbox();
  } catch (err) {
    gallery.innerHTML = `
      <div class="gallery-empty">
        <p>Unable to load portfolio. Make sure the server is running.</p>
      </div>`;
  }
}

function setupFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const items = document.querySelectorAll(".gallery-item");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;

      items.forEach((item) => {
        if (filter === "all" || item.dataset.category === filter) {
          item.classList.remove("hide");
        } else {
          item.classList.add("hide");
        }
      });
    });
  });
}

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxContent = document.getElementById("lightboxContent");
  const lightboxClose = document.getElementById("lightboxClose");
  const items = document.querySelectorAll(".gallery-item");

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.dataset.id;
      const type = item.dataset.type;
      const url = item.dataset.url;

      fetch(`/api/media/${id}/view`, { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          const countEl = item.querySelector(".view-count");
          if (countEl && data.views != null) {
            countEl.textContent = `${data.views} views`;
          }
        })
        .catch(() => {});

      if (type === "video") {
        lightboxContent.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`;
      } else {
        lightboxContent.innerHTML = `<img src="${url}" alt="" />`;
      }

      lightbox.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  });

  const close = () => {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
    const vid = lightboxContent.querySelector("video");
    if (vid) vid.pause();
    lightboxContent.innerHTML = "";
  };

  lightboxClose.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) close();
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
