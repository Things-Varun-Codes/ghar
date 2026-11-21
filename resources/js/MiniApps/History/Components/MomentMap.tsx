import * as Sentry from '@sentry/react';
import { Map, Marker, NavigationControl } from '@vis.gl/react-maplibre';
import type { MapRef } from '@vis.gl/react-maplibre';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Supercluster from 'supercluster';
import { useIsPhone } from '@/hooks/use-breakpoint';
import { count } from '@/lib/plural';
import PlaceButton from '@/MiniApps/History/Components/PlaceButton';
import { applyMapTheme } from '@/MiniApps/History/lib/mapTheme';
import type { Place } from '@/MiniApps/History/lib/places';
import { tiles } from '@/routes/map';
import ErrorState from '@/Shell/Components/ErrorState';

type Props = {
    places: Place[];
    onOpen: (id: number, trigger: HTMLElement | null) => void;
};

type PlaceProps = { place: number; moments: number };
type ClusterSum = { moments: number };

const MAX_ZOOM = 17;

export default function MomentMap({ places, onOpen }: Props) {
    const isPhone = useIsPhone();
    const mapRef = useRef<MapRef | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);
    const themeWatch = useRef<MutationObserver | null>(null);
    const [view, setView] = useState<{
        bounds: [number, number, number, number];
        zoom: number;
    } | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => () => themeWatch.current?.disconnect(), []);

    const index = useMemo(() => {
        const clusters = new Supercluster<PlaceProps, ClusterSum>({
            radius: 56,
            maxZoom: MAX_ZOOM - 1,
            map: (p) => ({ moments: p.moments }),
            reduce: (sum, p) => {
                sum.moments += p.moments;
            },
        });
        clusters.load(
            places.map((place, i) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [place.lng, place.lat],
                },
                properties: { place: i, moments: place.moments.length },
            })),
        );

        return clusters;
    }, [places]);

    const bounds = useMemo(() => {
        const lngs = places.map((p) => p.lng);
        const lats = places.map((p) => p.lat);

        return [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
        ] as [[number, number], [number, number]];
    }, [places]);

    const syncView = () => {
        const map = mapRef.current;

        if (map) {
            setView({
                bounds: map.getBounds().toArray().flat() as [
                    number,
                    number,
                    number,
                    number,
                ],
                zoom: map.getZoom(),
            });
        }
    };

    const features = view
        ? index.getClusters(view.bounds, Math.floor(view.zoom))
        : [];

    if (failed) {
        return (
            <div className="history-map history-map--failed">
                <ErrorState
                    message="The map couldn't load."
                    cause="Every place is still in the list below."
                />
            </div>
        );
    }

    return (
        // Pull to refresh leaves drags that start on the map alone.
        <div className="history-map" data-scroll-container ref={frameRef}>
            <Map
                ref={mapRef}
                workerUrl={workerUrl}
                mapStyle={`${window.location.origin}${tiles.url('styles/positron')}`}
                initialViewState={{
                    bounds,
                    fitBoundsOptions: { padding: 48, maxZoom: 13 },
                }}
                maxZoom={MAX_ZOOM}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                attributionControl={{ compact: true }}
                onStyleData={(e) => {
                    // Before the first frame, so the grey basemap never shows.
                    const frame = frameRef.current;

                    if (themeWatch.current || !frame) {
                        return;
                    }

                    const paint = () => applyMapTheme(e.target, frame);
                    paint();
                    // A theme is switched on <html>; repaint in its colours.
                    themeWatch.current = new MutationObserver(paint);
                    themeWatch.current.observe(document.documentElement, {
                        attributeFilter: ['class', 'data-theme'],
                    });
                }}
                onLoad={(e) => {
                    e.target.touchZoomRotate.disableRotation();
                    syncView();
                }}
                onMoveEnd={syncView}
                onError={(e) => {
                    // A tile that fails after the map is up just leaves a gap; only a map that
                    // never came up (no WebGL, no style) is worth showing and reporting.
                    if (view !== null) {
                        return;
                    }

                    Sentry.captureException(e.error, {
                        tags: {
                            component: 'History/MomentMap',
                            surface: 'frontend',
                        },
                    });
                    setFailed(true);
                }}
                style={{ width: '100%', height: '100%' }}
            >
                {!isPhone && (
                    <NavigationControl
                        position="top-right"
                        showCompass={false}
                    />
                )}
                {features.map((feature) => {
                    const [lng, lat] = feature.geometry.coordinates;

                    if ('cluster' in feature.properties) {
                        const id = feature.properties.cluster_id;
                        const moments = feature.properties.moments;

                        return (
                            <Marker
                                key={`c${id}`}
                                longitude={lng}
                                latitude={lat}
                            >
                                <button
                                    type="button"
                                    className="history-map-cluster shell-press"
                                    aria-label={`${count(moments, 'moment')} in ${count(feature.properties.point_count, 'place')}, zoom in`}
                                    onClick={() =>
                                        mapRef.current?.easeTo({
                                            center: [lng, lat],
                                            zoom: Math.min(
                                                index.getClusterExpansionZoom(
                                                    id,
                                                ),
                                                MAX_ZOOM,
                                            ),
                                        })
                                    }
                                >
                                    {moments}
                                </button>
                            </Marker>
                        );
                    }

                    const place = places[feature.properties.place];

                    return (
                        <Marker
                            key={place.key}
                            longitude={lng}
                            latitude={lat}
                            anchor="bottom"
                        >
                            <PlaceButton
                                place={place}
                                onOpen={onOpen}
                                className="history-map-pin shell-press"
                            >
                                {place.moments.length > 1 && (
                                    <span className="history-map-pin-count">
                                        {place.moments.length}
                                    </span>
                                )}
                            </PlaceButton>
                        </Marker>
                    );
                })}
            </Map>
        </div>
    );
}
