import axios from "axios";
import qs from "qs";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";


function getCookie(name) {
  const match = document.cookie.split("; ").find((r) => r.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();

    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrf = getCookie("csrf_token");
      if (csrf) {
        config.headers["X-CSRF-Token"] = csrf;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-token");

    if (status === 401 && !isAuthEndpoint) {
      window.dispatchEvent(new Event("auth:expired"));
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    return api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/api/me"),
};

export const assetsAPI = {
  upload: (formData, config = {}) =>
    api.post("/assets/upload", formData, {
      ...config,
      headers: {
        ...config.headers,
        "Content-Type": undefined,
      },
    }),
  list: (params) =>
    api.get("/assets", {
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: "repeat" }),
    }),
  getStats: () => api.get("/assets/stats"),
  getAnalysis: (assetId, analysisLanguage = "en") =>
  api.get(`/assets/${assetId}/analysis`, { params: { analysis_language: analysisLanguage } }),

  getTranscript: (assetId) => api.get(`/assets/${assetId}/transcript`),
  getSupportedLanguages: () => api.get("/assets/supported-languages"),
  getAudioUrl: (assetId) => `${API_BASE_URL}/assets/${assetId}/audio`,
  getUploadConstraints: () => api.get("/assets/upload-constraints"),
  getTranscriptExportUrl: (assetId, format = "pdf") => `${API_BASE_URL}/assets/${assetId}/export/transcript?format=${encodeURIComponent(format)}`,
  getAnalysisExportUrl: (assetId, format = "pdf", lang = "en") =>
  `${API_BASE_URL}/assets/${assetId}/export/analysis?format=${encodeURIComponent(format)}&lang=${encodeURIComponent(lang)}`,
};

export const sendChatMessage = async (assetId, message, sessionId = null) => {
  const response = await fetch(`/api/chat/${assetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Chat request failed');
  return response.json();
};

export const getChatSessions = async (assetId) => {
  const response = await fetch(`/api/chat/${assetId}/sessions`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json(); // [{ id, title, created_at, message_count }, ...]
};

export const getChatSession = async (sessionId) => {
  const response = await fetch(`/api/chat/session/${sessionId}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch session');
  return response.json(); // { id, messages: [{role, text}], ... }
};

export const deleteChatSession = async (sessionId) => {
  const response = await fetch(`/api/chat/session/${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete session');
  return response.json();
};

export const getProfile = async () => {
  const response = await fetch('/api/me', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
};

export const requestChangePasswordOtp = async () => {
  const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
  const response = await fetch('/api/me/request-change-password-otp', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to send OTP');
  return response.json();
};

export const changePassword = async (data) => {
  const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
  const response = await fetch('/api/me/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to change password');
  }
  return response.json();
};

export const updateProfile = async (data) => {
  const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
  const response = await fetch('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Update failed');
  }
  return response.json();
};

export const deleteAccount = async () => {
  const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
  const response = await fetch('/api/me', {
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrf },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete account');
  return response.json();
};

export default api;
