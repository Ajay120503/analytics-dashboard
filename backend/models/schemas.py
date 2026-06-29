from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class KPI(BaseModel):
    label: str
    value: str
    raw_value: Optional[float] = None
    change: Optional[float] = None
    change_label: Optional[str] = None
    icon: str = "trending-up"
    trend: Optional[str] = None  # "up", "down", "neutral"
    severity: Optional[str] = None  # "positive", "negative", "warning", "info"
    subtitle: Optional[str] = None
    sparkline_data: Optional[List[float]] = None
    percentage: Optional[float] = None
    format_type: Optional[str] = "number"  # number, currency, percentage, duration


class ChartData(BaseModel):
    type: str  # bar, line, pie, scatter, area, histogram, heatmap, radar
    title: str
    x_key: str
    y_keys: List[str]
    data: List[Dict[str, Any]]
    colors: List[str] = []
    description: Optional[str] = None
    annotations: Optional[List[Dict[str, Any]]] = None
    # Available columns for dynamic selection
    available_x_columns: List[str] = []
    available_y_columns: List[str] = []
    # Current selections (may differ from original x_key/y_keys after user changes)
    selected_x_column: Optional[str] = None
    selected_y_columns: Optional[List[str]] = None


class TableData(BaseModel):
    columns: List[str]
    column_types: Dict[str, str] = {}
    rows: List[Dict[str, Any]]
    total_rows: int
    summary_stats: Optional[Dict[str, Any]] = None


class DashboardData(BaseModel):
    file_id: str
    filename: str
    row_count: int
    column_count: int
    columns: List[str]
    preview: List[Dict[str, Any]]
    status: str
    kpis: List[KPI]
    charts: List[ChartData]
    table: TableData
    insights: str
    column_types: Dict[str, str]
    data_quality: Optional[Dict[str, Any]] = None
    correlations: Optional[List[Dict[str, Any]]] = None
    outliers: Optional[Dict[str, Any]] = None


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    row_count: int
    column_count: int
    columns: List[str]
    preview: List[Dict[str, Any]]
    status: str


class RefreshRequest(BaseModel):
    column_stats: Dict[str, Any]


class RefreshResponse(BaseModel):
    insights: str


class ChartUpdateRequest(BaseModel):
    file_id: str
    chart_index: int
    chart_type: str
    x_column: str
    y_columns: List[str]


class ChartUpdateResponse(BaseModel):
    chart: ChartData