import base64
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Section:
    title: str
    body: str
    image_path: str | None = None  # absolute path to a temp image file


@dataclass
class PortfolioData:
    nombre: str
    carrera: str
    semestre: str
    seccion: str
    pec: str
    año: str
    sections: list[Section] = field(default_factory=list)
    logo_left_path: str | None = None
    logo_right_path: str | None = None


def _escape(text: str) -> str:
    """Escape characters that are special in Typst."""
    return (
        text.replace("\\", "\\\\")
            .replace("#", "\\#")
            .replace("@", "\\@")
            .replace("<", "\\<")
            .replace(">", "\\>")
    )


def _embed_image(path: str) -> str:
    """Return a Typst image() call with base64-embedded data."""
    data = Path(path).read_bytes()
    b64 = base64.b64encode(data).decode()
    suffix = Path(path).suffix.lstrip(".").lower()
    fmt = "png" if suffix in ("png", "jpg", "jpeg", "webp", "gif") else suffix
    return f'image.decode(bytes(base64.b64decode("{b64}"), encoding: "base64"), format: "{fmt}")'


def _body_text(raw: str) -> str:
    """Convert a plain-text section body into Typst paragraph blocks."""
    paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]
    return "\n\n".join(_escape(p) for p in paragraphs)


def build_typst(data: PortfolioData) -> str:
    lines: list[str] = []

    # ── Document-level settings ──────────────────────────────────────────────
    lines += [
        f'#set document(title: "Portafolio de Matemáticas {_escape(data.año)}", author: "{_escape(data.nombre)}")',
        '#set text(lang: "es", font: "Linux Libertine", size: 12pt)',
        "#set par(justify: true, leading: 0.9em, spacing: 1.5em)",
        '#set heading(numbering: "1.1")',
        "",
        # Header/footer for body pages
        '#set page(',
        '  paper: "a4",',
        '  margin: 2.5cm,',
        "  header: context {",
        "    let headings = query(selector(heading.where(level: 1)).before(here()))",
        "    if headings.len() > 0 {",
        "      set text(size: 10pt, fill: luma(100))",
        "      headings.last().body",
        "    }",
        "  },",
        "  footer: context {",
        "    set align(center)",
        "    set text(size: 10pt)",
        "    counter(page).display()",
        "  },",
        ")",
        "",
    ]

    # ── Cover page ───────────────────────────────────────────────────────────
    lines += [
        "#page(header: none, footer: none)[",
        "  #set align(center)",
        "",
    ]

    if data.logo_left_path and data.logo_right_path:
        lines += [
            "  #grid(",
            "    columns: (1fr, 1fr),",
            "    align: center,",
            f'    image("{data.logo_left_path}", height: 3cm),',
            f'    image("{data.logo_right_path}", height: 3cm),',
            "  )",
            "  #v(1cm)",
        ]
    elif data.logo_left_path:
        lines += [f'  #image("{data.logo_left_path}", height: 3cm)', "  #v(1cm)"]

    lines += [
        "  #v(3cm)",
        f'  #text(size: 28pt, weight: "bold")[Portafolio de Matemáticas {_escape(data.año)}]',
        "  #v(2cm)",
        "  #align(right)[",
        "    #block[",
        f'      *Nombre:* {_escape(data.nombre)} \\',
        f'      *Carrera:* {_escape(data.carrera)} \\',
        f'      *Semestre:* {_escape(data.semestre)} \\',
        f'      *Sección:* {_escape(data.seccion)} \\',
        f'      *PEC:* {_escape(data.pec)}',
        "    ]",
        "  ]",
        "]",
        "",
    ]

    # ── Table of contents ────────────────────────────────────────────────────
    lines += [
        "#page(header: none)[",
        "  #outline(indent: 1em)",
        "]",
        "",
    ]

    # ── Body sections ────────────────────────────────────────────────────────
    for section in data.sections:
        lines.append(f"= {_escape(section.title)}")
        lines.append("")

        if section.body.strip():
            lines.append(_body_text(section.body))
            lines.append("")

        if section.image_path:
            lines += [
                "#page(header: none)[",
                "  #set align(center)",
                f'  #figure(image("{section.image_path}", width: 100%))',
                "]",
                "",
            ]

    return "\n".join(lines)
