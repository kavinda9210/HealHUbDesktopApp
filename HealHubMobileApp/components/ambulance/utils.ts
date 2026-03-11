export function extractLatLng(text: string): { lat: number; lng: number } | null {
  // Matches: "Location: 6.9271, 79.8612"
  const match = text.match(/Location:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function buildStaticOsmMapUrl(params: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  markers?: Array<{ lat: number; lng: number; color: 'red' | 'blue' }>
  cacheBuster?: string;
}) {
  const search: string[] = [];
  search.push(`center=${encodeURIComponent(String(params.centerLat))},${encodeURIComponent(String(params.centerLng))}`);
  search.push(`zoom=${encodeURIComponent(String(params.zoom))}`);
  search.push('size=640x360');
  search.push('maptype=mapnik');

  for (const m of params.markers || []) {
    const style = m.color === 'blue' ? 'blue-pushpin' : 'red-pushpin';
    search.push(`markers=${encodeURIComponent(String(m.lat))},${encodeURIComponent(String(m.lng))},${style}`);
  }

  if (params.cacheBuster) {
    search.push(`ts=${encodeURIComponent(params.cacheBuster)}`);
  }

  return `https://staticmap.openstreetmap.de/staticmap.php?${search.join('&')}`;
}
