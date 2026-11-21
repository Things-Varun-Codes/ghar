import type { Map as MapLibre } from 'maplibre-gl';

type Layer = { id: string; type: string };

type PaintProperty = Parameters<MapLibre['setPaintProperty']>[1];

export type MapPaint = {
    layer: string;
    property: PaintProperty;
    token: string;
};

/** Which of the map's colour tokens (history.css, `.history-map`) each basemap layer takes. */
export function themePaint(layers: Layer[]): MapPaint[] {
    const paint: MapPaint[] = [];
    const set = (layer: string, property: PaintProperty, token: string) =>
        paint.push({ layer, property, token: `--history-map-${token}` });

    for (const { id, type } of layers) {
        if (type === 'background' || id === 'road_area_pier') {
            set(
                id,
                type === 'background' ? 'background-color' : 'fill-color',
                'land',
            );
        } else if (type === 'fill') {
            set(
                id,
                'fill-color',
                id === 'water'
                    ? 'water'
                    : id === 'park' || id.includes('wood')
                      ? 'park'
                      : 'block',
            );

            if (id === 'building') {
                set(id, 'fill-outline-color', 'edge');
            }
        } else if (type === 'line') {
            set(
                id,
                'line-color',
                id.startsWith('waterway')
                    ? 'water'
                    : id === 'road_pier'
                      ? 'land'
                      : /inner|dashline|path|runway$/.test(id)
                        ? 'road'
                        : 'edge',
            );
        } else if (type === 'symbol' && !id.includes('shield')) {
            set(
                id,
                'text-color',
                id.startsWith('water')
                    ? 'water-ink'
                    : id.startsWith('label_')
                      ? 'place'
                      : 'label',
            );
            set(id, 'text-halo-color', 'land');
        }
    }

    return paint;
}

/** Repaints the basemap in the room's colours, read from `el`'s tokens. Safe to call again. */
export function applyMapTheme(map: MapLibre, el: HTMLElement): void {
    // MapLibre reads only rgb and hsl, so each token goes through a pixel to come out as rgb.
    const probe = document.createElement('span');
    el.append(probe);
    const ctx = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
    const rgb = new Map<string, string>();
    const resolve = (token: string) => {
        if (!rgb.has(token) && ctx) {
            probe.style.color = `var(${token})`;
            ctx.fillStyle = getComputedStyle(probe).color;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            rgb.set(token, `rgb(${r},${g},${b})`);
        }

        return rgb.get(token);
    };

    const layers = map.getStyle().layers;

    for (const { layer, property, token } of themePaint(layers)) {
        const color = resolve(token);

        if (color) {
            map.setPaintProperty(layer, property, color);
        }
    }

    probe.remove();

    // No tracked capitals: area and water names are set like every other label.
    for (const { id, type, layout } of layers) {
        if (type !== 'symbol' || !layout) {
            continue;
        }

        if ('text-transform' in layout) {
            map.setLayoutProperty(id, 'text-transform', 'none');
        }

        if ('text-letter-spacing' in layout) {
            map.setLayoutProperty(id, 'text-letter-spacing', 0);
        }
    }
}
