/*
 * The picture is cropped in the browser, so whatever the camera produced (HEIC on a Mac, a
 * 40-megapixel photo) leaves as a small square the server accepts. The server draws it again
 * as a 512px WebP either way.
 */

export type CropArea = { x: number; y: number; width: number; height: number };

export const PICTURE_SIZE = 512;

/* The server refuses anything smaller across. */
export const MIN_PICTURE_SIZE = 64;

/* Only what the browser has to decode before cropping; the upload itself is the small square. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/* What the file picker offers. Phones hand over their camera photos as JPEG. */
export const PICTURE_ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif';

export function pictureProblem(file: File): string | null {
    // No SVG: it can carry script, and the server refuses it.
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return 'Choose a photo: a JPEG, PNG or WebP picture.';
    }

    if (file.size > MAX_SOURCE_BYTES) {
        return "That picture's too big to open. Choose one under 40 MB.";
    }

    return null;
}

/* Never upscaled past what was chosen, and never below what the server accepts. */
export function outputSize(area: CropArea): number {
    const chosen = Math.round(Math.min(area.width, area.height));

    return Math.max(MIN_PICTURE_SIZE, Math.min(PICTURE_SIZE, chosen));
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error('The picture could not be decoded.'));
        image.src = src;
    });
}

export async function cropPicture(src: string, area: CropArea): Promise<File> {
    const image = await loadImage(src);
    const size = outputSize(area);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('No 2D canvas to crop on.');
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        size,
        size,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
    );

    if (!blob) {
        throw new Error('The cropped picture could not be encoded.');
    }

    // A browser without a WebP encoder hands back a PNG; name the file for what it is.
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';

    return new File([blob], `picture.${extension}`, { type: blob.type });
}
