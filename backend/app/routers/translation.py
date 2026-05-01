from fastapi import APIRouter
from app.models.translation import TranslationRequest, TranslationResponse
from app.services.translation import translate_to_typst

router = APIRouter()


@router.post("/translate", response_model=TranslationResponse)
def translate(request: TranslationRequest) -> TranslationResponse:
    typst = translate_to_typst(request.text)
    return TranslationResponse(typst=typst)
