const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function buildFormData({ meta, sections, logoLeft, logoRight }) {
  const form = new FormData();
  form.append("nombre", meta.nombre);
  form.append("carrera", meta.carrera);
  form.append("semestre", meta.semestre);
  form.append("seccion", meta.seccion);
  form.append("pec", meta.pec);
  form.append("año", meta.año);
  form.append(
    "sections_json",
    JSON.stringify(
      sections.map((s) => ({
        title: s.title,
        body: s.body,
        columns: s.columns ?? 1,
        has_image: !!s.image,
      }))
    )
  );
  if (logoLeft) form.append("logo_left", logoLeft);
  if (logoRight) form.append("logo_right", logoRight);
  sections.forEach((s) => { if (s.image) form.append("section_images", s.image); });
  return form;
}

export async function compilePortfolio(payload) {
  const res = await fetch(`${BASE_URL}/api/portfolio/compile`, {
    method: "POST",
    body: buildFormData(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.blob();
}

export async function generateTyp(payload) {
  const res = await fetch(`${BASE_URL}/api/portfolio/generate-typ`, {
    method: "POST",
    body: buildFormData(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.text();
}
