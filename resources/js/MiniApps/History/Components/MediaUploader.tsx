import { router, usePage } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readXsrfToken } from '@/lib/csrf';
import { captureSilent } from '@/lib/observability';
import media from '@/routes/apps/our-history/media';
import type { Auth } from '@/types/auth';
import { captureVideoPoster } from './VideoPosterCapture';

type FileState = 'staged' | 'queued' | 'uploading' | 'done' | 'failed';

type FileEntry = {
    id: string;
    file: File;
    state: FileState;
    progress: number;
    objectUrl: string | null;
    error?: string;
};

class UploadError extends Error {
    status: number | null;
    userMessage: string;

    constructor(status: number | null, userMessage: string) {
        super(userMessage);
        this.name = 'UploadError';
        this.status = status;
        this.userMessage = userMessage;
    }
}

type Props = {
    eventId: number | null;
    onStagedCountChange?: (count: number) => void;
};

function uid() {
    return Math.random().toString(36).slice(2);
}

/*
 * 413 comes from nginx with an empty body; it never reaches PHP or the error tracker, so this
 * string is the user's only signal.
 */
function deriveUploadErrorMessage(xhr: XMLHttpRequest): string {
    const status = xhr.status;

    switch (status) {
        case 413:
            return 'File too large. Max 96 MB per upload.';
        case 422: {
            try {
                const body = JSON.parse(xhr.responseText);
                const message =
                    typeof body?.message === 'string' ? body.message : '';
                const errors = body?.errors;

                if (errors && typeof errors === 'object') {
                    const flat = Object.values(errors)
                        .flat()
                        .filter((v): v is string => typeof v === 'string');

                    if (
                        flat.length > 0 &&
                        (message === '' ||
                            message === 'The given data was invalid.')
                    ) {
                        return flat.join(' ');
                    }
                }

                if (message) {
                    return message;
                }
                // eslint-disable-next-line local/no-silent-error -- a non-JSON 422 body (e.g. nginx-stripped) is expected; we fall through to the generic message below.
            } catch {
                // Intentionally empty — see directive above.
            }

            return 'Server rejected this file. Check the file type and try again.';
        }
        case 419:
            return 'Session expired. Refresh the page and try again.';
        case 401:
        case 403:
            return "You've been signed out. Refresh the page.";
        default:
            if (status >= 500 && status <= 599) {
                return 'Server hiccup. Tap Retry.';
            }

            return `Upload failed (HTTP ${status}). Tap Retry.`;
    }
}

async function uploadOne(
    eventId: number,
    file: File,
    onProgress: (pct: number) => void,
): Promise<void> {
    const poster = file.type.startsWith('video/')
        ? await captureVideoPoster(file)
        : null;

    const form = new FormData();
    form.append('media', file);

    if (poster) {
        form.append('poster', poster, 'poster.webp');
    }

    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', media.store(eventId).url);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        const token = readXsrfToken();

        if (token) {
            xhr.setRequestHeader('X-XSRF-TOKEN', token);
        }

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress((e.loaded / e.total) * 100);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(
                    new UploadError(xhr.status, deriveUploadErrorMessage(xhr)),
                );
            }
        };
        xhr.onerror = () =>
            reject(
                new UploadError(
                    null,
                    'Network problem. Check your connection and tap Retry.',
                ),
            );
        xhr.onabort = () => reject(new UploadError(null, 'Upload cancelled.'));

        xhr.send(form);
    });
}

/*
 * Only 5xx, network failures and unexpected throws are worth reporting; the rest already show on
 * the tile.
 */
function isOperatorActionable(err: unknown): boolean {
    if (!(err instanceof UploadError)) {
        return true; // unexpected throw — surface it
    }

    if (err.status === null) {
        return true; // network/DNS/TLS — could be edge issue
    }

    if (err.status >= 500 && err.status <= 599) {
        return true; // server hiccup — operator wants to know
    }

    return false; // 413/422/419/401/403 — user-facing only
}

