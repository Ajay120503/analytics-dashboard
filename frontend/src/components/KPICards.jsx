import {
  TrendingUp,
  TrendingDown,
  Database,
  Columns,
  Hash,
} from "lucide-react";

const iconMap = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  database: Database,
  columns: Columns,
  hash: Hash,
};

export default function KPICards({ kpis }) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = iconMap[kpi.icon] || TrendingUp;
        const isPositive = kpi.change >= 0;

        return (
          <div
            key={index}
            className="glass-card p-5 gradient-border hover:scale-[1.02] transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              {kpi.change !== undefined && kpi.change !== null && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    isPositive
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(kpi.change)}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            {kpi.change_label && (
              <p className="text-xs text-gray-500 mt-1">{kpi.change_label}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
