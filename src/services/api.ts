import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  signup: (email: string, password: string, fullName: string) =>
    api.post("/auth/signup", { email, password, fullName }),

  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
};

// User API calls
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (fullName: string) => api.put("/users/profile", { fullName }),
  getStats: () => api.get("/users/stats"),
};

// Training API calls
export const trainingAPI = {
  recordSession: (
    technique: string,
    durationSeconds: number,
    score: number,
    velocity: number,
    accuracy: number,
  ) =>
    api.post("/training/sessions", {
      technique,
      durationSeconds,
      score,
      velocity,
      accuracy,
    }),

  getSessions: (limit: number = 20, offset: number = 0) =>
    api.get("/training/sessions", { params: { limit, offset } }),

  getStats: () => api.get("/training/stats"),
};

export default api;