function readUploadErrorMessage(err: unknown): string {
    if (err instanceof UploadError) {
        return err.userMessage;
    }

    return 'Upload failed. Tap Retry.';
}

export default function MediaUploader({ eventId, onStagedCountChange }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const userRole: 'admin' | 'user' | 'guest' = auth.user
        ? auth.user.roles?.[0] === 'admin'
            ? 'admin'
            : 'user'
        : 'guest';
    const userRoleRef = useRef(userRole);

    useEffect(() => {
        userRoleRef.current = userRole;
    }, [userRole]);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isAwaitingEvent = eventId === null;

    const updateFile = useCallback((id: string, patch: Partial<FileEntry>) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        );
    }, []);

    const runUploadPool = useCallback(
        async (targetEventId: number, entries: FileEntry[]) => {
            if (entries.length === 0) {
                return;
            }

            const slots: Promise<void>[] = [
                Promise.resolve(),
                Promise.resolve(),
                Promise.resolve(),
            ];

            for (const entry of entries) {
                const slotIdx = await Promise.race(
                    slots.map((p, i) => p.then(() => i)),
                );

                updateFile(entry.id, { state: 'uploading', progress: 0 });

                slots[slotIdx] = uploadOne(targetEventId, entry.file, (pct) => {
                    updateFile(entry.id, { progress: pct });
                })
                    .then(() => {
                        updateFile(entry.id, {
                            state: 'done',
                            progress: 100,
                            error: undefined,
                        });
                    })
                    .catch((err: unknown) => {
                        updateFile(entry.id, {
                            state: 'failed',
                            error: readUploadErrorMessage(err),
                        });

                        if (isOperatorActionable(err)) {
                            captureSilent(err, {
                                component: 'History/MediaUploader',
                                action: 'media.upload',
                                surface: 'frontend',
                                user_role: userRoleRef.current,
                                extra: {
                                    payload: {
                                        eventId: targetEventId,
                                        fileSize: entry.file.size,
                                        fileType: entry.file.type,
                                    },
                                    http_status:
                                        err instanceof UploadError
                                            ? (err.status ?? undefined)
                                            : undefined,
                                },
                            });
                        }
                    });
            }

            await Promise.all(slots);

            router.reload();
        },
        [updateFile],
    );

    const processFiles = useCallback(
        async (incoming: File[]) => {
            if (eventId === null) {
                const stagedEntries: FileEntry[] = incoming.map((file) => ({
                    id: uid(),
                    file,
                    state: 'staged' as FileState,
                    progress: 0,
                    objectUrl: file.type.startsWith('image/')
                        ? URL.createObjectURL(file)
                        : null,
                }));

                setFiles((prev) => [...prev, ...stagedEntries]);

                return;
            }

            const newEntries: FileEntry[] = incoming.map((file) => ({
                id: uid(),
                file,
                state: 'queued' as FileState,
                progress: 0,
                objectUrl: file.type.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : null,
            }));

            setFiles((prev) => [...prev, ...newEntries]);

            await runUploadPool(eventId, newEntries);
        },
        [eventId, runUploadPool],
    );

    const handleFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList) {
                return;
            }

            // Do NOT bail when eventId is null — staged-tile
            // pre-save drop/pick is the whole point. processFiles itself
            // decides between staging and uploading.
            processFiles(Array.from(fileList));
        },
        [processFiles],
    );

    const drainingRef = useRef(false);
    const filesRef = useRef(files);
    useEffect(() => {
        filesRef.current = files;
    }, [files]);
    useEffect(
        () => () => {
            for (const entry of filesRef.current) {
                if (entry.objectUrl) {
                    URL.revokeObjectURL(entry.objectUrl);
                }
            }
        },
        [],
    );
    useEffect(() => {
        if (eventId === null) {
            return;
        }

        if (drainingRef.current) {
            return;
        }

        const staged = filesRef.current.filter((f) => f.state === 'staged');

        if (staged.length === 0) {
            return;
        }

        drainingRef.current = true;

        queueMicrotask(() => {
            runUploadPool(eventId, staged).finally(() => {
                drainingRef.current = false;
            });
        });
    }, [eventId, runUploadPool]);

    const retryFile = useCallback(
        (entry: FileEntry) => {
            if (!eventId) {
                return;
            }

            updateFile(entry.id, {
                state: 'uploading',
                progress: 0,
                error: undefined,
            });
            uploadOne(eventId, entry.file, (pct) => {
                updateFile(entry.id, { progress: pct });
            })
                .then(() => {
                    updateFile(entry.id, {
                        state: 'done',
                        progress: 100,
                        error: undefined,
                    });
                    router.reload();
                })
                .catch((err: unknown) => {
                    updateFile(entry.id, {
                        state: 'failed',
                        error: readUploadErrorMessage(err),
                    });

                    if (isOperatorActionable(err)) {
                        captureSilent(err, {
                            component: 'History/MediaUploader',
                            action: 'media.upload.retry',
                            surface: 'frontend',
                            user_role: userRoleRef.current,
                            extra: {
                                payload: {
                                    eventId,
                                    fileSize: entry.file.size,
                                    fileType: entry.file.type,
                                },
                                http_status:
                                    err instanceof UploadError
                                        ? (err.status ?? undefined)
                                        : undefined,
                            },
                        });
                    }
                });
        },
        [eventId, updateFile],
    );

    const {
        stagedCount,
        doneCount,
        uploadingCount,
        failedCount,
        lastFailedError,
    } = useMemo(() => {
        let staged = 0;
        let done = 0;
        let uploading = 0;
        let failed = 0;
        let lastErr: string | undefined;

        for (const f of files) {
            if (f.state === 'staged') {
                staged++;
            } else if (f.state === 'done') {
                done++;
            } else if (f.state === 'uploading') {
                uploading++;
            } else if (f.state === 'failed') {
                failed++;

                if (f.error) {
                    lastErr = f.error;
                }
            }
        }

        return {
            stagedCount: staged,
            doneCount: done,
            uploadingCount: uploading,
            failedCount: failed,
            lastFailedError: lastErr,
        };
    }, [files]);

    useEffect(() => {
        onStagedCountChange?.(stagedCount);
    }, [stagedCount, onStagedCountChange]);

    const failedSegment = failedCount
        ? `${failedCount} failed${lastFailedError ? ` — ${lastFailedError}` : ''}`
        : '';

    const hasActiveOrSettled =
        doneCount > 0 || uploadingCount > 0 || failedCount > 0;

    const statusText =
        files.length === 0
            ? ''
            : !hasActiveOrSettled && stagedCount > 0
              ? `${stagedCount} ready to upload`
              : [
                    doneCount ? `${doneCount} uploaded` : '',
                    uploadingCount ? `${uploadingCount} in progress` : '',
                    failedSegment,
                ]
                    .filter(Boolean)
                    .join(' · ');

    return (
        <div>
            <label className="history-media-label">Photos &amp; videos</label>

            <div
                role="button"
                tabIndex={0}
                aria-label={
                    isAwaitingEvent
                        ? 'Drag photos or videos here, or press Enter to browse. They will upload after you save.'
                        : 'Drop photos and videos here, or press Enter to browse'
                }
                className="history-drop-zone"
                style={{
                    border: `2px dashed ${dragOver ? 'var(--history-accent)' : 'var(--history-rule)'}`,
                    backgroundColor: dragOver
                        ? 'var(--history-accent-soft)'
                        : 'transparent',
                }}
                onClick={() => {
                    inputRef.current?.click();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                }}
            >
                <p className="history-upload-prompt">
                    {isAwaitingEvent
                        ? "Drag photos or videos here, or click to choose. They'll upload after you save."
                        : 'Drag photos here or tap to choose.'}
                </p>
                <p className="history-upload-hint">
                    JPEG, PNG, WebP, HEIC · MP4, MOV, WebM · max 100 MB per
                    video
                </p>
            </div>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />

            {files.length > 0 && (
                <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
                    {files.map((entry) => (
                        <UploadTile
                            key={entry.id}
                            entry={entry}
                            onRetry={() => retryFile(entry)}
                            onRemove={() => {
                                if (entry.objectUrl) {
                                    URL.revokeObjectURL(entry.objectUrl);
                                }

                                setFiles((prev) =>
                                    prev.filter((f) => f.id !== entry.id),
                                );
                            }}
                        />
                    ))}
                </div>
            )}

            <p aria-live="polite" className="history-upload-status">
                {statusText}
            </p>
        </div>
    );
}

