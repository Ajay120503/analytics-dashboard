import { useState, useRef, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Database,
  Columns,
  Hash,
  Calendar,
  Info,
} from "lucide-react";

const iconMap = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  database: Database,
  columns: Columns,
  hash: Hash,
  calendar: Calendar,
};

const severityColors = {
  positive: "from-green-500/20 to-emerald-500/5 border-green-500/20",
  negative: "from-red-500/20 to-rose-500/5 border-red-500/20",
  warning: "from-amber-500/20 to-yellow-500/5 border-amber-500/20",
  info: "from-primary/20 to-accent/5 border-primary/20",
};

const severityTextColors = {
  positive: "text-green-400",
  negative: "text-red-400",
  warning: "text-amber-400",
  info: "text-primary",
};

const severityBadgeColors = {
  positive: "bg-green-500/10 text-green-400",
  negative: "bg-red-500/10 text-red-400",
  warning: "bg-amber-500/10 text-amber-400",
  info: "bg-primary/10 text-primary",
};

function AnimatedValue({ value, formatType }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);

  useEffect(() => {
    const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    if (isNaN(numeric)) {
      setDisplay(String(value));
      return;
    }
    const prefix = String(value).replace(/[0-9.,BKM%-]/g, "");
    const suffix = String(value).replace(/[^BKM%]/g, "");
    let start = 0;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (numeric - start) * eased;

      if (formatType === "percentage") {
        setDisplay(`${prefix}${current.toFixed(0)}%`);
      } else if (formatType === "currency") {
        setDisplay(`${prefix}${current >= 1000 ? (current / 1000).toFixed(1) + "K" : current.toFixed(0)}`);
      } else {
        setDisplay(`${prefix}${current >= 1000 ? (current / 1000).toFixed(1) + "K" : current.toFixed(0)}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(String(value));
      }
    };
    requestAnimationFrame(animate);
  }, [value, formatType]);

  return <span ref={ref}>{display}</span>;
}

function MiniSparkline({ data, color = "#6366f1", trend = "up" }) {
  if (!data || data.length < 2) return null;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const values = data.slice(0, 30);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    values.forEach((val, i) => {
      const x = padding + (i / (values.length - 1)) * (w - padding * 2);
      const y = h - padding - ((val - min) / range) * (h - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(1, color + "05");
    ctx.lineTo(w - padding, h - padding);
    ctx.lineTo(padding, h - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={30}
      className="opacity-60"
    />
  );
}

export default function KPICards({ kpis }) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = iconMap[kpi.icon] || TrendingUp;
        const isPositive = kpi.change >= 0;
        const sevClass = severityColors[kpi.severity] || severityColors.info;
        const textColor = severityTextColors[kpi.severity] || severityTextColors.info;
        const badgeColor = severityBadgeColors[kpi.severity] || severityBadgeColors.info;

        return (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${sevClass} hover:scale-[1.02] transition-all duration-300 group`}
            style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.08}s both` }}
          >
            {/* Shimmer overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-bg" />

            <div className="relative p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${badgeColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                {kpi.change !== undefined && kpi.change !== null && (
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
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

              <p className="text-xs text-gray-400 mb-0.5 truncate">{kpi.label}</p>

              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-white">
                  <AnimatedValue value={kpi.value} formatType={kpi.format_type} />
                </p>
                {kpi.sparkline_data && (
                  <MiniSparkline
                    data={kpi.sparkline_data}
                    color={isPositive ? "#22c55e" : "#ef4444"}
                    trend={kpi.trend}
                  />
                )}
              </div>

              {kpi.change_label && (
                <p className="text-[10px] text-gray-500 mt-1 truncate">
                  {kpi.change_label}
                </p>
              )}

              {kpi.subtitle && (
                <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                  {kpi.subtitle}
                </p>
              )}
            </div>

            {/* Accent bar at top */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 ${
                kpi.severity === "positive" ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                kpi.severity === "negative" ? "bg-gradient-to-r from-red-500 to-rose-400" :
                kpi.severity === "warning" ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                "bg-gradient-to-r from-primary to-accent"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
