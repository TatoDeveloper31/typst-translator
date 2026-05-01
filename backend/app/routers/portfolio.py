import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse

from app.services.portfolio import PortfolioData, Section, build_typst

router = APIRouter()

TYPST_BIN = shutil.which("typst") or "typst"


def _save_upload(file: UploadFile, dest_dir: Path) -> str:
    suffix = Path(file.filename).suffix if file.filename else ".png"
    dest = dest_dir / (file.filename or f"image{suffix}")
    dest.write_bytes(file.file.read())
    return str(dest)


def _parse_sections(
    sections_meta: list[dict],
    section_images: list[UploadFile],
    tmp_path: Path,
) -> list[Section]:
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
            columns=max(1, min(3, int(meta.get("columns", 1)))),
            image_path=img_path,
        ))
    return sections


def _build_portfolio_data(
    nombre: str, carrera: str, semestre: str, seccion: str, pec: str, año: str,
    sections_json: str,
    logo_left: UploadFile | None,
    logo_right: UploadFile | None,
    section_images: list[UploadFile],
    tmp_path: Path,
) -> PortfolioData:
    try:
        sections_meta: list[dict] = json.loads(sections_json)
    except json.JSONDecodeError:
        raise HTTPException(400, "sections_json is not valid JSON")

    logo_left_path = None
    logo_right_path = None
    if logo_left and logo_left.filename:
        logo_left_path = _save_upload(logo_left, tmp_path)
    if logo_right and logo_right.filename:
        logo_right_path = _save_upload(logo_right, tmp_path)

    return PortfolioData(
        nombre=nombre,
        carrera=carrera,
        semestre=semestre,
        seccion=seccion,
        pec=pec,
        año=año,
        sections=_parse_sections(sections_meta, section_images, tmp_path),
        logo_left_path=logo_left_path,
        logo_right_path=logo_right_path,
    )


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
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        data = _build_portfolio_data(
            nombre, carrera, semestre, seccion, pec, año,
            sections_json, logo_left, logo_right, section_images, tmp_path,
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


@router.post("/portfolio/generate-typ")
async def generate_typ(
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
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        data = _build_portfolio_data(
            nombre, carrera, semestre, seccion, pec, año,
            sections_json, logo_left, logo_right, section_images, tmp_path,
        )
        return PlainTextResponse(
            content=build_typst(data),
            headers={"Content-Disposition": 'attachment; filename="portafolio.typ"'},
        )
