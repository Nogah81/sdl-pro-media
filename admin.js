const API = "";
let token = localStorage.getItem("sdl_admin_token") || "";

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": token,
  };
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadStats();
  loadMedia();
  loadSubmissions();
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboard.classList.add("hidden");
  token = "";
  localStorage.removeItem("sdl_admin_token");
}

// Check existing token
if (token) {
  fetch(`${API}/api/admin/stats`, { headers: headers() })
    .then((r) => {
      if (r.ok) showDashboard();
      else showLogin();
    })
    .catch(() => showLogin());
}

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || "Login failed";
      return;
    }
    token = data.token;
    localStorage.setItem("sdl_admin_token", token);
    showDashboard();
  } catch (err) {
    loginError.textContent = "Cannot reach server. Is it running?";
  }
});

document.getElementById("logoutBtn").addEventListener("click", showLogin);

// Tabs
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");

    if (btn.dataset.tab === "overview") loadStats();
    if (btn.dataset.tab === "media") loadMedia();
    if (btn.dataset.tab === "submissions") loadSubmissions();
  });
});

// Stats
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/admin/stats`, { headers: headers() });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById("statPageViews").textContent = data.totalPageViews;
    document.getElementById("statMediaViews").textContent = data.totalMediaViews;
    document.getElementById("statMediaCount").textContent = data.totalMedia;
    document.getElementById("statSubmissions").textContent = data.totalSubmissions;
    const smsEl = document.getElementById("statEmail");
    if (smsEl) smsEl.textContent = data.emailConfigured ? "ON" : "OFF";
    const note = document.getElementById("emailNote");
    if (note) {
      note.textContent = data.emailConfigured
        ? "Email alerts go to " + (data.ownerEmail || "")
        : "Email is off – set OWNER_EMAIL and SMTP settings (see README).";
    }

    const topList = document.getElementById("topMediaList");
    if (data.topMedia.length === 0) {
      topList.innerHTML = '<p class="empty">No media yet</p>';
    } else {
      topList.innerHTML = data.topMedia
        .map(
          (m) =>
            `<div class="list-item"><span>${escapeHtml(m.title)} <small>(${m.category})</small></span><span class="views">${m.views} views</span></div>`
        )
        .join("");
    }

    const recentList = document.getElementById("recentViewsList");
    if (data.recentViews.length === 0) {
      recentList.innerHTML = '<p class="empty">No views yet</p>';
    } else {
      recentList.innerHTML = data.recentViews
        .map(
          (v) =>
            `<div class="list-item"><span>${escapeHtml(v.page)}</span><span class="date">${formatDate(v.viewed_at)}</span></div>`
        )
        .join("");
    }
  } catch (e) {
    console.error(e);
  }
}

// Media library
async function loadMedia() {
  try {
    const res = await fetch(`${API}/api/media`);
    const data = await res.json();
    const grid = document.getElementById("mediaGrid");

    if (!data.media || data.media.length === 0) {
      grid.innerHTML = '<p class="empty">No media uploaded yet. Go to Upload tab.</p>';
      return;
    }

    grid.innerHTML = data.media
      .map((m) => {
        const thumb =
          m.type === "video"
            ? `<video src="${m.url}" muted></video>`
            : `<img src="${m.url}" alt="${escapeHtml(m.title)}" />`;
        return `
        <div class="media-card">
          <div class="thumb">${thumb}</div>
          <div class="info">
            <h4>${escapeHtml(m.title)}</h4>
            <div class="meta">
              <span>${m.category}</span>
              <span>${m.views} views</span>
            </div>
            <button class="delete-btn" data-id="${m.id}">Delete</button>
          </div>
        </div>`;
      })
      .join("");

    grid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteMedia(btn.dataset.id));
    });
  } catch (e) {
    console.error(e);
  }
}

async function deleteMedia(id) {
  if (!confirm("Delete this media item?")) return;
  try {
    const res = await fetch(`${API}/api/admin/media/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (res.ok) {
      loadMedia();
      loadStats();
    } else {
      const data = await res.json();
      alert(data.error || "Delete failed");
    }
  } catch (e) {
    alert("Error deleting");
  }
}

// Upload
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("uploadStatus");
  status.textContent = "Uploading…";
  status.className = "status";

  const form = e.target;
  const fd = new FormData(form);

  try {
    const res = await fetch(`${API}/api/admin/upload`, {
      method: "POST",
      headers: { "X-Admin-Token": token },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      status.textContent = data.error || "Upload failed";
      status.className = "status err";
      return;
    }
    status.textContent = "Uploaded successfully!";
    status.className = "status ok";
    form.reset();
    loadMedia();
    loadStats();
  } catch (err) {
    status.textContent = "Upload error – is the server running?";
    status.className = "status err";
  }
});

// Submissions
async function loadSubmissions() {
  try {
    const res = await fetch(`${API}/api/admin/submissions`, { headers: headers() });
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("submissionsList");

    if (!data.submissions || data.submissions.length === 0) {
      list.innerHTML = '<p class="empty">No registrations yet. When someone fills the contact form, they appear here instantly.</p>';
      return;
    }

    list.innerHTML = data.submissions
      .map(
        (s) => `
      <div class="sub-card">
        <div class="header">
          <span class="name">${escapeHtml(s.name)}</span>
          <span class="date">${formatDate(s.created_at)}</span>
        </div>
        <div class="email">${escapeHtml(s.email)}</div>
        ${s.service ? `<div class="service">Interested in: ${escapeHtml(s.service)}</div>` : ""}
        ${s.message ? `<div class="message">${escapeHtml(s.message)}</div>` : ""}
      </div>`
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

// Change password
document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("passwordStatus");
  const newPassword = e.target.newPassword.value;

  try {
    const res = await fetch(`${API}/api/admin/change-password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      status.textContent = data.error || "Failed";
      status.className = "status err";
      return;
    }
    status.textContent = "Password changed successfully";
    status.className = "status ok";
    e.target.reset();
  } catch (err) {
    status.textContent = "Error";
    status.className = "status err";
  }
});

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.includes("Z") ? "" : "Z"));
  return d.toLocaleString();
}

// Auto-refresh submissions every 15s when on that tab
setInterval(() => {
  const tab = document.getElementById("tab-submissions");
  if (tab && tab.classList.contains("active") && token) {
    loadSubmissions();
  }
}, 15000);


// Test email
const testEmailBtn = document.getElementById("testEmailBtn");
if (testEmailBtn) {
  testEmailBtn.addEventListener("click", async () => {
    const status = document.getElementById("testEmailStatus");
    status.textContent = "Sending…";
    status.className = "status";
    try {
      const res = await fetch(`${API}/api/admin/test-email`, {
        method: "POST",
        headers: headers(),
      });
      const data = await res.json();
      if (data.ok) {
        status.textContent = "Test email sent! Check your inbox.";
        status.className = "status ok";
      } else {
        status.textContent = data.reason || "Failed – is email configured?";
        status.className = "status err";
      }
    } catch (e) {
      status.textContent = "Error sending test email";
      status.className = "status err";
    }
  });
}