function UploadTile({
    entry,
    onRetry,
    onRemove,
}: {
    entry: FileEntry;
    onRetry: () => void;
    onRemove: () => void;
}) {
    const { file, state, progress, objectUrl, error } = entry;

    const tileBackground = {
        backgroundColor:
            state === 'failed'
                ? 'var(--history-accent-soft)'
                : 'var(--history-rule)',
    };

    if (state === 'done') {
        return (
            <div className="history-upload-tile" style={tileBackground}>
                {objectUrl && (
                    <img
                        src={objectUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                )}
                {file.type.startsWith('video/') && (
                    <span className="history-upload-play">▶</span>
                )}
                <span className="history-upload-check" aria-hidden="true">
                    ✓
                </span>
            </div>
        );
    }

    if (state === 'uploading') {
        return (
            <div className="history-upload-tile" style={tileBackground}>
                {objectUrl && (
                    <img
                        src={objectUrl}
                        alt=""
                        className="history-upload-preview-dim"
                    />
                )}
                <div className="history-upload-overlay">
                    <span className="history-upload-percent" aria-live="polite">
                        {Math.round(progress)}%
                    </span>
                    <div className="history-upload-progress-track">
                        <div
                            className="h-full bg-white [transition:width_0.1s_linear]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'failed') {
        return (
            <div className="history-upload-tile" style={tileBackground}>
                <AlertCircle
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="mb-1 shrink-0 text-(--history-destructive)"
                />
                <span className="history-upload-failed-name">{file.name}</span>
                {error && (
                    <span className="history-upload-error-text">{error}</span>
                )}
                <Button
                    type="button"
                    variant="outline"
                    onClick={onRetry}
                    className="history-upload-retry h-auto w-auto shadow-none"
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (state === 'staged') {
        const hasThumb = objectUrl !== null;

        return (
            <div
                className="history-upload-tile bg-(--history-accent-soft)"
                style={{
                    padding: hasThumb ? 0 : '8px 6px',
                    justifyContent: hasThumb ? 'flex-end' : 'center',
                }}
            >
                {hasThumb && (
                    <img
                        src={objectUrl}
                        alt={file.name}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                )}

                {hasThumb ? (
                    <span
                        title={file.name}
                        className="history-upload-name-strip"
                    >
                        {file.name}
                    </span>
                ) : (
                    <>
                        <span title={file.name} className="history-upload-name">
                            {file.name}
                        </span>
                        <span className="history-upload-queued">
                            Queued. Uploads after you save.
                        </span>
                    </>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onRemove}
                    aria-label={`Remove ${file.name}`}
                    className="history-upload-remove-hit h-auto w-auto shadow-none"
                >
                    <span
                        aria-hidden="true"
                        className="history-media-remove-dot"
                    >
                        ×
                    </span>
                </Button>
            </div>
        );
    }

    return (
        <div
            className="history-upload-tile opacity-[0.5]"
            style={tileBackground}
        >
            <span className="font-sans text-(length:--text-meta) text-(--history-ink-soft)">
                Queued
            </span>
        </div>
    );
}
