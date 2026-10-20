async function req(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  listAssets: () => req("/api/assets"),
  getTree: (id) => req(`/api/assets/${id}/tree`),
  saveAsset: (asset) => req("/api/assets", json(asset)),
  licenseScout: (query, fetchUrl) => req("/api/license-scout", json({ query, fetchUrl })),
};
