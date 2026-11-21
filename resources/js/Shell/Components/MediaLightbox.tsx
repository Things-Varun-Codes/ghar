import 'photoswipe/style.css';

import PhotoSwipe from 'photoswipe';
import type { SlideData } from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { escapeHtml } from '@/lib/utils';

/** One photo or video the lightbox can show; every room maps its media to this. */
export type LightboxItem = {
    kind: 'photo' | 'video';
    original: string;
    /** A screen-sized copy of a photo, used until the viewer zooms past it. */
    medium?: string | null;
    poster?: string | null;
    width?: number | null;
    height?: number | null;
    alt?: string;
    title?: string;
    subtitle?: string;
};

export type MediaLightboxHandle = {
    open: (index: number) => void;
};

type Slide = SlideData & { title?: string; subtitle?: string; poster?: string };

const MEDIUM_BOUND = 1200;

/**
 * The srcset lets the browser fetch the screen-sized copy to open and the original only
 * when the viewer zooms past it, instead of decoding a full camera photo on every tap.
 */
export function toSlide(item: LightboxItem): Slide {
    const width = item.width ?? 1600;
    const height = item.height ?? 1200;
    const slide: Slide = {
        src: item.original,
        width,
        height,
        alt: item.alt || undefined,
        title: item.title,
        subtitle: item.subtitle,
    };

    if (item.kind === 'video') {
        return { ...slide, type: 'video', poster: item.poster ?? undefined };
    }

    if (item.medium) {
        const scale = Math.min(1, MEDIUM_BOUND / Math.max(width, height));
        slide.srcset = `${item.medium} ${Math.round(width * scale)}w, ${item.original} ${width}w`;
    }

    return slide;
}

const MediaLightbox = forwardRef<
    MediaLightboxHandle,
    { media: LightboxItem[] }
>(function MediaLightbox({ media }, ref) {
    const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
    const mediaRef = useRef(media);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        mediaRef.current = media;
    }, [media]);

    // Back closes the lightbox first; inside a sheet it shares the sheet's entry.
    useOverlayHistory(isOpen, () => lightboxRef.current?.pswp?.close());

    // A sheet under the lightbox also closes on Escape, so the lightbox takes the key
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

    useEffect(() => () => lightboxRef.current?.destroy(), []);

    useImperativeHandle(ref, () => ({
        open(index: number) {
            // Built per open, from the media as it is now: a list of cards holds no idle
            // instances, and pages appended since the last open are included.
            lightboxRef.current?.destroy();

            const lightbox = buildLightbox(mediaRef.current.map(toSlide));
            lightbox.on('beforeOpen', () => setIsOpen(true));
            lightbox.on('close', () => setIsOpen(false));
            lightbox.init();
            lightboxRef.current = lightbox;
            lightbox.loadAndOpen(index);
        },
    }));

    return null;
});

export default MediaLightbox;

function buildLightbox(dataSource: Slide[]): PhotoSwipeLightbox {
    const lightbox = new PhotoSwipeLightbox({
        dataSource,
        pswpModule: PhotoSwipe,
        bgOpacity: 0.95,
        // trapFocus fights a sheet's own focus trap when opened from inside one,
        // deadlocking focus.
        trapFocus: false,
    });

    lightbox.on('contentLoad', (e) => {
        const { content } = e;

        if (content.type !== 'video') {
            return;
        }

        e.preventDefault();

        const data = content.data as Slide;
        const video = document.createElement('video');
        video.src = data.src ?? '';

        if (data.poster) {
            video.poster = data.poster;
        }

        video.preload = 'none';
        video.controls = true;
        video.playsInline = true;
        video.style.cssText =
            'max-width:100%;max-height:100%;display:block;margin:auto';
        // PhotoSwipe types the element as an image or div, but renders any element.
        content.element = video as unknown as HTMLDivElement;
    });

    let captionEl: HTMLElement | null = null;

    lightbox.on('uiRegister', () => {
        lightbox.pswp?.ui?.registerElement({
            name: 'media-caption',
            order: 9,
            isButton: false,
            appendTo: 'root',
            html: '',
            onInit: (el) => {
                captionEl = el;
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

        // PhotoSwipe's own counter ("1 / 24") is in the top bar, so the caption has none.
        const { title, subtitle } = dataSource[lightbox.pswp.currIndex] ?? {};

        captionEl.innerHTML = [
            title &&
                `<div style="font-family:var(--font-display);font-size:20px;font-weight:600;line-height:1.2;margin-bottom:4px;">${escapeHtml(title)}</div>`,
            subtitle &&
                `<div style="font-size:14px;opacity:0.85;">${escapeHtml(subtitle)}</div>`,
        ]
            .filter(Boolean)
            .join('');
    }

    // `afterInit` fills the first slide's caption; `change` the ones after it.
    lightbox.on('change', updateCaption);
    lightbox.on('afterInit', updateCaption);

    return lightbox;
}
