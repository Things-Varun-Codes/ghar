import 'photoswipe/style.css';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { escapeHtml } from '@/lib/utils';

import type { GalleryMediaItem } from './MasonryGrid';

export type { GalleryMediaItem } from './MasonryGrid';

export type PhotoSwipeGalleryHandle = {
    open: (index: number) => void;
};

type Props = {
    media: GalleryMediaItem[];
};

type PswpDataItem = {
    src: string;
    msrc?: string;
    width: number;
    height: number;
    alt?: string;
    type?: 'image' | 'video';
    videoSrc?: string;
    poster?: string;
    eventTitle?: string;
    eventDate?: string;
};

const PhotoSwipeGallery = forwardRef<PhotoSwipeGalleryHandle, Props>(
    function PhotoSwipeGallery({ media }, ref) {
        const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
        const [isOpen, setIsOpen] = useState(false);

        // Back closes the lightbox first; inside a moment's sheet it shares the sheet's entry.
        useOverlayHistory(isOpen, () => lightboxRef.current?.pswp?.close());

        // The sheet under the lightbox also closes on Escape, so the lightbox takes the key
        // before anything else sees it and closes only itself.
        useEffect(() => {
            if (!isOpen) {
                return;
            }

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key !== 'Escape') {
                    return;
                }

                e.stopPropagation();
                lightboxRef.current?.pswp?.close();
            };

            window.addEventListener('keydown', onKeyDown, { capture: true });

            return () =>
                window.removeEventListener('keydown', onKeyDown, {
                    capture: true,
                });
        }, [isOpen]);

        const mediaSignature = useMemo(
            () => media.map((m) => m.id).join(','),
            [media],
        );

        useEffect(() => {
            if (media.length === 0) {
                return;
            }

            const dataSource: PswpDataItem[] = media.map((m) => ({
                src: m.original,
                msrc: m.thumb ?? m.medium ?? undefined,
                width: m.width ?? 1600,
                height: m.height ?? 1200,
                alt: m.alt || undefined,
                type: m.kind === 'video' ? 'video' : 'image',
                videoSrc: m.kind === 'video' ? m.original : undefined,
                poster: m.poster ?? undefined,
                eventTitle: m.event_title,
                eventDate: m.event_date,
            }));

            const lightbox = new PhotoSwipeLightbox({
                dataSource,
                pswpModule: () => import('photoswipe'),
                bgOpacity: 0.95,
                // trapFocus fights the sheet's own focus trap when opened from inside one,
                // deadlocking focus.
                trapFocus: false,
            });

            lightbox.on('contentLoad', (e) => {
                const content = e.content as {
                    type?: string;
                    data?: PswpDataItem;
                };

                if (content.type === 'video') {
                    e.preventDefault(); // prevent default image load

                    const data = content.data;
                    const video = document.createElement('video');
                    video.src =
                        data?.videoSrc ??
                        data?.src ??
                        (content as unknown as PswpDataItem).videoSrc ??
                        (content as unknown as PswpDataItem).src ??
                        '';
                    const posterUrl =
                        data?.poster ??
                        (content as unknown as PswpDataItem).poster;

                    if (posterUrl) {
                        video.poster = posterUrl;
                    }

                    video.preload = 'none';
                    video.controls = true;
                    video.playsInline = true; // Inline play on iOS Safari
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '100%';
                    video.style.display = 'block';
                    video.style.margin = 'auto';

                    (
                        e as unknown as { content: { element: HTMLElement } }
                    ).content.element = video;
                }
            });

            let captionEl: HTMLElement | null = null;

            lightbox.on('uiRegister', () => {
                if (!lightbox.pswp) {
                    return;
                }

                lightbox.pswp.ui?.registerElement({
                    name: 'history-caption',
                    order: 9,
                    isButton: false,
                    appendTo: 'root' as const,
                    html: '',
                    onInit: (el) => {
                        captionEl = el as HTMLElement;
                        el.setAttribute('aria-live', 'polite');
                        el.setAttribute('aria-atomic', 'true');
                        el.style.cssText = [
                            'position:absolute',
                            'bottom:0',
                            'left:0',
                            'right:0',
                            'padding:16px 24px',
                            'background:linear-gradient(transparent,rgba(0,0,0,0.7))',
                            'color:#fff' /* PhotoSwipe controls are always white over dark media */,
                            'font-family:var(--font-sans)',
                            'pointer-events:none',
                            'z-index:10',
                        ].join(';');
                    },
                });
            });

            function updateCaption() {
                if (!captionEl || !lightbox.pswp) {
                    return;
                }

                const idx = lightbox.pswp.currIndex;
                const total = dataSource.length;
                const item = dataSource[idx];
                const title = item?.eventTitle ?? '';
                const date = item?.eventDate ?? '';
                const counter = `${idx + 1} of ${total}`;

                captionEl.innerHTML = [
                    title &&
                        `<div style="font-family:var(--font-display);font-size:20px;font-weight:400;line-height:1.2;margin-bottom:4px;">${escapeHtml(title)}</div>`,
                    date &&
                        `<div style="font-size:14px;opacity:0.85;margin-bottom:4px;">${escapeHtml(date)}</div>`,
                    `<div style="font-size:13px;opacity:0.7;font-variant-numeric:tabular-nums;">${counter}</div>`,
                ]
                    .filter(Boolean)
                    .join('');
            }

            // `change` fires on slide navigation; `afterInit` fires once when the
            // lightbox first opens, so without it the caption is blank until the
            // user moves to the next slide.
            lightbox.on('change', updateCaption);
            lightbox.on('afterInit', updateCaption);

            lightbox.on('beforeOpen', () => setIsOpen(true));
            lightbox.on('close', () => setIsOpen(false));

            lightbox.init();
            lightboxRef.current = lightbox;

            return () => {
                lightbox.destroy();
                lightboxRef.current = null;
                setIsOpen(false);
            };
            // mediaSignature is the stable identity for `media`; including media
            // itself would re-run on every render.
            // eslint-disable-next-line react-hooks/exhaustive-deps -- mediaSignature is the stable identity for media, which changes every render
        }, [mediaSignature]);

        useImperativeHandle(ref, () => ({
            open(index: number) {
                if (lightboxRef.current) {
                    lightboxRef.current.loadAndOpen(index);
                }
            },
        }));

        return null;
    },
);

export default PhotoSwipeGallery;
