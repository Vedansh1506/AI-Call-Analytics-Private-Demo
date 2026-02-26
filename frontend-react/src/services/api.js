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
  getAnalysis: (assetId) => api.get(`/assets/${assetId}/analysis`),
  getTranscript: (assetId) => api.get(`/assets/${assetId}/transcript`),
  getSupportedLanguages: () => api.get("/assets/supported-languages"),
  getAudioUrl: (assetId) => `${API_BASE_URL}/assets/${assetId}/audio`,
  getUploadConstraints: () => api.get("/assets/upload-constraints"),
  getTranscriptExportUrl: (assetId, format = "pdf") => `${API_BASE_URL}/assets/${assetId}/export/transcript?format=${encodeURIComponent(format)}`,
  getAnalysisExportUrl: (assetId, format = "pdf") => `${API_BASE_URL}/assets/${assetId}/export/analysis?format=${encodeURIComponent(format)}`,
};

export default api;
