export type MapView = 'graph' | 'timeline';
export const MAP_VIEW_KEY = 'crew.mapView';

/** Pilihan tampilan peta diingat per perangkat; nilai asing atau kosong = grafik (UX 6.2). */
export function parseMapView(raw: string | null | undefined): MapView {
  return raw === 'timeline' ? 'timeline' : 'graph';
}
