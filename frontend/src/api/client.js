import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

export const uploadFile = async (formData) => {
  const response = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const refreshInsights = async (columnStats) => {
  const response = await api.post("/insights/refresh", {
    column_stats: columnStats,
  });
  return response.data.insights;
};

export const regenerateDashboard = async (fileId, filename, kpiSelections) => {
  const response = await api.post("/dashboard/regenerate", {
    file_id: fileId,
    filename: filename,
    kpi_selections: kpiSelections,
  });
  return response.data;
};

export const getDashboard = async (fileId) => {
  const response = await api.get(`/dashboard/${fileId}`);
  return response.data;
};

export const updateChart = async (fileId, chartIndex, chartType, xColumn, yColumns) => {
  const response = await api.post("/chart/update", {
    file_id: fileId,
    chart_index: chartIndex,
    chart_type: chartType,
    x_column: xColumn,
    y_columns: yColumns,
  });
  return response.data;
};
