import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Grid3X3,
  Maximize2,
  Minimize2,
} from "lucide-react";

const chartTypeOptions = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: TrendingUp },
  { value: "pie", label: "Pie", icon: PieChartIcon },
  { value: "area", label: "Area", icon: TrendingUp },
  { value: "scatter", label: "Scatter", icon: Grid3X3 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-gray-300 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function ChartGrid({ charts }) {
  const [chartTypes, setChartTypes] = useState({});
  const [fullscreen, setFullscreen] = useState(null);

  const getChartType = (index) =>
    chartTypes[index] || charts[index]?.type || "bar";

  const handleTypeChange = (index, newType) => {
    setChartTypes((prev) => ({ ...prev, [index]: newType }));
  };

  if (!charts || charts.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Charts & Visualizations
        </h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
          {charts.length} charts
        </span>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFullscreen(null)}>
          <div className="w-full max-w-5xl bg-card rounded-xl border border-gray-700/50 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{charts[fullscreen].title}</h3>
              <button onClick={() => setFullscreen(null)} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                <Minimize2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="h-[500px]">
              <ChartContent chart={charts[fullscreen]} chartType={getChartType(fullscreen)} height={500} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, index) => (
          <div
            key={index}
            className="glass-card p-5 hover:border-gray-600/50 transition-all duration-300"
            style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-200 truncate mr-2">{chart.title}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFullscreen(index)}
                  className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <select
                  value={getChartType(index)}
                  onChange={(e) => handleTypeChange(index, e.target.value)}
                  className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {chartTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {chart.description && (
              <p className="text-[10px] text-gray-600 mb-3 -mt-2">{chart.description}</p>
            )}
            <ChartContent chart={chart} chartType={getChartType(index)} height={280} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartContent({ chart, chartType, height }) {
  const data = chart.data || [];
  const colors = chart.colors || ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

  const commonProps = {
    stroke: "#334155",
    strokeDasharray: "3 3",
  };

  const axisProps = {
    stroke: "#64748b",
    tick: { fontSize: 11, fill: "#94a3b8" },
  };

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={chart.x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {chart.y_keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={chart.x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {chart.y_keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={chart.x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {chart.y_keys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.15} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={chart.x_key} {...axisProps} />
            <YAxis dataKey={chart.y_keys[0]} {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "histogram":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={chart.x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={chart.y_keys[0]} fill={colors[0]} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
