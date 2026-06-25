from fastapi import APIRouter
from models.schemas import RefreshRequest, RefreshResponse
from services.ai_insights import generate_insights

router = APIRouter()


@router.post("/api/insights/refresh", response_model=RefreshResponse)
async def refresh_insights(request: RefreshRequest):
    insights = generate_insights(request.column_stats)
    return RefreshResponse(insights=insights)