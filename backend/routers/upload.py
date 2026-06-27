import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import DashboardData
from services.file_parser import FileParser
from services.data_processor import DataProcessor
from services.ai_insights import generate_insights
from utils.helpers import get_temp_path, clean_temp_file

router = APIRouter()


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

        # Parse
        parser = FileParser()
        df = parser.parse(temp_path, ext)

        # Process
        processor = DataProcessor()
        processed = processor.process(df)

        # Get summary for AI
        column_types = processed["column_types"]
        df_summary = processor.get_summary(df, column_types)

        # Generate insights
        insights = generate_insights(df_summary)

        # Build response
        dashboard_data = DashboardData(
            file_id=file_id,
            filename=file.filename,
            row_count=processed["row_count"],
            column_count=processed["column_count"],
            columns=processed["columns"],
            preview=processed["preview"],
            status="success",
            kpis=processed["kpis"],
            charts=processed["charts"],
            table=processed["table"],
            insights=insights,
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