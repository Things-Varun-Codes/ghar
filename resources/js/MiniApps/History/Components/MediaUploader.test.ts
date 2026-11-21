import {
    HttpCancelledError,
    HttpNetworkError,
    HttpResponseError,
} from '@inertiajs/core';
import type { HttpClient, HttpRequestConfig } from '@inertiajs/core';
import { http } from '@inertiajs/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadOne } from './MediaUploader';

const original = http.getClient();
let request: ReturnType<typeof vi.fn<HttpClient['request']>>;

function failWith(status: number, data = '') {
    request.mockRejectedValue(
        new HttpResponseError('failed', { status, data, headers: {} }),
    );
}

function upload() {
    return uploadOne(
        7,
        new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
        () => {},
    );
}

beforeEach(() => {
    request = vi.fn<HttpClient['request']>();
    http.setClient({ request });
});

afterEach(() => {
    http.setClient(original);
});

describe('uploadOne', () => {
    it('posts the file as form data and reports progress as a percentage', async () => {
        request.mockImplementation(async (config: HttpRequestConfig) => {
            config.onUploadProgress?.({ progress: 0.5, loaded: 1, total: 2 });
            config.onUploadProgress?.({
                progress: undefined,
                loaded: 1,
                total: undefined,
            });

            return { status: 201, data: '', headers: {} };
        });
        const onProgress = vi.fn();

        await uploadOne(
            7,
            new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
            onProgress,
        );

        const config = request.mock.calls[0][0];
        expect(config.method).toBe('post');
        expect(config.url).toBe('/apps/our-history/events/7/media');
        expect((config.data as FormData).get('media')).toBeInstanceOf(File);
        expect(config.headers).toEqual({ Accept: 'application/json' });
        expect(onProgress.mock.calls).toEqual([[50]]);
    });

    it('explains a 413 from the proxy', async () => {
        failWith(413);

        await expect(upload()).rejects.toMatchObject({
            status: 413,
            userMessage: 'File too large. Max 96 MB per upload.',
        });
    });

    it('shows the validation errors of a 422', async () => {
        failWith(
            422,
            JSON.stringify({
                message: 'The given data was invalid.',
                errors: { media: ['That type of file is not allowed.'] },
            }),
        );

        await expect(upload()).rejects.toMatchObject({
            status: 422,
            userMessage: 'That type of file is not allowed.',
        });
    });

    it('maps a network failure and a cancel to no status', async () => {
        request.mockRejectedValueOnce(new HttpNetworkError('Network error'));
        await expect(upload()).rejects.toMatchObject({
            status: null,
            userMessage:
                'Network problem. Check your connection and tap Retry.',
        });

        request.mockRejectedValueOnce(new HttpCancelledError());
        await expect(upload()).rejects.toMatchObject({
            status: null,
            userMessage: 'Upload cancelled.',
        });
    });
});
