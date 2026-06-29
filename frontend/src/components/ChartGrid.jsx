import { useState, useCallback, useRef } from "react";
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
  ZAxis,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Grid3X3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Layers,
} from "lucide-react";
import { updateChart } from "../api/client";
import toast from "react-hot-toast";

const chartTypeOptions = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: TrendingUp },
  { value: "pie", label: "Pie", icon: PieChartIcon },
  { value: "area", label: "Area", icon: TrendingUp },
  { value: "scatter", label: "Scatter", icon: Grid3X3 },
  { value: "histogram", label: "Histogram", icon: Grid3X3 },
  { value: "cluster", label: "Cluster", icon: Layers },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-gray-300 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-xs" style={{ color: entry.color }}>
          {entry.name}:{" "}
          <span className="font-medium">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function ChartGrid({ charts, fileId, onChartUpdate }) {
  const [chartTypes, setChartTypes] = useState({});
  const [fullscreen, setFullscreen] = useState(null);
  const [updatingCharts, setUpdatingCharts] = useState({});
  const [dataKeys, setDataKeys] = useState({}); // unique keys to force re-render
  const chartRefs = useRef({});

  const getChartType = (index) =>
    chartTypes[index] || charts[index]?.type || "bar";

  const getDataKey = (index) => dataKeys[index] || `chart-${index}-0`;

  // Call the backend to recompute chart data
  const doColumnUpdate = useCallback(
    async (index, chartType, xColumn, yColumns) => {
      setUpdatingCharts((prev) => ({ ...prev, [index]: true }));

      try {
        const result = await updateChart(
          fileId,
          index,
          chartType,
          xColumn,
          yColumns
        );
        if (onChartUpdate && result.chart) {
          // Force Recharts to re-render by giving a new key
          setDataKeys((prev) => ({
            ...prev,
            [index]: `chart-${index}-${Date.now()}`,
          }));
          onChartUpdate(index, result.chart);
        }
      } catch (err) {
        const msg = err.response?.data?.detail || "Failed to update chart";
        toast.error(msg);
      } finally {
        setUpdatingCharts((prev) => ({ ...prev, [index]: false }));
      }
    },
    [fileId, onChartUpdate]
  );

  const handleTypeChange = (index, newType) => {
    setChartTypes((prev) => ({ ...prev, [index]: newType }));
    const chart = charts[index];
    if (!chart) return;
    const xCol = chart.selected_x_column || chart.x_key;
    const yCols = chart.selected_y_columns || chart.y_keys || [];
    if (xCol && yCols.length > 0) {
      doColumnUpdate(index, newType, xCol, yCols);
    }
  };

  const handleXColumnChange = (index, col) => {
    const chart = charts[index];
    if (!chart) return;
    const chartType = chartTypes[index] || chart.type;
    const yCols = chart.selected_y_columns || chart.y_keys || [];
    doColumnUpdate(
      index,
      chartType,
      col,
      yCols.length > 0 ? yCols : [chart.available_y_columns[0] || col]
    );
  };

  const handleYColumnChange = (index, col) => {
    const chart = charts[index];
    if (!chart) return;
    const chartType = chartTypes[index] || chart.type;
    const xCol = chart.selected_x_column || chart.x_key;
    doColumnUpdate(index, chartType, xCol, [col]);
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
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <div
            className="w-full max-w-5xl bg-card rounded-xl border border-gray-700/50 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {charts[fullscreen].title}
              </h3>
              <button
                onClick={() => setFullscreen(null)}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Minimize2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="h-[500px]">
              <ChartContent
                key={getDataKey(fullscreen)}
                chart={charts[fullscreen]}
                chartType={getChartType(fullscreen)}
                height={500}
              />
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
              <h3 className="text-sm font-medium text-gray-200 truncate mr-2">
                {chart.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {updatingCharts[index] && (
                  <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                )}
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

            {/* Column Selectors */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* X-axis column selector */}
              {(chart.available_x_columns || []).length > 0 && (
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                    X:
                  </label>
                  <select
                    value={chart.selected_x_column || chart.x_key}
                    onChange={(e) => handleXColumnChange(index, e.target.value)}
                    disabled={updatingCharts[index]}
                    className="text-[11px] bg-gray-800/50 border border-gray-700/50 rounded px-1.5 py-1 text-gray-300 focus:ring-1 focus:ring-primary focus:border-transparent max-w-[130px]"
                  >
                    {(chart.available_x_columns || []).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Y-axis column selector */}
              {(chart.available_y_columns || []).length > 0 && (
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Y:
                  </label>
                  <select
                    value={
                      (chart.selected_y_columns || chart.y_keys || [])[0] || ""
                    }
                    onChange={(e) => handleYColumnChange(index, e.target.value)}
                    disabled={updatingCharts[index]}
                    className="text-[11px] bg-gray-800/50 border border-gray-700/50 rounded px-1.5 py-1 text-gray-300 focus:ring-1 focus:ring-primary focus:border-transparent max-w-[130px]"
                  >
                    {(chart.available_y_columns || []).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {chart.description && (
              <p className="text-[10px] text-gray-600 mb-3 -mt-1">
                {chart.description}
              </p>
            )}
            <ChartContent
              key={getDataKey(index)}
              chart={chart}
              chartType={getChartType(index)}
              height={280}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartContent({ chart, chartType, height }) {
  const data = chart.data || [];
  const colors = chart.colors || [
    "#6366f1",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
    "#10b981",
    "#8b5cf6",
  ];

  const commonProps = {
    stroke: "#334155",
    strokeDasharray: "3 3",
  };

  const axisProps = {
    stroke: "#64748b",
    tick: { fontSize: 11, fill: "#94a3b8" },
  };

  const xKey = chart.selected_x_column || chart.x_key;
  const yKeys = chart.selected_y_columns || chart.y_keys || [];

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-xs"
        style={{ height }}
      >
        No data available for this selection
      </div>
    );
  }

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {yKeys
              .filter((k) => k !== "cluster")
              .map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {yKeys
              .filter((k) => k !== "cluster")
              .map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
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
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            {yKeys
              .filter((k) => k !== "cluster")
              .map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={xKey} name={xKey} {...axisProps} />
            <YAxis dataKey={yKeys[0]} name={yKeys[0]} {...axisProps} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={<CustomTooltip />}
            />
            <Scatter data={data} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "cluster":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={xKey} name={xKey} {...axisProps} />
            <YAxis dataKey={yKeys[0]} name={yKeys[0]} {...axisProps} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={<CustomTooltip />}
            />
            {(() => {
              // Group data points by cluster label
              const clusterGroups = {};
              const centroids = [];
              data.forEach((point) => {
                if (point.centroid) {
                  centroids.push(point);
                } else {
                  const c = point.cluster ?? 0;
                  if (!clusterGroups[c]) clusterGroups[c] = [];
                  clusterGroups[c].push(point);
                }
              });
              return (
                <>
                  {Object.entries(clusterGroups).map(([cluster, points]) => (
                    <Scatter
                      key={`cluster-${cluster}`}
                      data={points}
                      fill={
                        points[0]?.cluster_color ||
                        colors[parseInt(cluster) % colors.length]
                      }
                      name={`Cluster ${cluster}`}
                    />
                  ))}
                  {centroids.length > 0 && (
                    <Scatter
                      data={centroids}
                      fill="#ffffff"
                      stroke="#000000"
                      strokeWidth={2}
                      name="Centroid"
                      shape="diamond"
                    />
                  )}
                </>
              );
            })()}
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "histogram":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid {...commonProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={yKeys[0] || "frequency"}
              fill={colors[0]}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
