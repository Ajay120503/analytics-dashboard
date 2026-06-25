import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const typeColors = {
  numeric: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  categorical: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  datetime: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  text: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function DataTable({ table, columnTypes }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const filteredRows = useMemo(() => {
    if (!search.trim() || !table?.rows) return table?.rows || [];
    const q = search.toLowerCase();
    return table.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [search, table?.rows]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  if (!table || !table.columns || table.columns.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Data Table</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
              {table.total_rows.toLocaleString()} rows
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search rows..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent w-64"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {table.columns.map((col) => (
            <span
              key={col}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                typeColors[columnTypes?.[col]] || typeColors.text
              }`}
            >
              {col}
              <span className="text-[10px] opacity-60">
                {columnTypes?.[col] || "text"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800/50">
              {table.columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {paginatedRows.map((row, i) => (
              <tr
                key={i}
                className={`${
                  i % 2 === 0 ? "bg-transparent" : "bg-gray-800/20"
                } hover:bg-gray-700/30 transition-colors`}
              >
                {table.columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2.5 text-gray-300 whitespace-nowrap"
                  >
                    {row[col] !== undefined && row[col] !== null
                      ? String(row[col])
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {search ? "No matching rows found" : "No data available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
          <p className="text-sm text-gray-500">
            Showing {page * rowsPerPage + 1} to{" "}
            {Math.min((page + 1) * rowsPerPage, filteredRows.length)} of{" "}
            {filteredRows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
