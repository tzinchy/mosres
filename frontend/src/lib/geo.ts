export type LatLng = [number, number];

/** ray-casting point-in-polygon; polygon is a closed or open ring of [lat, lng] */
export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  const [y, x] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
