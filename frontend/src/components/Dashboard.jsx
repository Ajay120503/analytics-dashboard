import { BarChart3, Upload } from "lucide-react";
import KPICards from "./KPICards";
import ChartGrid from "./ChartGrid";
import DataTable from "./DataTable";
import InsightsPanel from "./InsightsPanel";

const fileTypeColors = {
  csv: "text-green-400 bg-green-500/10 border-green-500/20",
  xlsx: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  xls: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  json: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  pdf: "text-red-400 bg-red-500/10 border-red-500/20",
  txt: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  sql: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function Dashboard({ data, onReset }) {
  if (!data) return null;

  const fileExt = data.filename?.split(".").pop()?.toLowerCase() || "";
  const extColor = fileTypeColors[fileExt] || fileTypeColors.txt;

  const handleExport = () => {
    window.print();
  };

  // Build columnStats for insights refresh - match backend _build_prompt field names
  const columnStats = {
    columns: data.columns,
    column_types: data.column_types,
    row_count: data.row_count,
    numeric_stats: {},
    categorical_top: {},
  };

  // Extract stats from KPIs
  data.kpis?.forEach((kpi) => {
    const key = kpi.label.replace(/^Total\s+/i, "").toLowerCase();
    if (kpi.change !== undefined) {
      const val = parseFloat(kpi.value.replace(/[^0-9.-]/g, "")) || 0;
      columnStats.numeric_stats[key] = {
        mean: val,
        std: val * 0.2,
        min: val * 0.5,
        max: val * 1.5,
        median: val,
        count: data.row_count,
      };
    }
  });

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">AD</span>
              </div>
              <h1 className="text-lg font-semibold text-white">
                Analytics Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export PDF
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload New File
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dataset Metadata */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm text-gray-400">{data.filename}</span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${extColor}`}
          >
            .{fileExt}
          </span>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              <strong className="text-gray-300">
                {data.row_count?.toLocaleString()}
              </strong>{" "}
              rows
            </span>
            <span>
              <strong className="text-gray-300">{data.column_count}</strong>{" "}
              columns
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <section className="mb-8">
          <KPICards kpis={data.kpis} />
        </section>

        {/* Charts + Insights Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          <div className="xl:col-span-3 space-y-6">
            <ChartGrid charts={data.charts} />
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
    </div>
  );
}
