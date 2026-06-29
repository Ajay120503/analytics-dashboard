import { useState, useCallback, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import Dashboard from "./components/Dashboard";
import Loader from "./components/Loader";
import { getDashboard } from "./api/client";

export default function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Restore dashboard data from localStorage on mount
  useEffect(() => {
    const restoreDashboard = async () => {
      try {
        const saved = localStorage.getItem("analytics_dashboard_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Try to restore from backend if file_id exists
          if (parsed.file_id) {
            try {
              const response = await fetch(`/api/dashboard/${parsed.file_id}`);
              if (response.ok) {
                const freshData = await response.json();
                setDashboardData(freshData);
                setInitialLoading(false);
                return;
              }
            } catch (e) {
              // If restore fails, still use cached data
              console.warn(
                "Could not restore from backend, using cached data",
                e
              );
            }
          }
          // Fallback to cached data
          setDashboardData(parsed);
        }
      } catch (e) {
        console.warn("Failed to restore dashboard data", e);
      } finally {
        setInitialLoading(false);
      }
    };
    restoreDashboard();
  }, []);

  // Persist dashboard data to localStorage whenever it changes
  useEffect(() => {
    if (dashboardData) {
      try {
        localStorage.setItem(
          "analytics_dashboard_data",
          JSON.stringify(dashboardData)
        );
      } catch (e) {
        console.warn("Failed to persist dashboard data", e);
      }
    }
  }, [dashboardData]);

  const handleUploadSuccess = useCallback((data) => {
    setDashboardData(data);
    setLoading(false);
  }, []);

  const handleUploadStart = useCallback(() => {
    setLoading(true);
  }, []);

  const handleReset = useCallback(() => {
    setDashboardData(null);
    localStorage.removeItem("analytics_dashboard_data");
  }, []);

  const handleDataUpdate = useCallback((newData) => {
    setDashboardData(newData);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {loading && <Loader />}

      {!dashboardData ? (
        <FileUpload
          onSuccess={(data) => {
            setDashboardData(data);
            setLoading(false);
          }}
        />
      ) : (
        <Dashboard
          data={dashboardData}
          onReset={handleReset}
          onDataUpdate={handleDataUpdate}
        />
      )}
    </div>
  );
}
