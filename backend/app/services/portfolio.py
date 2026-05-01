from dataclasses import dataclass, field


@dataclass
class Page:
    bodies: list[str]   # one str per column
    columns: int = 1


@dataclass
class Subsection:
    title: str
    pages: list[Page] = field(default_factory=lambda: [Page(bodies=[""])])
    image_path: str | None = None


@dataclass
class Section:
    title: str
    pages: list[Page] = field(default_factory=lambda: [Page(bodies=[""])])
    image_path: str | None = None
    subsections: list[Subsection] = field(default_factory=list)


@dataclass
class PortfolioData:
    nombre: str
    carrera: str
    semestre: str
    seccion: str
    pec: str
    año: str
    font_size: str = "12pt"
    line_spacing: str = "1.5"
    sections: list[Section] = field(default_factory=list)
    logo_left_path: str | None = None
    logo_right_path: str | None = None


def _escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
            .replace("#", "\\#")
            .replace("@", "\\@")
            .replace("<", "\\<")
            .replace(">", "\\>")
    )


def _body_text(raw: str) -> str:
    paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]
    return "\n\n".join(_escape(p) for p in paragraphs)


def _emit_page(lines: list[str], page: Page) -> None:
    if not any(b.strip() for b in page.bodies):
        return
    if page.columns == 1:
        lines += [_body_text(page.bodies[0]), ""]
    else:
        col_fracs = ", ".join(["1fr"] * page.columns)
        lines.append(f"#grid(columns: ({col_fracs}), gutter: 1.5em,")
        for body in page.bodies:
            lines.append(f"  [{_body_text(body)}],")
        lines += [")", ""]


def _emit_pages(lines: list[str], pages: list[Page]) -> None:
    for i, page in enumerate(pages):
        if i > 0:
            lines += ["#pagebreak()", ""]
        _emit_page(lines, page)


def _emit_image(lines: list[str], image_path: str) -> None:
    lines += [
        "#page(header: none)[",
        "  #set align(center)",
        f'  #figure(image("{image_path}", width: 100%))',
        "]",
        "",
    ]


def build_typst(data: PortfolioData) -> str:
    lines: list[str] = []

    leading = f"{float(data.line_spacing) * 0.75:.2f}em"
    spacing = f"{float(data.line_spacing):.2f}em"

    lines += [
        f'#set document(title: "Portafolio de Matemáticas {_escape(data.año)}", author: "{_escape(data.nombre)}")',
        f'#set text(lang: "es", font: "Linux Libertine", size: {data.font_size})',
        f"#set par(justify: true, leading: {leading}, spacing: {spacing})",
        '#set heading(numbering: "1.1")',
        "",
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
    lines += ["#page(header: none, footer: none)[", "  #set align(center)", ""]

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
    lines += ["#page(header: none)[", "  #outline(indent: 1em)", "]", ""]

    # ── Body sections ────────────────────────────────────────────────────────
    for i, section in enumerate(data.sections):
        if i > 0:
            lines += ["#pagebreak()", ""]

        lines += [f"= {_escape(section.title)}", ""]
        _emit_pages(lines, section.pages)

        if section.image_path:
            _emit_image(lines, section.image_path)

        for sub in section.subsections:
            lines += [f"== {_escape(sub.title)}", ""]
            _emit_pages(lines, sub.pages)
            if sub.image_path:
                _emit_image(lines, sub.image_path)

    return "\n".join(lines)
