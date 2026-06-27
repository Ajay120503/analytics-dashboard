import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def generate_insights(df_summary: dict) -> str:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "your_key_here":
        return _generate_fallback_insights(df_summary)

    prompt = _build_prompt(df_summary)

    try:
        response = requests.post(
            f"{GEMINI_API_ENDPOINT}?key={api_key}",
            headers={
                "content-type": "application/json",
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": 1024,
                    "temperature": 0.3,
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        # Parse Gemini response
        candidates = data.get("candidates", [])
        if candidates:
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if parts:
                text = parts[0].get("text", "")
                if text:
                    return text

        return _generate_fallback_insights(df_summary)
    except Exception as e:
        print(f"AI insights API call failed: {str(e)}")
        return _generate_fallback_insights(df_summary)


def _safe_num(val, fmt=".2f"):
    """Safely format a numeric value, returning 'N/A' if it's not a number."""
    if val is None:
        return "N/A"
    if isinstance(val, (int, float)):
        return f"{val:{fmt}}"
    try:
        return f"{float(val):{fmt}}"
    except (ValueError, TypeError):
        return str(val)


def _build_prompt(summary: dict) -> str:
    lines = []
    lines.append("You are a data analyst. Analyze the following dataset summary and provide 5-7 bullet point insights.")
    lines.append("The insights should cover trends, anomalies, correlations, recommendations, and key findings.")
    lines.append("Be specific and data-driven. Use numbers from the summary.")
    lines.append("")
    lines.append(f"Dataset Overview:")
    lines.append(f"- Total rows: {summary.get('row_count', 'N/A')}")
    lines.append(f"- Total columns: {len(summary.get('columns', []))}")
    lines.append(f"- Column names: {', '.join(summary.get('columns', []))}")
    lines.append(f"- Column types: {json.dumps(summary.get('column_types', {}), indent=2)}")
    lines.append("")

    numeric_stats = summary.get("numeric_stats", {})
    if numeric_stats:
        lines.append("Numeric Column Statistics:")
        for col, stats in numeric_stats.items():
            lines.append(
                f"  - {col}: mean={_safe_num(stats.get('mean'))}, "
                f"std={_safe_num(stats.get('std'))}, "
                f"min={_safe_num(stats.get('min'))}, "
                f"max={_safe_num(stats.get('max'))}, "
                f"median={_safe_num(stats.get('median'))}, "
                f"count={_safe_num(stats.get('count'), 'd')}"
            )
        lines.append("")

    cat_top = summary.get("categorical_top", {})
    if cat_top:
        lines.append("Categorical Column Top Values:")
        for col, top_vals in cat_top.items():
            vals_str = ", ".join([f"{k}: {v}" for k, v in list(top_vals.items())[:5]])
            lines.append(f"  - {col}: {vals_str}")
        lines.append("")

    lines.append("Provide 5-7 bullet point insights about trends, anomalies, correlations, and recommendations.")
    lines.append("Start directly with the bullet points. Use '-' for bullets.")

    return "\n".join(lines)


def _generate_fallback_insights(summary: dict) -> str:
    insights = []
    row_count = summary.get("row_count", 0)
    col_count = len(summary.get("columns", []))
    column_types = summary.get("column_types", {})

    insights.append("📊 **Dataset Overview**")
    insights.append(f"- This dataset contains **{row_count:,} rows** and **{col_count} columns**.")
    insights.append(f"- Column types: {len([c for c, t in column_types.items() if t == 'numeric'])} numeric, "
                    f"{len([c for c, t in column_types.items() if t == 'categorical'])} categorical, "
                    f"{len([c for c, t in column_types.items() if t == 'datetime'])} datetime, "
                    f"{len([c for c, t in column_types.items() if t == 'text'])} text fields.")

    # Data Quality
    dq = summary.get("data_quality", {})
    if dq:
        missing_pct = dq.get("missing_percentage", 0)
        dup_rows = dq.get("duplicate_rows", 0)
        quality_score = max(0, 100 - missing_pct * 2)
        insights.append("")
        insights.append("🔍 **Data Quality Assessment**")
        insights.append(f"- **Data Quality Score**: {quality_score:.0f}% {'✅ Good' if quality_score >= 80 else '⚠️ Needs attention'}")
        if missing_pct > 0:
            insights.append(f"- **Missing Data**: {missing_pct:.1f}% of cells are empty ({dq.get('missing_cells', 0)} cells)")
        else:
            insights.append("- **Completeness**: Dataset is 100% complete — no missing values!")
        if dup_rows > 0:
            insights.append(f"- **Duplicate Rows**: {dup_rows} duplicate rows detected ({round(dup_rows/row_count*100, 1)}%)")
        else:
            insights.append("- **Uniqueness**: No duplicate rows found")

    # Numeric Statistics
    numeric_stats = summary.get("numeric_stats", {})
    if numeric_stats:
        insights.append("")
        insights.append("📈 **Key Numeric Findings**")
        for col, stats in list(numeric_stats.items())[:4]:
            mean_val = stats.get("mean", 0)
            med_val = stats.get("median", 0)
            min_val = stats.get("min", 0)
            max_val = stats.get("max", 0)
            std_val = stats.get("std", 0)
            skew_val = stats.get("skew", 0)
            cv = (std_val / abs(mean_val) * 100) if mean_val != 0 else 0

            skew_desc = "symmetrical" if abs(skew_val) < 0.5 else "right-skewed" if skew_val > 0 else "left-skewed"
            if mean_val != med_val:
                dist_note = f" (mean vs median diff: {abs(mean_val - med_val):.1f}, distribution is {skew_desc})"
            else:
                dist_note = ""

            insights.append(
                f"- **{col}**: Range [{_safe_num(min_val, '.2f')} — {_safe_num(max_val, '.2f')}], "
                f"Mean: {_safe_num(mean_val, '.2f')}, Median: {_safe_num(med_val, '.2f')}, "
                f"Std Dev: {_safe_num(std_val, '.2f')} (CV: {cv:.1f}%){dist_note}"
            )

    # Correlations
    correlations = summary.get("correlations", [])
    if correlations:
        insights.append("")
        insights.append("🔗 **Correlation Analysis**")
        for corr in correlations[:4]:
            emoji = "✅" if abs(corr["value"]) > 0.7 else "📊"
            insights.append(
                f"- {emoji} **{corr['col1']}** & **{corr['col2']}**: "
                f"r = {corr['value']:.2f} ({corr['strength']} {corr['direction']} correlation)"
            )

    # Outliers
    outliers = summary.get("outliers", {})
    if outliers:
        insights.append("")
        insights.append("⚠️ **Outlier Detection**")
        for col, odata in list(outliers.items())[:3]:
            insights.append(
                f"- **{col}**: {odata['count']} outliers ({odata['percentage']:.1f}%) detected "
                f"[bounds: {odata['lower_bound']} — {odata['upper_bound']}]"
            )

    # Categorical Distributions
    cat_top = summary.get("categorical_top", {})
    if cat_top:
        insights.append("")
        insights.append("🏷️ **Categorical Distributions**")
        for col, top_vals in list(cat_top.items())[:3]:
            total_count = sum(top_vals.values())
            top_item = list(top_vals.items())[0] if top_vals else ("N/A", 0)
            top_pct = round(top_item[1] / total_count * 100, 1) if total_count > 0 else 0
            insights.append(
                f"- **{col}**: Most common: '{top_item[0]}' ({top_pct}% of entries, "
                f"{top_item[1]} out of {total_count})"
            )

    insights.append("")
    insights.append("💡 **Recommendations**")
    if numeric_stats:
        # Find columns with high variability
        high_var = [(c, s) for c, s in numeric_stats.items() 
                    if s.get("std", 0) / abs(s.get("mean", 1)) > 0.5]
        if high_var:
            insights.append(f"- **High variability**: Consider investigating {' and '.join([c for c, _ in high_var[:2]])} for potential segmentation")
    if correlations:
        strong_corrs = [c for c in correlations if abs(c["value"]) > 0.7]
        if strong_corrs:
            pairs = [f"'{c['col1']}' & '{c['col2']}'" for c in strong_corrs[:2]]
            insights.append(f"- **Strong correlations** detected between {', '.join(pairs)} — consider feature reduction")
    if outliers:
        insights.append(f"- **Outliers** found in {len(outliers)} numeric fields — review data entry processes")
    insights.append("- Upload additional datasets to enrich cross-dataset analysis")
    insights.append("- Try different file formats for more comprehensive parsing")

    return "\n".join(insights)
