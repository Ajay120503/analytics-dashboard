"""
Script to generate sample data files (Excel file needs openpyxl)
Run: cd analytics-dashboard/sample_data && python generate_samples.py
"""

import pandas as pd
import json

# ---- employee_data.xlsx ----
employee_data = {
    "employee_id": [f"EMP{i:04d}" for i in range(1, 151)],
    "name": [
        f"Employee {i}" for i in range(1, 151)
    ],
    "department": [
        ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Support"][i % 7]
        for i in range(150)
    ],
    "salary": [
        [75000, 62000, 85000, 55000, 92000, 68000, 48000][i % 7] + (i * 137 % 25000)
        for i in range(150)
    ],
    "join_date": [
        f"20{20 + i % 5}-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"
        for i in range(150)
    ],
    "performance_score": [
        round(3.0 + (i * 7 % 30) / 10, 1)
        for i in range(150)
    ],
    "country": [
        ["USA", "India", "UK", "Germany", "Canada", "Australia", "France"][i % 7]
        for i in range(150)
    ],
}

df_emp = pd.DataFrame(employee_data)
df_emp.to_excel("employee_data.xlsx", index=False, sheet_name="Employees")
print("Created employee_data.xlsx with 150 rows")

# ---- web_traffic.json ----
traffic_data = []
sources = ["Google", "Direct", "Social Media", "Email", "Referral", "Organic Search"]
pages = ["/home", "/products", "/pricing", "/blog", "/docs", "/about", "/contact"]

for i in range(100):
    timestamp = f"2024-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}T{(i % 24):02d}:00:00Z"
    sessions = 500 + (i * 23 % 2000)
    bounce_rate = round(20 + (i * 17 % 60), 1)
    avg_duration = round(60 + (i * 31 % 300), 0)
    conversions = int(sessions * (2 + i * 7 % 15) / 100)

    traffic_data.append({
        "timestamp": timestamp,
        "page": pages[i % len(pages)],
        "sessions": sessions,
        "bounce_rate": bounce_rate,
        "avg_duration": avg_duration,
        "conversions": conversions,
        "source": sources[i % len(sources)],
    })

with open("web_traffic.json", "w") as f:
    json.dump(traffic_data, f, indent=2)

print(f"Created web_traffic.json with {len(traffic_data)} rows")
print("Done!")