"""Request schemas for the GlamAI API.

Reserved for future request body models. The current POST /analyze
endpoint accepts an UploadFile directly rather than a JSON body.
"""

from pydantic import BaseModel


class AnalysisOptions(BaseModel):
    """Configuration options for the analysis pipeline.

    Currently a placeholder. Will be extended with parameters
    such as analysis type, model selection, and processing flags.
    """
    pass
