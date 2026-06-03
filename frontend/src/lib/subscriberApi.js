import axios from "axios";
import { API } from "@/lib/api";

const subscriberApi = axios.create({ baseURL: API });

subscriberApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("subscriber_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

subscriberApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith("/mi") && path !== "/mi/login") {
        localStorage.removeItem("subscriber_token");
        window.location.href = "/mi/login";
      }
    }
    return Promise.reject(err);
  },
);

export default subscriberApi;
