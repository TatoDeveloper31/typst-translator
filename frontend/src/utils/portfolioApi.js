const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function compilePortfolio({ meta, sections, logoLeft, logoRight }) {
  const form = new FormData();

  form.append("nombre", meta.nombre);
  form.append("carrera", meta.carrera);
  form.append("semestre", meta.semestre);
  form.append("seccion", meta.seccion);
  form.append("pec", meta.pec);
  form.append("año", meta.año);

  const sectionsJson = JSON.stringify(
    sections.map((s) => ({
      title: s.title,
      body: s.body,
      has_image: !!s.image,
    }))
  );
  form.append("sections_json", sectionsJson);

  if (logoLeft) form.append("logo_left", logoLeft);
  if (logoRight) form.append("logo_right", logoRight);

  sections.forEach((s) => {
    if (s.image) form.append("section_images", s.image);
  });

  const res = await fetch(`${BASE_URL}/api/portfolio/compile`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.blob();
}
