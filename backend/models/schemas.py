from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class KPI(BaseModel):
    label: str
    value: str
    change: Optional[float] = None
    change_label: Optional[str] = None
    icon: str = "trending-up"


class ChartData(BaseModel):
    type: str  # bar, line, pie, scatter, area, histogram
    title: str
    x_key: str
    y_keys: List[str]
    data: List[Dict[str, Any]]
    colors: List[str] = []


class TableData(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int


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