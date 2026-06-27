import { useState, useMemo } from "react";
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, TrendingUp, Shield, Info } from "lucide-react";
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
      const insightsText = await refreshInsights(columnStats);
      setLocalInsights(insightsText);
      toast.success("Insights refreshed!");
    } catch (err) {
      toast.error("Failed to refresh insights");
    } finally {
      setRefreshing(false);
    }
  };

  const parsedInsights = useMemo(() => {
    if (!localInsights) return [];
    const lines = localInsights.split("\n").filter((l) => l.trim());
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      const clean = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim();
      if (!clean) continue;

      // Detect headers
      if (line.includes("**") || /^[A-Z\s\d]+:/.test(clean) || /^[\w\s]{3,}:/.test(line.replace(/^[-•*]\s*/, ""))) {
        if (currentSection) sections.push(currentSection);
        const icon = clean.includes("Overview") ? Sparkles :
                     clean.includes("Quality") || clean.includes("Completeness") ? Shield :
                     clean.includes("Numeric") || clean.includes("Correlation") ? TrendingUp :
                     clean.includes("Outlier") || clean.includes("Warning") ? AlertTriangle :
                     clean.includes("Categorical") || clean.includes("Distribution") ? Info :
                     clean.includes("Recommendation") ? Lightbulb : Info;
        currentSection = { title: clean, icon, items: [] };
      } else if (currentSection) {
        currentSection.items.push(clean);
      } else {
        // Treat as general insight
        if (!currentSection) {
          currentSection = { title: "Key Insights", icon: Sparkles, items: [] };
        }
        currentSection.items.push(clean);
      }
    }
    if (currentSection) sections.push(currentSection);
    return sections;
  }, [localInsights]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold text-white">AI Insights</h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent hover:text-white bg-accent/10 hover:bg-accent/20 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        {refreshing ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-700 rounded w-1/2" />
                <div className="h-3 bg-gray-700/50 rounded w-full" />
                <div className="h-3 bg-gray-700/50 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : parsedInsights.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No insights available</p>
        ) : (
          <div className="space-y-4">
            {parsedInsights.map((section, idx) => (
              <div key={idx} style={{ animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s both` }}>
                <div className="flex items-center gap-2 mb-2">
                  <section.icon className="w-3.5 h-3.5 text-accent" />
                  <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-700/30 bg-gray-800/30">
        <p className="text-[10px] text-gray-600 text-center">
          AI-powered analysis based on statistical algorithms
        </p>
      </div>
    </div>
  );
}
