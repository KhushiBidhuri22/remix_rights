// SHA-256 of the exact file bytes, returned as 0x-prefixed hex (fits bytes32).
export async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
