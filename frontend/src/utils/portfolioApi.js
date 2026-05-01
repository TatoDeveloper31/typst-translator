const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function serializePage(p) {
  return { bodies: p.bodies ?? [""], columns: p.columns ?? 1 };
}

function serializeSection(s) {
  return {
    title: s.title,
    pages: (s.pages ?? []).map(serializePage),
    has_image: !!s.image,
    subsections: (s.subsections ?? []).map((sub) => ({
      title: sub.title,
      pages: (sub.pages ?? []).map(serializePage),
      has_image: !!sub.image,
    })),
  };
}

function buildFormData({ meta, sections, logoLeft, logoRight }) {
  const form = new FormData();
  form.append("nombre", meta.nombre);
  form.append("carrera", meta.carrera);
  form.append("semestre", meta.semestre);
  form.append("seccion", meta.seccion);
  form.append("pec", meta.pec);
  form.append("año", meta.año);
  form.append("font_size", meta.font_size ?? "12pt");
  form.append("line_spacing", meta.line_spacing ?? "1.5");
  form.append("sections_json", JSON.stringify(sections.map(serializeSection)));
  if (logoLeft) form.append("logo_left", logoLeft);
  if (logoRight) form.append("logo_right", logoRight);
  sections.forEach((s) => {
    if (s.image) form.append("section_images", s.image);
    (s.subsections ?? []).forEach((sub) => {
      if (sub.image) form.append("section_images", sub.image);
    });
  });
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
