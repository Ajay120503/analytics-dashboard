import { useState } from "react";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";
import { refreshInsights } from "../api/client";

export default function InsightsPanel({ insights, columnStats }) {
  const [refreshing, setRefreshing] = useState(false);
  const [localInsights, setLocalInsights] = useState(insights);

  const handleRefresh = async () => {
    if (!columnStats) {
      toast.error("No data to refresh insights from");
      return;
    }
    setRefreshing(true);
    try {
      const data = await refreshInsights(columnStats);
      setLocalInsights(data.insights);
      toast.success("Insights refreshed!");
    } catch (err) {
      toast.error("Failed to refresh insights");
    } finally {
      setRefreshing(false);
    }
  };

  const renderInsights = () => {
    if (!localInsights) {
      return (
        <p className="text-gray-500 text-sm italic">No insights available</p>
      );
    }

    // Handle bullet points
    const lines = localInsights.split("\n").filter((l) => l.trim());

    return (
      <ul className="space-y-3">
        {lines.map((line, i) => {
          const clean = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "");
          if (!clean.trim()) return null;

          // Check if it's a header (contains ** or is all caps with colon)
          if (line.includes("**") || /^[A-Z\s]+:/.test(line)) {
            return (
              <li
                key={i}
                className="flex items-start gap-2 text-sm font-semibold text-gray-200"
              >
                <Lightbulb className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <span>{clean}</span>
              </li>
            );
          }

          return (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-gray-300 animate-fadeIn"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>{clean}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">AI Insights</h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:text-white bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      <div className="p-5">
        {refreshing ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-2 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-2 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderInsights()
        )}
      </div>
    </div>
  );
}
