#!/usr/bin/env node
/*
 * Draws every app icon from public/favicon.svg, the one source of Ghar's mark: the PWA icons,
 * the iOS home-screen icon and favicon.ico. Run `npm run icons` after changing the SVG.
 *
 * Chromium (Playwright's, already installed for the smokes) loads the SVG as an image, as the
 * page and the tab do, so the PNGs match what a browser draws, and an SVG a browser can't read
 * stops the script instead of drawing blank icons.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const pub = fileURLToPath(new URL('../public/', import.meta.url));
const svgUrl = `data:image/svg+xml;base64,${readFileSync(`${pub}favicon.svg`).toString('base64')}`;
const paper = '#f6f3ee'; // --shell-bg, and the manifest's background_color

/*
 * mark: the glyph's share of the canvas. radius: the tile's corner as a share of its side,
 * null for a full square (iOS and Android crop those themselves). A maskable icon keeps the
 * mark inside the middle 80% safe zone.
 */
const targets = [
    { file: 'icon-192.png', size: 192, mark: 0.72, radius: 0.22 },
    { file: 'icon-512.png', size: 512, mark: 0.72, radius: 0.22 },
    { file: 'icon-maskable-512.png', size: 512, mark: 0.58, radius: null },
    { file: 'apple-touch-icon.png', size: 180, mark: 0.64, radius: null },
];
const icoSizes = [16, 32];

function page(size, mark, radius) {
    const tile =
        radius === undefined
            ? 'background:transparent;'
            : `background:${paper};border-radius:${radius === null ? 0 : radius * 100}%;`;
    const glyph = Math.round(size * mark);

    return `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${tile}">
<img src="${svgUrl}" width="${glyph}" height="${glyph}" alt="">
</div></body></html>`;
}

/* An .ico that wraps PNGs, which every current browser reads. */
function ico(pngs) {
    const header = Buffer.alloc(6 + 16 * pngs.length);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(pngs.length, 4);
    let offset = header.length;

    pngs.forEach(({ size, data }, i) => {
        const at = 6 + 16 * i;
        header.writeUInt8(size, at);
        header.writeUInt8(size, at + 1);
        header.writeUInt16LE(1, at + 4);
        header.writeUInt16LE(32, at + 6);
        header.writeUInt32LE(data.length, at + 8);
        header.writeUInt32LE(offset, at + 12);
        offset += data.length;
    });

    return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();

try {
    const tab = await browser.newPage();

    async function render(size, mark, radius) {
        await tab.setViewportSize({ width: size, height: size });
        await tab.setContent(page(size, mark, radius));
        const loaded = await tab.$eval('img', (img) =>
            img.decode().then(
                () => img.naturalWidth > 0,
                () => false,
            ),
        );

        if (!loaded) {
            throw new Error(
                'public/favicon.svg did not load as an image; is it valid XML?',
            );
        }

        return tab.screenshot({
            clip: { x: 0, y: 0, width: size, height: size },
            omitBackground: true,
        });
    }

    for (const { file, size, mark, radius } of targets) {
        writeFileSync(`${pub}${file}`, await render(size, mark, radius));
        console.log(`[icons] ${file}`);
    }

    const small = [];

    for (const size of icoSizes) {
        small.push({ size, data: await render(size, 1, undefined) });
    }

    writeFileSync(`${pub}favicon.ico`, ico(small));
    console.log('[icons] favicon.ico');
} finally {
    await browser.close();
}
