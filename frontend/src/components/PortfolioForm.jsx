import { useState, useCallback } from "react";
import { compilePortfolio, generateTyp } from "../utils/portfolioApi";

const EMPTY_SECTION = () => ({ title: "", body: "", columns: 1, image: null });

const CURRENT_YEAR = new Date().getFullYear().toString();

export default function PortfolioForm() {
  const [meta, setMeta] = useState({
    nombre: "",
    carrera: "",
    semestre: "",
    seccion: "",
    pec: "",
    año: CURRENT_YEAR,
  });
  const [sections, setSections] = useState([EMPTY_SECTION()]);
  const [logoLeft, setLogoLeft] = useState(null);
  const [logoRight, setLogoRight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateMeta = (key) => (e) =>
    setMeta((prev) => ({ ...prev, [key]: e.target.value }));

  const updateSection = (index, key) => (e) =>
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: e.target.value } : s))
    );

  const updateSectionImage = (index) => (e) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, image: e.target.files[0] ?? null } : s
      )
    );

  const addSection = () => setSections((prev) => [...prev, EMPTY_SECTION()]);

  const removeSection = (index) =>
    setSections((prev) => prev.filter((_, i) => i !== index));

  const saveProgress = useCallback(() => {
    const state = {
      meta,
      sections: sections.map(({ image, ...rest }) => rest), // images can't be serialized
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portafolio-progreso.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [meta, sections]);

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

  const loadProgress = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const state = JSON.parse(ev.target.result);
        if (state.meta) setMeta(state.meta);
        if (Array.isArray(state.sections))
          setSections(state.sections.map((s) => ({ ...EMPTY_SECTION(), ...s, image: null })));
      } catch {
        setError("El archivo no es un progreso válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

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
              <input
                type="text"
                value={meta[key]}
                onChange={updateMeta(key)}
                required
              />
            </label>
          ))}
        </div>
      </section>

      {/* ── Logos ── */}
      <section className="form-section">
        <h2>Logos (opcional)</h2>
        <div className="logo-grid">
          <label>
            <span>Logo izquierdo (escuela)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoLeft(e.target.files[0] ?? null)}
            />
          </label>
          <label>
            <span>Logo derecho (BioMatemática)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoRight(e.target.files[0] ?? null)}
            />
          </label>
        </div>
      </section>

      {/* ── Sections ── */}
      <section className="form-section">
        <h2>Secciones del portafolio</h2>

        {sections.map((sec, i) => (
          <div key={i} className="section-block">
            <div className="section-block-header">
              <span>Sección {i + 1}</span>
              {sections.length > 1 && (
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeSection(i)}
                >
                  Eliminar
                </button>
              )}
            </div>

            <label>
              <span>Título</span>
              <input
                type="text"
                value={sec.title}
                onChange={updateSection(i, "title")}
                placeholder="Ej: Introducción a la Lógica"
                required
              />
            </label>

            <label>
              <span>Contenido</span>
              <textarea
                value={sec.body}
                onChange={updateSection(i, "body")}
                placeholder="Escribe el contenido de esta sección aquí. Separa los párrafos con una línea en blanco."
                rows={6}
              />
            </label>

            <div className="columns-selector">
              <span>Columnas del contenido</span>
              <div className="columns-btns">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`col-btn ${sec.columns === n ? "active" : ""}`}
                    onClick={() =>
                      setSections((prev) =>
                        prev.map((s, idx) =>
                          idx === i ? { ...s, columns: n } : s
                        )
                      )
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <span>Imagen (opcional — página de cuaderno)</span>
              <input
                type="file"
                accept="image/*"
                onChange={updateSectionImage(i)}
              />
            </label>
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
