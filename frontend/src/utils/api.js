const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function translateText(text) {
  const res = await fetch(`${BASE_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
