const BASE_URL =
  window.location.hostname === "bookapp.localhost"
    ? "http://api.bookapp.localhost:8000"
    : "http://localhost:8000";

function getCookie(name) {
  const parts = document.cookie.split("; ").find((row) => row.startsWith(name + "="));
  return parts ? decodeURIComponent(parts.split("=")[1]) : "";
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // ✅ CSRF: required for state-changing requests when using cookies
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCookie("csrf_token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // ✅ REQUIRED for cookie-based auth
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {}
    throw new Error(message);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
