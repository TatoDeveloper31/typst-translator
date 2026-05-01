import { useState, useCallback } from "react";
import { compilePortfolio, generateTyp } from "../utils/portfolioApi";

const EMPTY_PAGE = () => ({ bodies: [""], columns: 1 });
const EMPTY_SUBSECTION = () => ({ title: "", pages: [EMPTY_PAGE()], image: null });
const EMPTY_SECTION = () => ({ title: "", pages: [EMPTY_PAGE()], image: null, subsections: [] });

const CURRENT_YEAR = new Date().getFullYear().toString();

const FONT_SIZES = ["10pt", "11pt", "12pt", "14pt"];
const LINE_SPACINGS = [
  { value: "1.0", label: "Simple (1.0)" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5 (predeterminado)" },
  { value: "2.0", label: "Doble (2.0)" },
];

function normalizeBodies(bodies, columns) {
  const arr = [...(bodies ?? [""])];
  while (arr.length < columns) arr.push("");
  return arr.slice(0, columns);
}

function ColumnsSelector({ value, onChange }) {
  return (
    <div className="columns-selector">
      <span>Columnas</span>
      <div className="columns-btns">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`col-btn ${value === n ? "active" : ""}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function PageBlock({ page, pageIndex, totalPages, onBodyChange, onColumnsChange, onRemove }) {
  const normalized = normalizeBodies(page.bodies, page.columns);

  return (
    <div className="page-block">
      <div className="page-block-header">
        <span className="page-label">Página {pageIndex + 1}</span>
        {totalPages > 1 && (
          <button type="button" className="remove-btn" onClick={onRemove}>
            Eliminar página
          </button>
        )}
      </div>

      <ColumnsSelector value={page.columns} onChange={onColumnsChange} />

      <div className={`column-textareas cols-${page.columns}`}>
        {normalized.map((body, ci) => (
          <label key={ci}>
            <span>{page.columns > 1 ? `Columna ${ci + 1}` : "Contenido"}</span>
            <textarea
              value={body}
              onChange={(e) => onBodyChange(ci, e.target.value)}
              placeholder={
                page.columns > 1
                  ? `Texto de la columna ${ci + 1}…`
                  : "Escribe el contenido aquí. Separa párrafos con una línea en blanco."
              }
              rows={6}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function PageList({ pages, onPagesChange }) {
  const updatePage = (pi, patch) =>
    onPagesChange(pages.map((p, i) => (i === pi ? { ...p, ...patch } : p)));

  const updateBody = (pi, ci, val) =>
    onPagesChange(
      pages.map((p, i) => {
        if (i !== pi) return p;
        const bodies = normalizeBodies(p.bodies, p.columns);
        bodies[ci] = val;
        return { ...p, bodies };
      })
    );

  const updateColumns = (pi, n) =>
    onPagesChange(
      pages.map((p, i) =>
        i === pi ? { ...p, columns: n, bodies: normalizeBodies(p.bodies, n) } : p
      )
    );

  const addPage = () => onPagesChange([...pages, EMPTY_PAGE()]);

  const removePage = (pi) => onPagesChange(pages.filter((_, i) => i !== pi));

  return (
    <div className="page-list">
      {pages.map((page, pi) => (
        <div key={pi}>
          {pi > 0 && <div className="page-break-divider"><span>— Nueva página —</span></div>}
          <PageBlock
            page={page}
            pageIndex={pi}
            totalPages={pages.length}
            onBodyChange={(ci, val) => updateBody(pi, ci, val)}
            onColumnsChange={(n) => updateColumns(pi, n)}
            onRemove={() => removePage(pi)}
          />
        </div>
      ))}
      <button type="button" className="add-btn add-page-btn" onClick={addPage}>
        + Nueva página
      </button>
    </div>
  );
}

export default function PortfolioForm() {
  const [meta, setMeta] = useState({
    nombre: "",
    carrera: "",
    semestre: "",
    seccion: "",
    pec: "",
    año: CURRENT_YEAR,
    font_size: "12pt",
    line_spacing: "1.5",
  });
  const [sections, setSections] = useState([EMPTY_SECTION()]);
  const [logoLeft, setLogoLeft] = useState(null);
  const [logoRight, setLogoRight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateMeta = (key) => (e) =>
    setMeta((prev) => ({ ...prev, [key]: e.target.value }));

  const updateSection = (si, patch) =>
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, ...patch } : s)));

  const addSection = () => setSections((prev) => [...prev, EMPTY_SECTION()]);
  const removeSection = (si) =>
    setSections((prev) => prev.filter((_, i) => i !== si));

  const updateSubsection = (si, subi, patch) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si
          ? s
          : { ...s, subsections: s.subsections.map((sub, j) => (j === subi ? { ...sub, ...patch } : sub)) }
      )
    );

  const addSubsection = (si) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, subsections: [...s.subsections, EMPTY_SUBSECTION()] } : s
      )
    );

  const removeSubsection = (si, subi) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, subsections: s.subsections.filter((_, j) => j !== subi) }
          : s
      )
    );

  // Save / load / export
  const saveProgress = useCallback(() => {
    const state = {
      meta,
      sections: sections.map(({ image, subsections, ...rest }) => ({
        ...rest,
        subsections: subsections.map(({ image: _img, ...sub }) => sub),
      })),
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portafolio-progreso.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [meta, sections]);

  const loadProgress = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const state = JSON.parse(ev.target.result);
        if (state.meta) setMeta((prev) => ({ ...prev, ...state.meta }));
        if (Array.isArray(state.sections))
          setSections(
            state.sections.map((s) => ({
              ...EMPTY_SECTION(),
              ...s,
              image: null,
              pages: s.pages
                ? s.pages.map((p) => ({ ...EMPTY_PAGE(), ...p }))
                : [{ bodies: s.bodies ?? [s.body ?? ""], columns: s.columns ?? 1 }],
              subsections: (s.subsections ?? []).map((sub) => ({
                ...EMPTY_SUBSECTION(),
                ...sub,
                image: null,
                pages: sub.pages
                  ? sub.pages.map((p) => ({ ...EMPTY_PAGE(), ...p }))
                  : [{ bodies: sub.bodies ?? [sub.body ?? ""], columns: sub.columns ?? 1 }],
              })),
            }))
          );
      } catch {
        setError("El archivo no es un progreso válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const downloadTyp = useCallback(async () => {
    setError(null);
    try {
      const typst = await generateTyp({ meta, sections, logoLeft, logoRight });
      const blob = new Blob([typst], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "portafolio.typ";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }, [meta, sections, logoLeft, logoRight]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const blob = await compilePortfolio({ meta, sections, logoLeft, logoRight });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "portafolio-matematica.pdf";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [meta, sections, logoLeft, logoRight]
  );

  return (
    <form className="portfolio-form" onSubmit={handleSubmit}>
      {/* ── Metadata ── */}
      <section className="form-section">
        <h2>Información del estudiante</h2>
        <div className="meta-grid">
          {[
            ["nombre", "Nombre completo"],
            ["carrera", "Carrera"],
            ["semestre", "Semestre"],
            ["seccion", "Sección"],
            ["pec", "PEC"],
            ["año", "Año"],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input type="text" value={meta[key]} onChange={updateMeta(key)} required />
            </label>
          ))}
        </div>
      </section>

      {/* ── Typography ── */}
      <section className="form-section">
        <h2>Tipografía</h2>
        <div className="typography-grid">
          <label>
            <span>Tamaño de letra</span>
            <select value={meta.font_size} onChange={updateMeta("font_size")}>
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span>Interlineado</span>
            <select value={meta.line_spacing} onChange={updateMeta("line_spacing")}>
              {LINE_SPACINGS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── Logos ── */}
      <section className="form-section">
        <h2>Logos (opcional)</h2>
        <div className="logo-grid">
          <label>
            <span>Logo izquierdo (escuela)</span>
            <input type="file" accept="image/*" onChange={(e) => setLogoLeft(e.target.files[0] ?? null)} />
          </label>
          <label>
            <span>Logo derecho (BioMatemática)</span>
            <input type="file" accept="image/*" onChange={(e) => setLogoRight(e.target.files[0] ?? null)} />
          </label>
        </div>
      </section>

      {/* ── Sections ── */}
      <section className="form-section">
        <h2>Secciones del portafolio</h2>

        {sections.map((sec, si) => (
          <div key={si} className="section-block">
            <div className="section-block-header">
              <span>Sección {si + 1}</span>
              {sections.length > 1 && (
                <button type="button" className="remove-btn" onClick={() => removeSection(si)}>
                  Eliminar
                </button>
              )}
            </div>

            <label>
              <span>Título</span>
              <input
                type="text"
                value={sec.title}
                onChange={(e) => updateSection(si, { title: e.target.value })}
                placeholder="Ej: Introducción a la Lógica"
                required
              />
            </label>

            <PageList
              pages={sec.pages}
              onPagesChange={(pages) => updateSection(si, { pages })}
            />

            <label>
              <span>Imagen de cuaderno (opcional — página aparte)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => updateSection(si, { image: e.target.files[0] ?? null })}
              />
            </label>

            {/* Subsections */}
            {sec.subsections.map((sub, subi) => (
              <div key={subi} className="subsection-block">
                <div className="section-block-header">
                  <span>Subsección {si + 1}.{subi + 1}</span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeSubsection(si, subi)}
                  >
                    Eliminar
                  </button>
                </div>

                <label>
                  <span>Título</span>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={(e) => updateSubsection(si, subi, { title: e.target.value })}
                    placeholder="Ej: Tablas de verdad"
                    required
                  />
                </label>

                <PageList
                  pages={sub.pages}
                  onPagesChange={(pages) => updateSubsection(si, subi, { pages })}
                />

                <label>
                  <span>Imagen de cuaderno (opcional — página aparte)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => updateSubsection(si, subi, { image: e.target.files[0] ?? null })}
                  />
                </label>
              </div>
            ))}

            <button type="button" className="add-btn add-sub-btn" onClick={() => addSubsection(si)}>
              + Agregar subsección
            </button>
          </div>
        ))}

        <button type="button" className="add-btn" onClick={addSection}>
          + Agregar sección
        </button>
      </section>

      {/* ── Actions ── */}
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Compilando PDF…" : "Descargar PDF"}
        </button>
        <div className="secondary-actions">
          <button type="button" className="add-btn" onClick={downloadTyp}>
            Descargar .typ
          </button>
          <button type="button" className="add-btn" onClick={saveProgress}>
            Guardar progreso (.json)
          </button>
          <label className="add-btn load-label">
            Cargar progreso
            <input type="file" accept=".json" onChange={loadProgress} hidden />
          </label>
        </div>
      </div>
    </form>
  );
}
