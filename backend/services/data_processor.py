import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple


class DataProcessor:
    @staticmethod
    def process(df: pd.DataFrame) -> dict:
        df = DataProcessor._clean_data(df)
        column_types = DataProcessor._classify_columns(df)
        kpis = DataProcessor._generate_kpis(df, column_types)
        charts = DataProcessor._generate_charts(df, column_types)
        table = DataProcessor._generate_table(df)
        preview = df.head(5).fillna("").to_dict(orient="records")
        columns_list = df.columns.tolist()

        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns_list,
            "preview": preview,
            "column_types": column_types,
            "kpis": kpis,
            "charts": charts,
            "table": table,
        }

    @staticmethod
    def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        # Drop fully empty rows and columns
        df = df.dropna(how="all", axis=0)
        df = df.dropna(how="all", axis=1)
        # Strip string whitespace
        for col in df.select_dtypes(include=["object"]).columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": "", "None": "", "": np.nan})
        # Try to infer better dtypes
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
                # Check if can be datetime
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
                # Check cardinality
                if df[col].nunique() < 20:
                    types[col] = "categorical"
                else:
                    types[col] = "text"
        return types

    @staticmethod
    def _format_number(value: float) -> str:
        if pd.isna(value):
            return "0"
        if abs(value) >= 1_000_000_000:
            return f"{value / 1_000_000_000:.1f}B"
        elif abs(value) >= 1_000_000:
            return f"{value / 1_000_000:.1f}M"
        elif abs(value) >= 1_000:
            return f"{value / 1_000:.1f}K"
        elif value == int(value):
            return f"{int(value):,}"
        return f"{value:.2f}"

    @staticmethod
    def _generate_kpis(df: pd.DataFrame, column_types: Dict[str, str]) -> List[Dict]:
        kpis = []
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]

        for col in numeric_cols[:6]:
            series = df[col].dropna()
            if len(series) == 0:
                continue
            mean_val = series.mean()
            std_val = series.std()
            total = series.sum()
            trend_pct = round((std_val / abs(mean_val) * 100) if mean_val != 0 else 0, 1)
            icon = "trending-up" if trend_pct >= 0 else "trending-down"

            kpis.append({
                "label": f"Total {col.replace('_', ' ').title()}",
                "value": DataProcessor._format_number(total),
                "change": trend_pct,
                "change_label": f"{trend_pct}% variability",
                "icon": icon,
            })

            if len(kpis) >= 4:
                break

        # Fill with row count if not enough numeric columns
        if len(kpis) < 4:
            kpis.append({
                "label": "Total Rows",
                "value": DataProcessor._format_number(len(df)),
                "change": 0,
                "change_label": "dataset size",
                "icon": "database",
            })

        if len(kpis) < 4:
            kpis.append({
                "label": "Columns",
                "value": str(len(df.columns)),
                "change": 0,
                "change_label": "features",
                "icon": "columns",
            })

        if len(kpis) < 4:
            cat_cols = [c for c, t in column_types.items() if t == "categorical"]
            if cat_cols:
                top_cat = df[cat_cols[0]].dropna().value_counts()
                if len(top_cat) > 0:
                    kpis.append({
                        "label": f"Top {cat_cols[0].title()}",
                        "value": top_cat.index[0],
                        "change": top_cat.iloc[0],
                        "change_label": "count",
                        "icon": "hash",
                    })

        return kpis[:4]

    @staticmethod
    def _generate_charts(df: pd.DataFrame, column_types: Dict[str, str]) -> List[Dict]:
        charts = []
        numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
        cat_cols = [c for c, t in column_types.items() if t == "categorical"]
        datetime_cols = [c for c, t in column_types.items() if t == "datetime"]
        default_colors = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"]

        # 1. Bar chart: top categorical vs top numeric
        if cat_cols and numeric_cols:
            cat_col = cat_cols[0]
            num_col = numeric_cols[0]
            top_data = (
                df.groupby(cat_col)[num_col]
                .sum()
                .sort_values(ascending=False)
                .head(10)
                .reset_index()
            )
            top_data.columns = [cat_col, num_col]
            charts.append({
                "type": "bar",
                "title": f"{num_col.replace('_', ' ').title()} by {cat_col.title()}",
                "x_key": cat_col,
                "y_keys": [num_col],
                "data": top_data.fillna(0).to_dict(orient="records"),
                "colors": default_colors[:2],
            })

        # 2. Line chart: datetime vs numeric
        if datetime_cols and numeric_cols:
            dt_col = datetime_cols[0]
            num_col = numeric_cols[0] if len(numeric_cols) > 0 else numeric_cols[0]
            time_data = (
                df.groupby(pd.Grouper(key=dt_col, freq="D"))[num_col]
                .sum()
                .reset_index()
                .head(50)
            )
            time_data.columns = [dt_col, num_col]
            time_data[dt_col] = time_data[dt_col].astype(str)
            charts.append({
                "type": "line",
                "title": f"{num_col.replace('_', ' ').title()} Over Time",
                "x_key": dt_col,
                "y_keys": [num_col],
                "data": time_data.fillna(0).to_dict(orient="records"),
                "colors": default_colors[1:2],
            })

        # 3. Pie chart: categorical distribution
        if cat_cols:
            cat_col = cat_cols[0]
            pie_data = (
                df[cat_col]
                .value_counts()
                .head(8)
                .reset_index()
            )
            pie_data.columns = [cat_col, "count"]
            charts.append({
                "type": "pie",
                "title": f"Distribution of {cat_col.title()}",
                "x_key": cat_col,
                "y_keys": ["count"],
                "data": pie_data.to_dict(orient="records"),
                "colors": default_colors,
            })

        # 4. Area chart: second numeric over index or datetime
        if len(numeric_cols) >= 2:
            num_col = numeric_cols[1]
            if datetime_cols:
                dt_col = datetime_cols[0]
                area_data = (
                    df.groupby(pd.Grouper(key=dt_col, freq="D"))[num_col]
                    .sum()
                    .reset_index()
                    .head(50)
                )
                area_data.columns = [dt_col, num_col]
                area_data[dt_col] = area_data[dt_col].astype(str)
            else:
                area_data = df[[num_col]].head(100).reset_index()
                area_data.columns = ["index", num_col]
            charts.append({
                "type": "area",
                "title": f"{num_col.replace('_', ' ').title()} Trend",
                "x_key": list(area_data.columns)[0],
                "y_keys": [num_col],
                "data": area_data.fillna(0).to_dict(orient="records"),
                "colors": default_colors[2:3],
            })

        # 5. Scatter chart: two numeric columns
        if len(numeric_cols) >= 2:
            num1, num2 = numeric_cols[0], numeric_cols[1]
            scatter_data = df[[num1, num2]].dropna().head(100)
            scatter_data = scatter_data.reset_index(drop=True)
            charts.append({
                "type": "scatter",
                "title": f"{num1.title()} vs {num2.title()}",
                "x_key": num1,
                "y_keys": [num2],
                "data": scatter_data.to_dict(orient="records"),
                "colors": default_colors[:1],
            })

        # 6. Histogram
        if numeric_cols:
            num_col = numeric_cols[0]
            hist_data = df[num_col].dropna()
            if len(hist_data) > 0:
                counts, bins = np.histogram(hist_data, bins=10)
                hist_rows = []
                for i in range(len(counts)):
                    hist_rows.append({
                        "range": f"{bins[i]:.1f}-{bins[i+1]:.1f}",
                        "frequency": int(counts[i]),
                    })
                charts.append({
                    "type": "histogram",
                    "title": f"Distribution of {num_col.replace('_', ' ').title()}",
                    "x_key": "range",
                    "y_keys": ["frequency"],
                    "data": hist_rows,
                    "colors": default_colors[4:5],
                })

        return charts

    @staticmethod
    def _generate_table(df: pd.DataFrame) -> Dict:
        rows = df.head(100).fillna("").to_dict(orient="records")
        for row in rows:
            for k, v in row.items():
                if isinstance(v, float) and v == int(v):
                    row[k] = int(v)
        return {
            "columns": df.columns.tolist(),
            "rows": rows,
            "total_rows": len(df),
        }

    @staticmethod
    def get_summary(df: pd.DataFrame, column_types: Dict[str, str]) -> Dict:
        summary = {
            "columns": df.columns.tolist(),
            "column_types": column_types,
            "row_count": len(df),
            "numeric_stats": {},
            "categorical_top": {},
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
                    }
            elif dtype == "categorical":
                top_vals = df[col].value_counts().head(5).to_dict()
                summary["categorical_top"][col] = {
                    str(k): int(v) for k, v in top_vals.items()
                }

        return summary