import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.services.portfolio import PortfolioData, Section, build_typst

router = APIRouter()

TYPST_BIN = shutil.which("typst") or "typst"


def _save_upload(file: UploadFile, dest_dir: Path) -> str:
    suffix = Path(file.filename).suffix if file.filename else ".png"
    dest = dest_dir / f"{file.filename or 'image'}{suffix if '.' in (file.filename or '') else suffix}"
    dest.write_bytes(file.file.read())
    return str(dest)


@router.post("/portfolio/compile")
async def compile_portfolio(
    nombre: str = Form(...),
    carrera: str = Form(...),
    semestre: str = Form(...),
    seccion: str = Form(...),
    pec: str = Form(...),
    año: str = Form(...),
    sections_json: str = Form(...),
    logo_left: UploadFile | None = None,
    logo_right: UploadFile | None = None,
    section_images: list[UploadFile] = Form(default=[]),
):
    """
    sections_json: JSON array of {title, body, has_image}
    section_images: uploaded files in the same order as sections with has_image=true
    """
    try:
        sections_meta: list[dict] = json.loads(sections_json)
    except json.JSONDecodeError:
        raise HTTPException(400, "sections_json is not valid JSON")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        logo_left_path = None
        logo_right_path = None
        if logo_left and logo_left.filename:
            logo_left_path = _save_upload(logo_left, tmp_path)
        if logo_right and logo_right.filename:
            logo_right_path = _save_upload(logo_right, tmp_path)

        img_iter = iter(section_images)
        sections: list[Section] = []
        for meta in sections_meta:
            img_path = None
            if meta.get("has_image"):
                upload = next(img_iter, None)
                if upload and upload.filename:
                    img_path = _save_upload(upload, tmp_path)
            sections.append(Section(
                title=meta.get("title", ""),
                body=meta.get("body", ""),
                image_path=img_path,
            ))

        data = PortfolioData(
            nombre=nombre,
            carrera=carrera,
            semestre=semestre,
            seccion=seccion,
            pec=pec,
            año=año,
            sections=sections,
            logo_left_path=logo_left_path,
            logo_right_path=logo_right_path,
        )

        typ_file = tmp_path / "portfolio.typ"
        pdf_file = tmp_path / "portfolio.pdf"
        typ_file.write_text(build_typst(data), encoding="utf-8")

        result = subprocess.run(
            [TYPST_BIN, "compile", str(typ_file), str(pdf_file)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise HTTPException(500, f"typst compile failed:\n{result.stderr}")

        return FileResponse(
            path=str(pdf_file),
            media_type="application/pdf",
            filename="portafolio-matematica.pdf",
            background=None,
        )
