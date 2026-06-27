import { useState, useMemo } from "react";
import {
  Sliders,
  X,
  Plus,
  Trash2,
  Check,
  Edit3,
  CheckSquare,
  XSquare,
} from "lucide-react";
import toast from "react-hot-toast";

const AGGREGATIONS = [
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Average" },
  { value: "median", label: "Median" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count" },
  { value: "std", label: "Std Deviation" },
];

export default function KPICustomizer({
  kpis,
  columnTypes,
  columns,
  onApply,
  onClose,
}) {
  // Which auto-detected KPIs are toggled ON
  const [includedLabels, setIncludedLabels] = useState(
    kpis.map((k) => k.label)
  );
  // Custom KPIs added by user (new ones)
  const [customKpis, setCustomKpis] = useState([]);
  // Edits to existing KPIs: { originalLabel, newLabel, column, aggregation }
  const [editedKpis, setEditedKpis] = useState({});
  // Track which KPI is currently being edited (by original label)
  const [editingLabel, setEditingLabel] = useState(null);

  const columnsByType = useMemo(() => {
    const byType = { numeric: [], categorical: [], datetime: [], text: [], id: [], other: [] };
    (columns || []).forEach((col) => {
      const type = columnTypes?.[col] || "other";
      if (byType[type]) byType[type].push(col);
      else byType.other.push(col);
    });
    return byType;
  }, [columns, columnTypes]);

  const allColumns = columns || [];

  const typeLabels = {
    numeric: "Numeric Columns",
    categorical: "Categorical Columns",
    datetime: "Date/Time Columns",
    text: "Text Columns",
    id: "ID Columns",
    other: "Other Columns",
  };

  const typeColors = {
    numeric: "text-cyan-400",
    categorical: "text-indigo-400",
    datetime: "text-amber-400",
    text: "text-gray-400",
    id: "text-rose-400",
    other: "text-gray-500",
  };

  const NUMERIC_AGGS = ["sum", "mean", "median", "min", "max", "count", "std"];
  const DATETIME_AGGS = ["min", "max", "count"];
  const OTHER_AGGS = ["count"];

  const getValidAggs = (columnName) => {
    const colType = columnTypes?.[columnName] || "other";
    if (colType === "numeric") return NUMERIC_AGGS;
    if (colType === "datetime") return DATETIME_AGGS;
    return OTHER_AGGS;
  };

  const numericCols = columnsByType.numeric;
  const catCols = columnsByType.categorical;

  const toggleKpi = (label) => {
    setIncludedLabels((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  // Start editing an existing KPI
  const startEdit = (kpi) => {
    const existing = editedKpis[kpi.label];
    // Guess the column from the KPI label or pick first numeric
    const guessedCol = numericCols.find((c) =>
      kpi.label.toLowerCase().includes(c.replace("_", " ").toLowerCase())
    ) || numericCols[0] || "";
    setEditedKpis((prev) => ({
      ...prev,
      [kpi.label]: existing || {
        originalLabel: kpi.label,
        newLabel: kpi.label,
        column: guessedCol,
        aggregation: "sum",
      },
    }));
    setEditingLabel(kpi.label);
  };

  // Update the edit-in-progress
  const updateEdit = (originalLabel, field, value) => {
    setEditedKpis((prev) => ({
      ...prev,
      [originalLabel]: { ...prev[originalLabel], [field]: value },
    }));
  };

  // Save edit (close editor)
  const saveEdit = () => {
    setEditingLabel(null);
  };

  // Cancel edit (remove if unchanged, revert if new)
  const cancelEdit = (originalLabel) => {
    setEditedKpis((prev) => {
      const updated = { ...prev };
      const edit = updated[originalLabel];
      // If user didn't change anything meaningful, remove the edit
      if (
        edit.newLabel === edit.originalLabel &&
        !edit.column &&
        edit.aggregation === "sum"
      ) {
        delete updated[originalLabel];
      }
      return updated;
    });
    setEditingLabel(null);
  };

  // Remove an edit
  const removeEdit = (originalLabel) => {
    setEditedKpis((prev) => {
      const updated = { ...prev };
      delete updated[originalLabel];
      return updated;
    });
    if (editingLabel === originalLabel) setEditingLabel(null);
  };

  const addCustomKpi = () => {
    setCustomKpis((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: "",
        column: numericCols[0] || columns[0] || "",
        aggregation: "sum",
      },
    ]);
  };

  const updateCustomKpi = (id, field, value) => {
    setCustomKpis((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        const updated = { ...k, [field]: value };
        // Auto-adjust aggregation when column changes
        if (field === "column") {
          const validAggs = getValidAggs(value);
          if (!validAggs.includes(updated.aggregation)) {
            updated.aggregation = validAggs[0];
          }
        }
        return updated;
      })
    );
  };

  const removeCustomKpi = (id) => {
    setCustomKpis((prev) => prev.filter((k) => k.id !== id));
  };

  // Check if a KPI has been edited
  const isEdited = (label) => editingLabel === label || editedKpis[label];

  // The effective label for a KPI (after edit)
  const effectiveLabel = (originalLabel) => {
    const edit = editedKpis[originalLabel];
    return edit ? edit.newLabel : originalLabel;
  };

  const handleApply = () => {
    const validCustom = customKpis.filter((k) => k.label.trim() && k.column);
    if (includedLabels.length === 0 && validCustom.length === 0) {
      toast.error("Select at least one KPI");
      return;
    }

    // Build the edited_kpis list for the backend
    const editedList = Object.values(editedKpis).filter(
      (e) => e.column && e.newLabel.trim()
    );

    onApply({
      included_labels: includedLabels,
      edited_kpis: editedList.map((e) => ({
        original_label: e.originalLabel,
        new_label: e.newLabel !== e.originalLabel ? e.newLabel : undefined,
        column: e.column,
        aggregation: e.aggregation,
      })),
      custom_kpis: validCustom.map((k) => ({
        label: k.label.trim(),
        column: k.column,
        aggregation: k.aggregation,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-16 pb-8">
      <div
        className="w-full max-w-xl bg-card rounded-2xl border border-gray-700/50 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sliders className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Customize KPIs
              </h2>
              <p className="text-xs text-gray-500">
                Toggle, edit existing KPIs or add custom calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Existing KPIs */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Auto-Detected KPIs
              <span className="ml-2 font-normal text-gray-600 normal-case">
                (click to edit)
              </span>
            </h3>
            <div className="space-y-2">
              {kpis.map((kpi, idx) => {
                const isOn = includedLabels.includes(kpi.label);
                const beingEdited = editingLabel === kpi.label;
                const hasEdit = !!editedKpis[kpi.label];
                const effLabel = effectiveLabel(kpi.label);
                const editData = editedKpis[kpi.label];

                return (
                  <div key={idx}>
                    {beingEdited ? (
                      /* ---- EDIT MODE ---- */
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            Editing: {kpi.label}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit()}
                              className="p-1 rounded hover:bg-green-500/10 text-green-400 transition-colors"
                              title="Save"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelEdit(kpi.label)}
                              className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                              title="Cancel"
                            >
                              <XSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* New Label */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Display Label
                          </label>
                          <input
                            type="text"
                            value={editData?.newLabel || kpi.label}
                            onChange={(e) =>
                              updateEdit(kpi.label, "newLabel", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        {/* Column + Aggregation */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Column
                            </label>
                            <select
                              value={editData?.column || ""}
                              onChange={(e) =>
                                updateEdit(kpi.label, "column", e.target.value)
                              }
                              className="w-full text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="" disabled>
                                Select a column...
                              </option>
                              {Object.entries(columnsByType).map(([type, cols]) =>
                                cols.length > 0 ? (
                                  <optgroup key={type} label={typeLabels[type] || type}>
                                    {cols.map((col) => (
                                      <option key={col} value={col}>
                                        {col}  [{type}]
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null
                              )}
                            </select>
                          </div>
                          <div className="w-28">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Aggregation
                            </label>
                            <select
                              value={editData?.aggregation || "sum"}
                              onChange={(e) =>
                                updateEdit(
                                  kpi.label,
                                  "aggregation",
                                  e.target.value
                                )
                              }
                              className="w-full text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              {AGGREGATIONS.filter(a => getValidAggs(editData?.column).includes(a.value)).map((a) => (
                                <option key={a.value} value={a.value}>
                                  {a.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ---- VIEW MODE ---- */
                      <label
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          isOn
                            ? "bg-gray-800/40 border border-gray-700/50 hover:border-gray-600/60"
                            : "bg-gray-800/20 border border-gray-700/30 opacity-60 hover:opacity-80"
                        } ${hasEdit ? "ring-1 ring-accent/40" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Toggle checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleKpi(kpi.label);
                            }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              isOn
                                ? "bg-primary border-primary"
                                : "border-gray-600"
                            }`}
                          >
                            {isOn && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {effLabel}
                              {hasEdit && (
                                <span className="ml-1.5 text-[10px] text-accent font-normal">
                                  (edited)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {kpi.value}{" "}
                              {kpi.change_label &&
                                `\u00b7 ${kpi.change_label}`}
                              {hasEdit &&
                                ` \u2192 ${editedKpis[kpi.label].aggregation} of ${editedKpis[kpi.label].column}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isOn
                                ? "bg-gray-700/50 text-gray-400"
                                : "bg-gray-800/50 text-gray-600"
                            }`}
                          >
                            {kpi.format_type || "number"}
                          </span>
                          {/* Edit button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(kpi);
                            }}
                            className={`p-1 rounded transition-colors ${
                              hasEdit
                                ? "text-accent hover:bg-accent/10"
                                : "text-gray-600 hover:text-gray-300 hover:bg-gray-700"
                            }`}
                            title="Edit this KPI"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom KPIs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Custom KPIs
              </h3>
              <button
                onClick={addCustomKpi}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Custom
              </button>
            </div>

            {customKpis.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">
                No custom KPIs yet. Click "Add Custom" to create your own.
              </p>
            )}

            <div className="space-y-3">
              {customKpis.map((ck) => (
                <div
                  key={ck.id}
                  className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="KPI Label (e.g. Avg Revenue)"
                      value={ck.label}
                      onChange={(e) =>
                        updateCustomKpi(ck.id, "label", e.target.value)
                      }
                      className="flex-1 px-2.5 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      onClick={() => removeCustomKpi(ck.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-gray-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={ck.column}
                      onChange={(e) =>
                        updateCustomKpi(ck.id, "column", e.target.value)
                      }
                      className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="" disabled>Select a column...</option>
                      {Object.entries(columnsByType).map(([type, cols]) =>
                        cols.length > 0 ? (
                          <optgroup key={type} label={typeLabels[type] || type}>
                            {cols.map((col) => (
                              <option key={col} value={col}>
                                {col}  [{type}]
                              </option>
                            ))}
                          </optgroup>
                        ) : null
                      )}
                    </select>
                    <select
                      value={ck.aggregation}
                      onChange={(e) =>
                        updateCustomKpi(ck.id, "aggregation", e.target.value)
                      }
                      className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {AGGREGATIONS.filter(a => getValidAggs(ck.column).includes(a.value)).map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-700/50 bg-gray-800/30">
          <p className="text-xs text-gray-600">
            {includedLabels.filter((l) => !editedKpis[l] || editedKpis[l].newLabel.trim()).length +
              customKpis.filter((k) => k.label.trim()).length +
              Object.values(editedKpis).filter((e) => e.newLabel.trim()).length}{" "}
            KPI
            {includedLabels.length +
              customKpis.filter((k) => k.label.trim()).length !==
              1
              ? "s"
              : ""}{" "}
            selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors shadow-lg shadow-primary/20"
            >
              Apply & Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
