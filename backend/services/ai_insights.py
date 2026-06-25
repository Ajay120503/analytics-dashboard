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
                f"  - {col}: mean={stats.get('mean', 'N/A'):.2f}, "
                f"std={stats.get('std', 'N/A'):.2f}, "
                f"min={stats.get('min', 'N/A')}, "
                f"max={stats.get('max', 'N/A')}, "
                f"median={stats.get('median', 'N/A')}, "
                f"count={stats.get('count', 'N/A')}"
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
    insights.append("📊 **Dataset Overview**")
    insights.append(f"- This dataset contains **{summary.get('row_count', 0)} rows** and **{len(summary.get('columns', []))} columns**.")

    numeric_stats = summary.get("numeric_stats", {})
    if numeric_stats:
        insights.append("")
        insights.append("📈 **Key Numeric Findings**")
        for col, stats in list(numeric_stats.items())[:3]:
            insights.append(
                f"- **{col}**: Ranges from {stats.get('min', 'N/A')} to {stats.get('max', 'N/A')} "
                f"(median: {stats.get('median', 'N/A'):.1f}, mean: {stats.get('mean', 'N/A'):.1f})"
            )

    cat_top = summary.get("categorical_top", {})
    if cat_top:
        insights.append("")
        insights.append("🏷️ **Categorical Distributions**")
        for col, top_vals in list(cat_top.items())[:2]:
            top_item = list(top_vals.items())[0] if top_vals else ("N/A", 0)
            insights.append(f"- **{col}**: Most common value is '{top_item[0]}' with {top_item[1]} occurrences")

    insights.append("")
    insights.append("💡 **Recommendations**")
    insights.append("- Explore correlations between numeric columns for deeper insights")
    insights.append("- Consider filtering data by categorical segments for more granular analysis")
    insights.append("- Upload additional datasets to enrich your analysis")

    return "\n".join(insights)