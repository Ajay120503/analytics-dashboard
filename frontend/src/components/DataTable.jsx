import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const typeColors = {
  numeric: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  categorical: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  datetime: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  text: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  id: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function DataTable({ table, columnTypes }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const rowsPerPage = 20;

  const handleSort = (col) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
    setPage(0);
  };

  const processedRows = useMemo(() => {
    if (!table?.rows) return [];
    let rows = [...table.rows];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortKey) {
      rows.sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    return rows;
  }, [table?.rows, search, sortKey, sortDir]);

  const totalPages = Math.ceil(processedRows.length / rowsPerPage);
  const paginatedRows = processedRows.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  if (!table || !table.columns || table.columns.length === 0) return null;

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-600" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Data Table</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
              {table.total_rows.toLocaleString()} rows
            </span>
            {search && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                {processedRows.length} filtered
              </span>
            )}
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
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-200 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {col}
                    <SortIcon col={col} />
                  </div>
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
                  <td key={col} className="px-4 py-2.5 text-gray-300 whitespace-nowrap max-w-[200px] truncate" title={row[col] !== undefined && row[col] !== null ? String(row[col]) : ""}>
                    {row[col] !== undefined && row[col] !== null
                      ? String(row[col])
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length} className="px-4 py-8 text-center text-gray-500">
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
            {Math.min((page + 1) * rowsPerPage, processedRows.length)} of{" "}
            {processedRows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 text-xs rounded-lg transition-colors ${
                      page === pageNum
                        ? "bg-primary text-white"
                        : "text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
