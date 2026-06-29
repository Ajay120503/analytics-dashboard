import { useState, useCallback } from "react";
import { BarChart3, Upload, Download, Sliders } from "lucide-react";
import KPICards from "./KPICards";
import ChartGrid from "./ChartGrid";
import DataTable from "./DataTable";
import InsightsPanel from "./InsightsPanel";
import KPICustomizer from "./KPICustomizer";
import { regenerateDashboard } from "../api/client";
import toast from "react-hot-toast";

const fileTypeColors = {
  csv: "text-green-400 bg-green-500/10 border-green-500/20",
  xlsx: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  xls: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  json: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  pdf: "text-red-400 bg-red-500/10 border-red-500/20",
  txt: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  sql: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function Dashboard({ data, onReset, onDataUpdate }) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!data) return null;

  const fileExt = data.filename?.split(".").pop()?.toLowerCase() || "";
  const extColor = fileTypeColors[fileExt] || fileTypeColors.txt;

  const handleExport = () => window.print();

  const columnStats = {
    columns: data.columns,
    column_types: data.column_types,
    row_count: data.row_count,
    numeric_stats: {},
    categorical_top: {},
    correlations: data.correlations || [],
    outliers: data.outliers || {},
    data_quality: data.data_quality || {},
  };

  data.kpis?.forEach((kpi) => {
    const key = kpi.label.replace(/^Total\s+/i, "").toLowerCase();
    if (kpi.raw_value !== undefined) {
      columnStats.numeric_stats[key] = {
        mean: kpi.raw_value,
        std: kpi.raw_value * 0.2,
        min: kpi.raw_value * 0.5,
        max: kpi.raw_value * 1.5,
        median: kpi.raw_value,
        count: data.row_count,
      };
    }
  });

  const handleKpiApply = useCallback(
    async (kpiSelections) => {
      setRegenerating(true);
      setShowCustomizer(false);
      try {
        const newData = await regenerateDashboard(
          data.file_id,
          data.filename,
          kpiSelections
        );
        if (onDataUpdate) {
          onDataUpdate(newData);
        }
        const count =
          kpiSelections.included_labels.length +
          kpiSelections.custom_kpis.length;
        toast.success(`Dashboard regenerated with ${count} KPIs!`);
      } catch (err) {
        const msg = err.response?.data?.detail || "Failed to regenerate";
        toast.error(msg);
      } finally {
        setRegenerating(false);
      }
    },
    [data.file_id, data.filename, onDataUpdate]
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white leading-tight">
                  Analytics Dashboard
                </h1>
                <p className="text-[10px] text-gray-500 leading-tight">
                  Real-time Data Insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
                <span className="status-dot status-dot-live" />
                <span className="text-xs text-gray-400">Live</span>
              </div>

              {/* KPI Customizer Button */}
              <button
                onClick={() => setShowCustomizer(true)}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-all disabled:opacity-50"
              >
                <Sliders
                  className={`w-3.5 h-3.5 ${
                    regenerating ? "animate-spin" : ""
                  }`}
                />
                {regenerating ? "Regenerating..." : "Customize KPIs"}
              </button>

              {data.data_quality && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/50">
                  <span
                    className={`text-xs font-medium ${
                      data.data_quality.missing_percentage < 5
                        ? "text-green-400"
                        : data.data_quality.missing_percentage < 20
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {Math.max(
                      0,
                      100 - data.data_quality.missing_percentage * 2
                    ).toFixed(0)}
                    % quality
                  </span>
                </div>
              )}

              <button
                onClick={handleExport}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload New</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dataset Metadata Bar */}
        <div
          className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-gray-800/30 border border-gray-700/30"
          style={{ animation: "fadeInUp 0.4s ease-out" }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300 font-medium">
              {data.filename}
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${extColor}`}
          >
            .{fileExt}
          </span>
          <div className="flex items-center gap-3 text-sm text-gray-500 ml-auto">
            <span className="flex items-center gap-1">
              <strong className="text-gray-300">
                {data.row_count?.toLocaleString()}
              </strong>
              <span className="text-gray-600">rows</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="flex items-center gap-1">
              <strong className="text-gray-300">{data.column_count}</strong>
              <span className="text-gray-600">columns</span>
            </span>
            {data.data_quality && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="flex items-center gap-1">
                  <strong
                    className={`${
                      data.data_quality.duplicate_rows > 0
                        ? "text-amber-400"
                        : "text-green-400"
                    }`}
                  >
                    {data.data_quality.duplicate_rows}
                  </strong>
                  <span className="text-gray-600">duplicates</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Key Performance Indicators
            </h2>
            <span className="text-xs text-gray-600">
              {data.kpis?.length || 0} active
            </span>
          </div>
          <KPICards kpis={data.kpis} />
        </section>

        {/* Charts + Insights Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          <div className="xl:col-span-3 space-y-6">
            <ChartGrid
              charts={data.charts}
              fileId={data.file_id}
              onChartUpdate={(index, updatedChart) => {
                const newCharts = [...data.charts];
                newCharts[index] = updatedChart;
                if (onDataUpdate) {
                  onDataUpdate({ ...data, charts: newCharts });
                }
              }}
            />
          </div>
          <div className="xl:col-span-1">
            <InsightsPanel insights={data.insights} columnStats={columnStats} />
          </div>
        </div>

        {/* Data Table */}
        <section className="mb-8">
          <DataTable table={data.table} columnTypes={data.column_types} />
        </section>
      </main>

      {/* KPI Customizer Modal */}
      {showCustomizer && (
        <KPICustomizer
          kpis={data.kpis}
          columnTypes={data.column_types}
          columns={data.columns}
          onApply={handleKpiApply}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </div>
  );
}
