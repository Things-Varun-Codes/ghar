<?php

namespace Database\Seeders\DevData;

use GdImage;

/**
 * Draws soft gradient placeholders with GD, so seeding needs no network and no
 * binary fixtures. The same arguments always produce the same image.
 */
final class PlaceholderImage
{
    private const PALETTE = [
        [[244, 196, 164], [172, 112, 140]],
        [[255, 224, 178], [230, 126, 96]],
        [[182, 214, 204], [76, 132, 148]],
        [[206, 196, 232], [106, 96, 168]],
        [[226, 232, 180], [122, 158, 104]],
        [[250, 208, 214], [196, 92, 120]],
    ];

    public static function jpeg(string $label, int $seed, int $width = 960, int $height = 640): string
    {
        [$top, $bottom] = self::PALETTE[$seed % count(self::PALETTE)];

        $image = imagecreatetruecolor($width, $height);

        for ($y = 0; $y < $height; $y++) {
            $mix = $y / max($height - 1, 1);
            imageline($image, 0, $y, $width, $y, self::blend($image, $top, $bottom, $mix));
        }

        // Offset by seed so neighbouring tiles don't look identical.
        $sun = (int) (min($width, $height) * 0.36);
        $x = (int) ($width * (0.2 + (($seed * 37) % 60) / 100));
        $y = (int) ($height * (0.25 + (($seed * 23) % 30) / 100));
        imagefilledellipse($image, $x, $y, $sun, $sun, imagecolorallocatealpha($image, 255, 255, 255, 70));

        imagestring($image, 5, 24, $height - 40, $label, imagecolorallocate($image, 255, 255, 255));

        ob_start();
        imagejpeg($image, null, 80);

        return (string) ob_get_clean();
    }

    /**
     * The same picture as an inline SVG, for a column that holds a URL the browser loads as
     * it is (a song's cover, a movie's poster). Those are other sites' images in a real
     * household. A path on the media disk can't stand in for one: that disk only answers
     * signed URLs, so it would 403.
     */
    public static function svgDataUri(string $label, int $seed, int $width, int $height): string
    {
        [$top, $bottom] = self::PALETTE[$seed % count(self::PALETTE)];

        $sun = (int) (min($width, $height) * 0.18);
        $x = (int) ($width * (0.2 + (($seed * 37) % 60) / 100));
        $y = (int) ($height * (0.25 + (($seed * 23) % 30) / 100));

        $svg = sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" width="%1$d" height="%2$d" viewBox="0 0 %1$d %2$d">'
            .'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
            .'<stop offset="0" stop-color="rgb(%3$s)"/><stop offset="1" stop-color="rgb(%4$s)"/>'
            .'</linearGradient></defs>'
            .'<rect width="100%%" height="100%%" fill="url(#g)"/>'
            .'<circle cx="%5$d" cy="%6$d" r="%7$d" fill="#fff" fill-opacity=".45"/>'
            .'<text x="24" y="%8$d" fill="#fff" font-family="sans-serif" font-size="18">%9$s</text>'
            .'</svg>',
            $width,
            $height,
            implode(',', $top),
            implode(',', $bottom),
            $x,
            $y,
            $sun,
            $height - 24,
            htmlspecialchars($label, ENT_XML1 | ENT_QUOTES),
        );

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /**
     * @param  array{int, int, int}  $from
     * @param  array{int, int, int}  $to
     */
    private static function blend(GdImage $image, array $from, array $to, float $mix): int
    {
        return imagecolorallocate(
            $image,
            (int) ($from[0] + ($to[0] - $from[0]) * $mix),
            (int) ($from[1] + ($to[1] - $from[1]) * $mix),
            (int) ($from[2] + ($to[2] - $from[2]) * $mix),
        );
    }
}
