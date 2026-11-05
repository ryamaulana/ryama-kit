export const NODE_W = 168;
export const NODE_H = 64;
export const GAP_X = 56;
export const GAP_Y = 24;
export const BAND_GAP = 56;

export type RailNode = { id: string; x: number; y: number; w: number; h: number };
export type RailLayout = { nodes: RailNode[]; width: number; height: number };

/**
 * Tata letak peta: lapisan = jalur terpanjang dari simpul awal (kiri ke kanan), simpul sejenis ditumpuk ke bawah.
 * Lapisan yang tidak muat selebar `width` dilipat ke pita di bawahnya, jadi 12 agent tidak saling menimpa.
 * Siklus tidak membuat loop tak berujung: lapisan dibatasi n-1.
 */
export function railLayout(flow: { nodes: string[]; edges: [string, string][] }, width: number): RailLayout {
  const n = flow.nodes.length;
  const layer = new Map(flow.nodes.map((id) => [id, 0]));
  for (let pass = 0; pass < n; pass++) {
    let changed = false;
    for (const [a, b] of flow.edges) {
      const la = layer.get(a), lb = layer.get(b);
      if (la === undefined || lb === undefined) continue;
      if (lb < Math.min(la + 1, n - 1)) { layer.set(b, la + 1); changed = true; }
    }
    if (!changed) break;
  }
  const layers: string[][] = [];
  for (const id of flow.nodes) (layers[layer.get(id)!] ??= []).push(id);
  const cols = layers.filter(Boolean);
  const perBand = Math.max(1, Math.floor((width + GAP_X) / (NODE_W + GAP_X)));
  const nodes: RailNode[] = [];
  let y0 = 0, maxX = 0;
  for (let start = 0; start < cols.length; start += perBand) {
    const band = cols.slice(start, start + perBand);
    band.forEach((ids, c) => ids.forEach((id, r) => {
      const x = c * (NODE_W + GAP_X);
      nodes.push({ id, x, y: y0 + r * (NODE_H + GAP_Y), w: NODE_W, h: NODE_H });
      maxX = Math.max(maxX, x + NODE_W);
    }));
    const tallest = Math.max(...band.map((ids) => ids.length));
    y0 += tallest * (NODE_H + GAP_Y) - GAP_Y + BAND_GAP;
  }
  return { nodes, width: maxX, height: nodes.length ? y0 - BAND_GAP : 0 };
}
