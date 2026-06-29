import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
import warnings

warnings.filterwarnings("ignore")

try:
    from sklearn.cluster import KMeans
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class DataProcessor:
    @staticmethod
    def process(df: pd.DataFrame) -> dict:
        df = DataProcessor._clean_data(df)
        column_types = DataProcessor._classify_columns(df)
        data_quality = DataProcessor._assess_data_quality(df, column_types)
        correlations = DataProcessor._compute_correlations(df, column_types)
        outliers = DataProcessor._detect_outliers(df, column_types)
        kpis = DataProcessor._generate_kpis(df, column_types, data_quality)
        charts = DataProcessor._generate_charts(df, column_types, correlations)
        table = DataProcessor._generate_table(df, column_types)
        preview = df.head(5).fillna("").to_dict(orient="records")
        columns_list = df.columns.tolist()

        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns_list,
            "preview": preview,
            "column_types": column_types,
            "data_quality": data_quality,
            "correlations": correlations,
            "outliers": outliers,
            "kpis": kpis,
            "charts": charts,
            "table": table,
        }

    @staticmethod
    def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df = df.dropna(how="all", axis=0)
        df = df.dropna(how="all", axis=1)
        for col in df.select_dtypes(include=["object"]).columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": "", "None": "", "": np.nan})
        for col in df.columns:
            if df[col].dtype == "object":
                try:
                    converted = pd.to_numeric(df[col].dropna(), errors="raise")
                    if len(converted) > 0:
                        df[col] = pd.to_numeric(df[col], errors="coerce")
                except (ValueError, TypeError):
                    pass
        return df

    @staticmethod
    def _classify_columns(df: pd.DataFrame) -> Dict[str, str]:
        types = {}
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                types[col] = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                types[col] = "datetime"
            else:
                if df[col].dtype == "object":
                    sample = df[col].dropna()
                    if len(sample) > 0:
                        try:
                            pd.to_datetime(sample, infer_datetime_format=True)
                            types[col] = "datetime"
                            df[col] = pd.to_datetime(df[col], errors="coerce")
                            continue
                        except (ValueError, TypeError):
                            pass
                unique_count = df[col].nunique()
                total = len(df[col].dropna())
                ratio = unique_count / total if total > 0 else 0
                if unique_count < 25 or (ratio < 0.05 and total > 100):
                    types[col] = "categorical"
                elif unique_count == total and total > 100:
                    types[col] = "id"
                else:
                    types[col] = "text"
        return types

    @staticmethod
    def _assess_data_quality(df: pd.DataFrame, column_types: Dict[str, str]) -> Dict[str, Any]:
        total_cells = df.shape[0] * df.shape[1]
        quality = {
            "missing_cells": int(df.isna().sum().sum()),
            "total_cells": int(total_cells),
            "missing_percentage": round(float(df.isna().sum().sum() / total_cells * 100) if total_cells > 0 else 0, 2),
            "duplicate_rows": int(df.duplicated().sum()),
            "column_quality": {},
        }
        for col in df.columns:
            missing = int(df[col].isna().sum())
            col_quality = {
                "missing": missing,
                "missing_pct": round(missing / len(df) * 100, 2),
                "dtype": str(df[col].dtype),
                "unique": int(df[col].nunique()),
            }
            if column_types.get(col) == "numeric":
                col_quality["zeros"] = int((df[col] == 0).sum())
                col_quality["negative"] = int((df[col] < 0).sum())
            quality["column_quality"][col] = col_quality
        return quality

    @staticmethod
    def _compute_correlations(df: pd.DataFrame, column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        numeric_cols = [c for c, t in column_types.items() if t == "numeric" and df[c].nunique() > 1]
        if len(numeric_cols) < 2:
            return []
        corr_matrix = df[numeric_cols].corr().round(3)
        correlations = []
        for i in range(len(numeric_cols)):
            for j in range(i + 1, len(numeric_cols)):
                val = corr_matrix.iloc[i, j]
                if not pd.isna(val) and abs(val) > 0.1:
                    correlations.append({
                        "col1": numeric_cols[i],
                        "col2": numeric_cols[j],
                        "value": val,
                        "strength": "strong" if abs(val) > 0.7 else "moderate" if abs(val) > 0.4 else "weak",
                        "direction": "positive" if val > 0 else "negative",
                    })
        correlations.sort(key=lambda x: abs(x["value"]), reverse=True)
        return correlations[:10]

    @staticmethod
    def _detect_outliers(df: pd.DataFrame, column_types: Dict[str, str]) -> Dict[str, Any]:
        outliers = {}
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        for col in numeric_cols[:10]:
            series = df[col].dropna()
            if len(series) < 10:
                continue
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outlier_vals = series[(series < lower) | (series > upper)]
            if len(outlier_vals) > 0:
                outliers[col] = {
                    "count": int(len(outlier_vals)),
                    "percentage": round(len(outlier_vals) / len(series) * 100, 2),
                    "lower_bound": round(float(lower), 2),
                    "upper_bound": round(float(upper), 2),
                    "min_outlier": round(float(outlier_vals.min()), 2),
                    "max_outlier": round(float(outlier_vals.max()), 2),
                }
        return outliers

    @staticmethod
    def _format_number(value: float) -> str:
        if pd.isna(value):
            return "0"
        if abs(value) >= 1_000_000_000:
            return f"{value / 1_000_000_000:.2f}B"
        elif abs(value) >= 1_000_000:
            return f"{value / 1_000_000:.2f}M"
        elif abs(value) >= 1_000:
            return f"{value / 1_000:.2f}K"
        elif value == int(value):
            return f"{int(value):,}"
        return f"{value:.2f}"

    @staticmethod
    def _detect_trend(values: List[float]) -> Tuple[str, float]:
        if len(values) < 3:
            return "neutral", 0
        x = np.arange(len(values))
        y = np.array(values)
        if np.std(y) == 0:
            return "neutral", 0
        slope, _ = np.polyfit(x, y, 1)
        if slope > 0.01 * np.std(y):
            return "up", slope
        elif slope < -0.01 * np.std(y):
            return "down", slope
        return "neutral", slope

    @staticmethod
    def _generate_kpis(df: pd.DataFrame, column_types: Dict[str, str],
                        data_quality: Optional[Dict] = None) -> List[Dict]:
        kpis = []
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        cat_cols = [c for c, t in column_types.items() if t == "categorical"]
        datetime_cols = [c for c, t in column_types.items() if t == "datetime"]

        # 1. Row count KPI
        row_count = len(df)
        kpis.append({
            "label": "Total Records",
            "value": DataProcessor._format_number(row_count),
            "raw_value": row_count,
            "icon": "database",
            "trend": "neutral",
            "severity": "info",
            "change_label": f"{len(df.columns)} columns",
            "format_type": "number",
        })

        # 2. Column count KPI
        kpis.append({
            "label": "Data Fields",
            "value": str(len(df.columns)),
            "raw_value": len(df.columns),
            "icon": "columns",
            "trend": "neutral",
            "severity": "info",
            "subtitle": f"{len(numeric_cols)} numeric / {len(cat_cols)} categorical",
            "format_type": "number",
        })

        # 3. Data Quality Score
        if data_quality:
            missing_pct = data_quality.get("missing_percentage", 0)
            quality_score = max(0, 100 - missing_pct * 2)
            quality_score = min(100, quality_score)
            severity = "positive" if quality_score >= 90 else "warning" if quality_score >= 70 else "negative"
            kpis.append({
                "label": "Data Quality",
                "value": f"{quality_score:.0f}%",
                "raw_value": quality_score,
                "icon": "hash",
                "change": round(quality_score, 1),
                "change_label": f"{missing_pct:.1f}% missing" if missing_pct > 0 else "Complete dataset",
                "trend": "up" if quality_score >= 80 else "down",
                "severity": severity,
                "format_type": "percentage",
            })

        # 4. Detect revenue/financial columns
        revenue_keywords = ["total", "sum", "amount", "price", "revenue", "sales", "cost", "profit", "spend", "value"]
        total_col = None
        for col in numeric_cols:
            col_lower = col.lower().replace("_", " ").replace("-", " ")
            if any(kw in col_lower for kw in revenue_keywords):
                total_col = col
                break
        if total_col:
            series = df[total_col].dropna()
            if len(series) > 0:
                total_val = series.sum()
                mean_val = series.mean()
                is_currency = any(kw in total_col.lower() for kw in ["price", "revenue", "cost", "profit", "amount"])
                kpis.append({
                    "label": f"Total {total_col.replace('_', ' ').title()}",
                    "value": DataProcessor._format_number(total_val),
                    "raw_value": total_val,
                    "icon": "trending-up",
                    "change": round(float(series.std() / mean_val * 100), 1) if mean_val > 0 else 0,
                    "change_label": f"Avg: {DataProcessor._format_number(mean_val)}",
                    "trend": "neutral",
                    "severity": "info",
                    "format_type": "currency" if is_currency else "number",
                })

        # 5. Statistical KPIs from first numeric column
        if numeric_cols and (len(kpis) < 4 or not total_col):
            for col in numeric_cols[:2]:
                series = df[col].dropna()
                if len(series) > 5:
                    col_title = col.replace("_", " ").title()
                    mean_val = series.mean()
                    median_val = series.median()
                    std_val = series.std()
                    cv = round(float(std_val / mean_val * 100), 1) if mean_val != 0 else 0
                    seq_values = series.head(100).tolist()
                    trend_direction, _ = DataProcessor._detect_trend(seq_values)
                    severity = "positive" if cv < 20 else "warning" if cv < 50 else "negative"
                    kpis.append({
                        "label": f"Avg {col_title}",
                        "value": DataProcessor._format_number(mean_val),
                        "raw_value": mean_val,
                        "icon": "hash",
                        "change": cv,
                        "change_label": f"Median: {DataProcessor._format_number(median_val)}",
                        "trend": trend_direction,
                        "severity": severity,
                        "subtitle": f"σ: {DataProcessor._format_number(std_val)}",
                        "format_type": "number",
                        "sparkline_data": series.head(30).tolist(),
                    })

        # 6. Timeline KPI if datetime columns exist
        if datetime_cols and len(kpis) < 6:
            date_col = datetime_cols[0]
            date_series = df[date_col].dropna()
            if len(date_series) > 0:
                date_range = date_series.max() - date_series.min()
                days = date_range.days
                kpis.append({
                    "label": "Date Range",
                    "value": f"{days}d",
                    "raw_value": days,
                    "icon": "calendar",
                    "change_label": f"{date_series.min().strftime('%Y-%m-%d')} \u2192 {date_series.max().strftime('%Y-%m-%d')}",
                    "trend": "neutral",
                    "severity": "info",
                    "format_type": "duration",
                })

        # 7. Top categorical KPI
        if cat_cols and len(kpis) < 6:
            cat_col = cat_cols[0]
            top_val = df[cat_col].mode().iloc[0] if not df[cat_col].mode().empty else "N/A"
            top_count = df[cat_col].value_counts().iloc[0] if not df[cat_col].value_counts().empty else 0
            top_pct = round(top_count / len(df) * 100, 1) if len(df) > 0 else 0
            kpis.append({
                "label": f"Top {cat_col.replace('_', ' ').title()}",
                "value": str(top_val)[:20] + ("..." if len(str(top_val)) > 20 else ""),
                "raw_value": top_count,
                "icon": "hash",
                "change": top_pct,
                "change_label": f"{top_count} occurrences ({top_pct}%)",
                "trend": "neutral",
                "severity": "info",
                "format_type": "number",
            })

        return kpis[:6]

    @staticmethod
    def _get_available_columns(df: pd.DataFrame, column_types: Dict[str, str], chart_type: str) -> Tuple[List[str], List[str]]:
        """Get available x and y columns for a given chart type."""
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        cat_cols = [c for c, t in column_types.items() if t == "categorical"]
        datetime_cols = [c for c, t in column_types.items() if t == "datetime"]
        text_cols = [c for c, t in column_types.items() if t == "text"]
        id_cols = [c for c, t in column_types.items() if t == "id"]

        if chart_type == "pie":
            x_cols = cat_cols + text_cols
            y_cols = numeric_cols
        elif chart_type == "scatter":
            x_cols = numeric_cols
            y_cols = numeric_cols
        elif chart_type == "cluster":
            x_cols = numeric_cols
            y_cols = numeric_cols
        elif chart_type in ("bar", "line", "area"):
            x_cols = cat_cols + datetime_cols + text_cols + id_cols
            y_cols = numeric_cols
        elif chart_type == "histogram":
            x_cols = numeric_cols
            y_cols = numeric_cols
        else:
            x_cols = list(df.columns)
            y_cols = numeric_cols

        return x_cols, y_cols

    @staticmethod
    def _compute_cluster_data(df: pd.DataFrame, x_column: str, y_column: str, n_clusters: int = 3) -> Dict:
        """Compute KMeans cluster data for two numeric columns."""
        data = []
        if not HAS_SKLEARN:
            return {"data": data, "x_key": x_column, "y_keys": [y_column]}

        cluster_df = df[[x_column, y_column]].dropna().head(500)
        if len(cluster_df) < n_clusters * 3:
            return {"data": cluster_df.reset_index(drop=True).to_dict(orient="records"),
                    "x_key": x_column, "y_keys": [y_column]}

        X = cluster_df.values
        kmeans = KMeans(n_clusters=min(n_clusters, len(X)), random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)
        centroids = kmeans.cluster_centers_

        cluster_colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"]
        for i, (_, row) in enumerate(cluster_df.iterrows()):
            label = int(labels[i])
            data.append({
                x_column: float(row[x_column]),
                y_column: float(row[y_column]),
                "cluster": label,
                "cluster_color": cluster_colors[label % len(cluster_colors)],
            })

        # Add centroids
        for i, centroid in enumerate(centroids):
            data.append({
                x_column: float(centroid[0]),
                y_column: float(centroid[1]),
                "cluster": i,
                "cluster_color": "#ffffff",
                "centroid": True,
            })

        return {"data": data, "x_key": x_column, "y_keys": [y_column, "cluster"]}

    @staticmethod
    def compute_chart_data(df: pd.DataFrame, column_types: Dict[str, str],
                           chart_type: str, x_column: str, y_columns: List[str]) -> Dict:
        """Compute chart data for given column selections. Returns a chart dict."""
        default_colors = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"]
        data = []
        x_key = x_column
        y_keys = y_columns

        if chart_type == "pie":
            if y_columns and y_columns[0]:
                y_col = y_columns[0]
                if column_types.get(y_col) == "numeric" and x_column in df.columns:
                    grouped = df.groupby(x_column)[y_col].sum().reset_index()
                else:
                    grouped = df[x_column].value_counts().reset_index()
                    grouped.columns = [x_column, "value"]
            else:
                grouped = df[x_column].value_counts().reset_index()
                grouped.columns = [x_column, "value"]

            grouped = grouped.sort_values("value", ascending=False).head(10)
            data = []
            for _, row in grouped.iterrows():
                data.append({
                    "name": str(row[x_column])[:25],
                    "value": int(row["value"]),
                })
            x_key = "name"
            y_keys = ["value"]

        elif chart_type == "cluster":
            if len(y_columns) >= 1 and x_column in df.columns and y_columns[0] in df.columns:
                result = DataProcessor._compute_cluster_data(df, x_column, y_columns[0])
                data = result["data"]
                x_key = result["x_key"]
                y_keys = result["y_keys"]

        elif chart_type == "scatter":
            if len(y_columns) >= 1 and x_column in df.columns and y_columns[0] in df.columns:
                scatter_df = df[[x_column, y_columns[0]]].dropna().head(500)
                data = scatter_df.reset_index(drop=True).to_dict(orient="records")
                y_keys = [y_columns[0]]

        elif chart_type == "histogram":
            col = x_column
            if col in df.columns and column_types.get(col) == "numeric":
                hist_data = df[col].dropna()
                if len(hist_data) > 0:
                    bins = "auto" if len(hist_data) > 50 else 10
                    counts, bin_edges = np.histogram(hist_data, bins=bins)
                    for i in range(len(counts)):
                        data.append({
                            "range": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}",
                            "frequency": int(counts[i]),
                        })
                    x_key = "range"
                    y_keys = ["frequency"]

        elif chart_type in ("bar", "line", "area"):
            if y_columns:
                y_col = y_columns[0]
                if x_column not in df.columns:
                    data = []
                elif column_types.get(x_column) == "datetime":
                    ts_data = df.set_index(x_column)[y_col].resample("D").mean().dropna().reset_index()
                    ts_data[x_column] = ts_data[x_column].astype(str)
                    data = ts_data.head(200).to_dict(orient="records")
                    y_keys = [y_col]
                elif column_types.get(x_column) == "numeric" and column_types.get(y_col) == "numeric":
                    bins = min(20, df[x_column].nunique())
                    if bins > 1:
                        df_temp = df.copy()
                        df_temp["_bin"] = pd.cut(df_temp[x_column], bins=bins, labels=False)
                        grouped = df_temp.groupby("_bin")[y_col].mean().reset_index()
                        bin_edges = pd.cut(df_temp[x_column], bins=bins).cat.categories
                        grouped[x_column] = [f"{interval.left:.1f}-{interval.right:.1f}" for interval in bin_edges]
                        data = grouped[[x_column, y_col]].to_dict(orient="records")
                        y_keys = [y_col]
                else:
                    grouped = df.groupby(x_column)[y_col].agg(["sum", "mean", "count"]).reset_index()
                    grouped = grouped.sort_values("sum", ascending=False).head(20)
                    grouped.columns = [x_column, "sum", "mean", "count"]
                    grouped[x_column] = grouped[x_column].astype(str).str[:20]
                    data = grouped.fillna(0).to_dict(orient="records")
                    y_keys = ["sum"]

        # Build title
        title_parts = []
        if chart_type == "pie":
            title_parts.append(f"{x_column.replace('_', ' ').title()} Distribution")
        elif chart_type == "scatter":
            title_parts.append(f"{x_column.replace('_', ' ').title()} vs {y_keys[0].replace('_', ' ').title()}")
        elif chart_type == "cluster":
            title_parts.append(f"Cluster: {x_column.replace('_', ' ').title()} vs {y_keys[0].replace('_', ' ').title()}")
        elif chart_type == "histogram":
            title_parts.append(f"Distribution of {x_column.replace('_', ' ').title()}")
        else:
            title_parts.append(f"{y_keys[0].replace('_', ' ').title()} by {x_column.replace('_', ' ').title()}")
        title = " ".join(title_parts)

        # Also attach available columns for the frontend selectors
        x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, chart_type)

        return {
            "type": chart_type,
            "title": title,
            "x_key": x_key,
            "y_keys": y_keys,
            "data": data,
            "colors": default_colors[:max(1, len(y_keys))],
            "description": f"Visualization of {', '.join(y_keys)} by {x_key}",
            "available_x_columns": x_cols,
            "available_y_columns": y_cols,
            "selected_x_column": x_column,
            "selected_y_columns": y_columns,
        }

    @staticmethod
    def _generate_charts(df: pd.DataFrame, column_types: Dict[str, str],
                          correlations: Optional[List[Dict]] = None) -> List[Dict]:
        charts = []
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        cat_cols = [c for c, t in column_types.items() if t == "categorical"]
        datetime_cols = [c for c, t in column_types.items() if t == "datetime"]
        text_cols = [c for c, t in column_types.items() if t == "text"]
        default_colors = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"]

        # 1. Bar chart: categorical vs numeric (aggregated)
        if cat_cols and numeric_cols:
            cat_col = cat_cols[0]
            num_col = numeric_cols[0]
            agg_data = df.groupby(cat_col)[num_col].agg(["sum", "mean", "count"]).reset_index()
            agg_data = agg_data.sort_values("sum", ascending=False).head(15)
            agg_data.columns = [cat_col, "sum", "mean", "count"]
            agg_data[cat_col] = agg_data[cat_col].astype(str).str[:20]
            x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "bar")
            charts.append({
                "type": "bar",
                "title": f"{num_col.replace('_', ' ').title()} by {cat_col.replace('_', ' ').title()}",
                "x_key": cat_col,
                "y_keys": ["sum"],
                "data": agg_data.fillna(0).to_dict(orient="records"),
                "colors": default_colors[:1],
                "description": f"Distribution of {num_col} across {cat_col} categories",
                "available_x_columns": x_cols,
                "available_y_columns": y_cols,
                "selected_x_column": cat_col,
                "selected_y_columns": ["sum"],
            })

        # 2. Time series line chart
        if datetime_cols and numeric_cols:
            date_col = datetime_cols[0]
            num_col = numeric_cols[0]
            ts_data = df.set_index(date_col)[num_col].resample("D").mean().reset_index()
            ts_data = ts_data.dropna()
            if len(ts_data) > 1:
                ts_data.columns = [date_col, num_col]
                ts_data[date_col] = ts_data[date_col].astype(str)
                x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "line")
                charts.append({
                    "type": "line",
                    "title": f"{num_col.replace('_', ' ').title()} Over Time",
                    "x_key": date_col,
                    "y_keys": [num_col],
                    "data": ts_data.to_dict(orient="records"),
                    "colors": default_colors[1:2],
                    "description": f"Trend analysis of {num_col} over time",
                    "available_x_columns": x_cols,
                    "available_y_columns": y_cols,
                    "selected_x_column": date_col,
                    "selected_y_columns": [num_col],
                })

        # 3. Pie chart for categorical distribution
        if cat_cols:
            cat_col = cat_cols[0]
            value_counts = df[cat_col].value_counts().head(8)
            pie_data = []
            other_count = 0
            for i, (label, count) in enumerate(value_counts.items()):
                if i < 7:
                    pie_data.append({
                        "name": str(label)[:25],
                        "value": int(count),
                        "percentage": round(count / len(df) * 100, 1),
                    })
                else:
                    other_count += count
            if other_count > 0:
                pie_data.append({"name": "Other", "value": int(other_count), "percentage": round(other_count / len(df) * 100, 1)})
            x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "pie")
            charts.append({
                "type": "pie",
                "title": f"{cat_col.replace('_', ' ').title()} Distribution",
                "x_key": "name",
                "y_keys": ["value"],
                "data": pie_data,
                "colors": default_colors[:len(pie_data)],
                "description": f"Proportional breakdown of {cat_col} categories",
                "available_x_columns": x_cols,
                "available_y_columns": y_cols,
                "selected_x_column": cat_col,
                "selected_y_columns": ["value"],
            })

        # 4. Area chart for first numeric column
        if numeric_cols and len(charts) < 4:
            num_col = numeric_cols[0]
            sorted_df = df.sort_values(by=numeric_cols[0])
            area_data = sorted_df[[num_col]].head(100).reset_index(drop=True)
            area_data = area_data.reset_index()
            area_data.columns = ["index", num_col]
            x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "area")
            charts.append({
                "type": "area",
                "title": f"{num_col.replace('_', ' ').title()} Trend (First 100)",
                "x_key": "index",
                "y_keys": [num_col],
                "data": area_data.fillna(0).to_dict(orient="records"),
                "colors": default_colors[2:3],
                "description": f"Sequential trend of {num_col}",
                "available_x_columns": x_cols,
                "available_y_columns": y_cols,
                "selected_x_column": "index",
                "selected_y_columns": [num_col],
            })

        # 5. Scatter chart with correlation info
        if len(numeric_cols) >= 2 and len(charts) < 5:
            num1, num2 = numeric_cols[0], numeric_cols[1]
            scatter_data = df[[num1, num2]].dropna().head(200)
            scatter_data = scatter_data.reset_index(drop=True)
            corr_info = ""
            if correlations:
                for c in correlations:
                    if c["col1"] == num1 and c["col2"] == num2:
                        corr_info = f" (r = {c['value']:.2f}, {c['strength']} {c['direction']})"
                        break
            x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "scatter")
            charts.append({
                "type": "scatter",
                "title": f"{num1.title()} vs {num2.title()}",
                "x_key": num1,
                "y_keys": [num2],
                "data": scatter_data.to_dict(orient="records"),
                "colors": default_colors[:1],
                "description": f"Correlation between {num1} and {num2}{corr_info}",
                "available_x_columns": x_cols,
                "available_y_columns": y_cols,
                "selected_x_column": num1,
                "selected_y_columns": [num2],
            })

        # 6. Cluster chart (if sklearn available)
        if len(numeric_cols) >= 2 and len(charts) < 6 and HAS_SKLEARN:
            num1, num2 = numeric_cols[0], numeric_cols[1]
            result = DataProcessor._compute_cluster_data(df, num1, num2)
            if result["data"]:
                x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "cluster")
                charts.append({
                    "type": "cluster",
                    "title": f"Cluster: {num1.title()} vs {num2.title()}",
                    "x_key": num1,
                    "y_keys": [num2, "cluster"],
                    "data": result["data"],
                    "colors": default_colors,
                    "description": f"KMeans clustering of {num1} and {num2}",
                    "available_x_columns": x_cols,
                    "available_y_columns": y_cols,
                    "selected_x_column": num1,
                    "selected_y_columns": [num2],
                })

        # 7. Histogram with auto bins
        if numeric_cols and len(charts) < 6:
            num_col = numeric_cols[0]
            hist_data = df[num_col].dropna()
            if len(hist_data) > 0:
                bins = "auto" if len(hist_data) > 50 else 10
                counts, bin_edges = np.histogram(hist_data, bins=bins)
                hist_rows = []
                for i in range(len(counts)):
                    hist_rows.append({
                        "range": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}",
                        "frequency": int(counts[i]),
                        "density": round(float(counts[i] / len(hist_data) * 100), 2),
                    })
                x_cols, y_cols = DataProcessor._get_available_columns(df, column_types, "histogram")
                charts.append({
                    "type": "histogram",
                    "title": f"Distribution of {num_col.replace('_', ' ').title()}",
                    "x_key": "range",
                    "y_keys": ["frequency"],
                    "data": hist_rows,
                    "colors": default_colors[4:5],
                    "description": f"Frequency distribution with {len(hist_rows)} bins",
                    "available_x_columns": x_cols,
                    "available_y_columns": y_cols,
                    "selected_x_column": num_col,
                    "selected_y_columns": ["frequency"],
                })

        return charts[:6]

    @staticmethod
    def _generate_table(df: pd.DataFrame, column_types: Optional[Dict] = None) -> Dict:
        rows = df.head(100).fillna("").to_dict(orient="records")
        for row in rows:
            for k, v in row.items():
                if isinstance(v, float) and v == int(v):
                    row[k] = int(v)
        result = {
            "columns": df.columns.tolist(),
            "rows": rows,
            "total_rows": len(df),
        }
        if column_types:
            result["column_types"] = column_types
            summary = {}
            numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) > 0:
                    summary[col] = {
                        "min": float(series.min()),
                        "max": float(series.max()),
                        "mean": float(series.mean()),
                        "median": float(series.median()),
                        "std": float(series.std()),
                    }
            if summary:
                result["summary_stats"] = summary
        return result

    @staticmethod
    def get_summary(df: pd.DataFrame, column_types: Dict[str, str]) -> Dict:
        summary = {
            "columns": df.columns.tolist(),
            "column_types": column_types,
            "row_count": len(df),
            "numeric_stats": {},
            "categorical_top": {},
            "correlations": DataProcessor._compute_correlations(df, column_types),
            "outliers": DataProcessor._detect_outliers(df, column_types),
            "data_quality": DataProcessor._assess_data_quality(df, column_types),
        }

        for col, dtype in column_types.items():
            if dtype == "numeric":
                series = df[col].dropna()
                if len(series) > 0:
                    summary["numeric_stats"][col] = {
                        "mean": float(series.mean()),
                        "std": float(series.std()),
                        "min": float(series.min()),
                        "max": float(series.max()),
                        "median": float(series.median()),
                        "count": int(len(series)),
                        "skew": float(series.skew()),
                        "kurtosis": float(series.kurtosis()),
                        "q1": float(series.quantile(0.25)),
                        "q3": float(series.quantile(0.75)),
                        "percentile_90": float(series.quantile(0.90)),
                        "percentile_95": float(series.quantile(0.95)),
                    }
            elif dtype == "categorical":
                top_vals = df[col].value_counts().head(5).to_dict()
                summary["categorical_top"][col] = {
                    str(k): int(v) for k, v in top_vals.items()
                }

        return summary