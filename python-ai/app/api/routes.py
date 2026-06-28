"""API route definitions for GlamAI.

Provides health check, service info, and the analysis endpoint
that accepts image uploads and triggers the pipeline service.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.services.pipeline_service import PipelineService

router = APIRouter()

_pipeline_service: PipelineService | None = None


def get_pipeline_service() -> PipelineService:
    """Dependency provider for a singleton PipelineService.

    Returns:
        PipelineService: Shared pipeline service instance.
    """
    global _pipeline_service
    if _pipeline_service is None:
        _pipeline_service = PipelineService()
    return _pipeline_service


@router.get("/")
async def root() -> dict:
    """Return service status information.

    Returns:
        dict: Service name and running status.
    """
    return {
        "status": "running",
        "service": "GlamAI API",
    }


@router.get("/health")
async def health() -> dict:
    """Health check endpoint for monitoring and orchestration.

    Returns:
        dict: Health status of the service.
    """
    return {
        "status": "healthy",
    }


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    pipeline: PipelineService = Depends(get_pipeline_service),
) -> dict:
    """Upload an image and trigger the beauty analysis pipeline.

    Accepts JPEG, PNG, and WebP files up to 10 MB. The pipeline
    validates the image, performs quality analysis, and returns
    structured metrics.

    Args:
        file: Uploaded image file.
        pipeline: Injected PipelineService instance.

    Returns:
        dict: Pipeline execution result with quality metrics.

    Raises:
        HTTPException 400: If the file is invalid, too large,
            corrupted, or has an unsupported format.
    """
    try:
        return await pipeline.analyze(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
