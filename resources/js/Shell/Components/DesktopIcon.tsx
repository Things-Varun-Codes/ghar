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
            // Safe only because a landing page changes nothing when fetched. A page whose
            // GET has a side effect (Mailbox notes and flowers mark themselves read) must
            // never be prefetched.
            prefetch="mount"
            aria-label={`Open ${app.name}`}
            aria-describedby={summary ? liveId : undefined}
            className={`os-door os-door--${app.slug} shell-lift shell-focus`}
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
            <div className="os-door-text">
                <h2 className="os-door-name">{app.name}</h2>
                <p className="os-door-desc">{app.description}</p>
                {summary && (
                    <p id={liveId} className="os-door-live">
                        {summary}
                    </p>
                )}
            </div>
        </Link>
    );
}
