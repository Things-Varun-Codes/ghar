/*
 * iOS: muted and playsInline must be set before src, seek to 0.1 (frame 0 is often black) and draw
 * on `seeked`.
 */
export async function captureVideoPoster(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');

        video.preload = 'metadata';
        // REQUIRED: set muted + playsInline BEFORE src — iOS Safari requires this
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        const cleanup = () => URL.revokeObjectURL(url);

        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 5000);

        video.addEventListener(
            'loadedmetadata',
            () => {
                video.currentTime = Math.min(0.1, video.duration / 2);
            },
            { once: true },
        );

        video.addEventListener(
            'seeked',
            () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        clearTimeout(timeout);
                        cleanup();
                        resolve(null);

                        return;
                    }

                    ctx.drawImage(video, 0, 0);

                    canvas.toBlob(
                        (blob) => {
                            clearTimeout(timeout);
                            cleanup();
                            resolve(blob);
                        },
                        'image/webp',
                        0.85,
                    );
                    // eslint-disable-next-line local/no-silent-error -- poster capture is a progressive enhancement; codec mismatches, tainted canvases and iOS quirks resolve null and the caller renders a placeholder.
                } catch {
                    clearTimeout(timeout);
                    cleanup();
                    resolve(null);
                }
            },
            { once: true },
        );

        video.addEventListener('error', () => {
            clearTimeout(timeout);
            cleanup();
            resolve(null);
        });
    });
}
