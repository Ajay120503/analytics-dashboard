import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

export const uploadFile = async (formData) => {
  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const refreshInsights = async (columnStats) => {
  const response = await api.post("/insights/refresh", {
    column_stats: columnStats,
  });
  return response.data;
};