from pydantic import BaseModel


class TranslationRequest(BaseModel):
    text: str


class TranslationResponse(BaseModel):
    typst: str
