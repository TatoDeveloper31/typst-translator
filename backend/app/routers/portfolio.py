import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse, Response

from app.services.portfolio import Page, PortfolioData, Section, Subsection, build_typst

router = APIRouter()

_TYPST_DEFAULT = r"C:\Users\Tato1\AppData\Local\Microsoft\WinGet\Packages\Typst.Typst_Microsoft.Winget.Source_8wekyb3d8bbwe\typst-x86_64-pc-windows-msvc\typst.exe"
TYPST_BIN = os.environ.get("TYPST_PATH") or shutil.which("typst") or _TYPST_DEFAULT


def _save_upload(file: UploadFile, dest_dir: Path) -> str:
    suffix = Path(file.filename).suffix if file.filename else ".png"
    dest = dest_dir / (file.filename or f"image{suffix}")
    dest.write_bytes(file.file.read())
    return str(dest)


def _next_image(img_iter, tmp_path: Path) -> str | None:
    upload = next(img_iter, None)
    if upload and upload.filename:
        return _save_upload(upload, tmp_path)
    return None


def _parse_pages(meta: dict) -> list[Page]:
    """Parse page blocks from a section/subsection dict. Handles legacy format too."""
    if "pages" in meta and isinstance(meta["pages"], list):
        pages = []
        for p in meta["pages"]:
            cols = max(1, min(3, int(p.get("columns", 1))))
            bodies = p.get("bodies") or [p.get("body", "")]
            pages.append(Page(bodies=[str(b) for b in bodies], columns=cols))
        return pages or [Page(bodies=[""])]
    # Legacy: single bodies/body field
    bodies = meta.get("bodies") or [meta.get("body", "")]
    cols = max(1, min(3, int(meta.get("columns", 1))))
    return [Page(bodies=[str(b) for b in bodies], columns=cols)]


def _parse_sections(
    sections_meta: list[dict],
    section_images: list[UploadFile],
    tmp_path: Path,
) -> list[Section]:
    img_iter = iter(section_images)
    sections: list[Section] = []
    for meta in sections_meta:
        img_path = _next_image(img_iter, tmp_path) if meta.get("has_image") else None

        subsections: list[Subsection] = []
        for sub_meta in meta.get("subsections", []):
            sub_img = _next_image(img_iter, tmp_path) if sub_meta.get("has_image") else None
            subsections.append(Subsection(
                title=sub_meta.get("title", ""),
                pages=_parse_pages(sub_meta),
                image_path=sub_img,
            ))

        sections.append(Section(
            title=meta.get("title", ""),
            pages=_parse_pages(meta),
            image_path=img_path,
            subsections=subsections,
        ))
    return sections


def _build_portfolio_data(
    nombre: str, carrera: str, semestre: str, seccion: str, pec: str, año: str,
    font_size: str, line_spacing: str,
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
        font_size=font_size,
        line_spacing=line_spacing,
        sections=_parse_sections(sections_meta, section_images, tmp_path),
        logo_left_path=logo_left_path,
        logo_right_path=logo_right_path,
    )


SHARED_FORM = dict(
    nombre=(str, Form(...)),
    carrera=(str, Form(...)),
    semestre=(str, Form(...)),
    seccion=(str, Form(...)),
    pec=(str, Form(...)),
    año=(str, Form(...)),
    font_size=(str, Form(default="12pt")),
    line_spacing=(str, Form(default="1.5")),
    sections_json=(str, Form(...)),
)


@router.post("/portfolio/compile")
async def compile_portfolio(
    nombre: str = Form(...),
    carrera: str = Form(...),
    semestre: str = Form(...),
    seccion: str = Form(...),
    pec: str = Form(...),
    año: str = Form(...),
    font_size: str = Form(default="12pt"),
    line_spacing: str = Form(default="1.5"),
    sections_json: str = Form(...),
    logo_left: UploadFile | None = None,
    logo_right: UploadFile | None = None,
    section_images: list[UploadFile] = Form(default=[]),
):
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        data = _build_portfolio_data(
            nombre, carrera, semestre, seccion, pec, año,
            font_size, line_spacing,
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

        pdf_bytes = pdf_file.read_bytes()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="portafolio-matematica.pdf"'},
    )


@router.post("/portfolio/generate-typ")
async def generate_typ(
    nombre: str = Form(...),
    carrera: str = Form(...),
    semestre: str = Form(...),
    seccion: str = Form(...),
    pec: str = Form(...),
    año: str = Form(...),
    font_size: str = Form(default="12pt"),
    line_spacing: str = Form(default="1.5"),
    sections_json: str = Form(...),
    logo_left: UploadFile | None = None,
    logo_right: UploadFile | None = None,
    section_images: list[UploadFile] = Form(default=[]),
):
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        data = _build_portfolio_data(
            nombre, carrera, semestre, seccion, pec, año,
            font_size, line_spacing,
            sections_json, logo_left, logo_right, section_images, tmp_path,
        )
        return PlainTextResponse(
            content=build_typst(data),
            headers={"Content-Disposition": 'attachment; filename="portafolio.typ"'},
        )
