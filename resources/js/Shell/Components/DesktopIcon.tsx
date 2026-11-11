import { Link } from '@inertiajs/react';
import HeartMark from '@/Shell/Components/HeartMark';
import type { MiniApp, MiniAppPreview } from '@/types/miniapp';

export default function DesktopIcon({
    app,
    summary,
    preview,
}: {
    app: MiniApp;
    summary?: string;
    preview?: MiniAppPreview;
}) {
    const liveId = `os-door-live-${app.slug}`;
    const images = preview?.images ?? [];

    return (
        <Link
            href={app.route}
            aria-label={`Open ${app.name}`}
            aria-describedby={summary ? liveId : undefined}
            className={`os-door os-door--${app.slug} shell-focus`}
        >
            <span className="os-door-glimpse" aria-hidden="true">
                {preview?.note ? (
                    <span className="os-door-note">
                        <span className="os-door-note-body">
                            {preview.note}
                        </span>
                        {preview.note_from && (
                            <span className="os-door-note-from">
                                {preview.note_from}
                            </span>
                        )}
                    </span>
                ) : images.length > 0 ? (
                    <span className="os-door-images" data-count={images.length}>
                        {images.map((src) => (
                            <img key={src} src={src} alt="" loading="lazy" />
                        ))}
                    </span>
                ) : (
                    <span className="os-door-empty">
                        <HeartMark size={40} />
                    </span>
                )}
            </span>
            <span className="os-door-text">
                <span className="os-door-name">{app.name}</span>
                <span className="os-door-desc">{app.description}</span>
                {summary && (
                    <span id={liveId} className="os-door-live">
                        {summary}
                    </span>
                )}
            </span>
        </Link>
    );
}
