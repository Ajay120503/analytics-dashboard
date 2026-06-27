import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import DashboardData
from services.file_parser import FileParser
from services.data_processor import DataProcessor
from services.ai_insights import generate_insights
from services.data_store import data_store
from utils.helpers import get_temp_path, clean_temp_file

router = APIRouter()


def _compute_custom_kpi(df, col, agg, label):
    """Compute a single custom KPI value from the dataframe."""
    series = df[col].dropna()
    if len(series) == 0:
        return None

    # Detect column type
    is_numeric = series.dtype.kind in ("i", "u", "f", "c")

    # Validate aggregation against column type
    safe_agg = agg
    if not is_numeric:
        if agg != "count":
            safe_agg = "count"

    agg_fn = {
        "sum": series.sum, "mean": series.mean, "median": series.median,
        "min": series.min, "max": series.max, "count": series.count, "std": series.std,
    }

    raw_val = agg_fn.get(safe_agg, series.count)()
    if hasattr(raw_val, "item"):
        raw_val = float(raw_val)
    elif isinstance(raw_val, (int, float)):
        raw_val = float(raw_val)
    else:
        raw_val = float(len(series))

    value = DataProcessor._format_number(raw_val) if safe_agg != "count" else str(int(raw_val))

    icons = {
        "sum": "trending-up", "mean": "hash", "median": "hash",
        "min": "trending-down", "max": "trending-up", "count": "database", "std": "hash",
    }

    try:
        std_val = float(series.std()) if is_numeric else 0.0
    except Exception:
        std_val = 0.0
    cv = round(std_val / raw_val * 100, 1) if raw_val != 0 else 0

    is_curr = any(kw in col.lower() for kw in ["price", "revenue", "cost", "profit", "amount", "sales"])
    change_label = f"{safe_agg.title()} of {col.replace(chr(95), chr(32)).title()}"
    if safe_agg != agg:
        change_label += f" (auto-fallback from {agg})"

    sparkline = series.head(30).tolist() if is_numeric else None

    return {
        "label": label, "value": value, "raw_value": raw_val,
        "icon": icons.get(safe_agg, "hash"), "trend": "neutral",
        "severity": "info" if cv < 30 else "warning" if cv < 60 else "negative",
        "change": cv, "format_type": "currency" if is_curr else "number",
        "change_label": change_label,
        "subtitle": f"n={int(len(series))}",
        "sparkline_data": sparkline,
    }


@router.post("/api/upload", response_model=DashboardData)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    temp_path = get_temp_path(file_id, file.filename)
    try:
        content = await file.read()
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(content)
        parser = FileParser()
        df = parser.parse(temp_path, ext)
        processor = DataProcessor()
        processed = processor.process(df)
        data_store.store(file_id, df, processed["column_types"])
        column_types = processed["column_types"]
        df_summary = processor.get_summary(df, column_types)
        insights = generate_insights(df_summary)
        dashboard_data = DashboardData(
            file_id=file_id, filename=file.filename,
            row_count=processed["row_count"], column_count=processed["column_count"],
            columns=processed["columns"], preview=processed["preview"],
            status="success", kpis=processed["kpis"], charts=processed["charts"],
            table=processed["table"], insights=insights,
            column_types=column_types,
            data_quality=processed.get("data_quality"),
            correlations=processed.get("correlations"),
            outliers=processed.get("outliers"),
        )
        return dashboard_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        clean_temp_file(temp_path)


@router.post("/api/dashboard/regenerate", response_model=DashboardData)
async def regenerate_dashboard(request: dict):
    try:
        file_id = request.get("file_id")
        filename = request.get("filename", "unknown")
        kpi_sel = request.get("kpi_selections", {})

        if not file_id:
            raise HTTPException(status_code=400, detail="Missing file_id in request")

        stored = data_store.get(file_id)
        if not stored:
            raise HTTPException(
                status_code=404,
                detail="Session expired or file data not found. Please re-upload your file.",
            )

        df = stored["df"]
        column_types = stored["column_types"]
        processor = DataProcessor()
        processed = processor.process(df)
        all_kpis = processed["kpis"]
        included = kpi_sel.get("included_labels", [])
        custom_configs = kpi_sel.get("custom_kpis", [])
        edited_configs = kpi_sel.get("edited_kpis", [])

        # Build lookup for edited KPIs by original_label (with safety)
        edited_by_orig = {}
        for e in edited_configs:
            if isinstance(e, dict) and "original_label" in e:
                edited_by_orig[e["original_label"]] = e

        # Filter and potentially replace auto-detected KPIs
        result_kpis = []
        for kpi in all_kpis:
            if kpi["label"] not in included:
                continue
            # Check if this KPI has an edit override
            if kpi["label"] in edited_by_orig:
                edit = edited_by_orig[kpi["label"]]
                new_label = edit.get("new_label", kpi["label"]) or kpi["label"]
                col = edit.get("column", "")
                agg = edit.get("aggregation", "sum")
                if col and col in df.columns:
                    custom = _compute_custom_kpi(df, col, agg, new_label)
                    if custom:
                        result_kpis.append(custom)
                        continue
            # Keep original if no edit
            result_kpis.append(kpi)

        # Add custom KPIs (new user-defined ones)
        for cfg in custom_configs:
            if not isinstance(cfg, dict):
                continue
            label = cfg.get("label", "Custom KPI")
            col = cfg.get("column", "")
            agg = cfg.get("aggregation", "sum")
            if col and col in df.columns:
                custom = _compute_custom_kpi(df, col, agg, label)
                if custom:
                    result_kpis.append(custom)

        dashboard_data = DashboardData(
            file_id=file_id, filename=filename,
            row_count=processed["row_count"], column_count=processed["column_count"],
            columns=processed["columns"], preview=processed["preview"],
            status="success", kpis=result_kpis, charts=processed["charts"],
            table=processed["table"], insights="",
            column_types=column_types,
            data_quality=processed.get("data_quality"),
            correlations=processed.get("correlations"),
            outliers=processed.get("outliers"),
        )
        return dashboard_data

    except HTTPException:
        raise
    except Exception as e:
        # Log the error for debugging
        import traceback
        error_detail = f"Regeneration failed: {str(e)}"
        print(f"ERROR: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)
