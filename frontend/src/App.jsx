import { useState, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import Dashboard from "./components/Dashboard";
import Loader from "./components/Loader";

export default function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUploadSuccess = useCallback((data) => {
    setDashboardData(data);
    setLoading(false);
  }, []);

  const handleUploadStart = useCallback(() => {
    setLoading(true);
  }, []);

  const handleReset = useCallback(() => {
    setDashboardData(null);
  }, []);

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
        <Dashboard data={dashboardData} onReset={handleReset} />
      )}
    </div>
  );
}
