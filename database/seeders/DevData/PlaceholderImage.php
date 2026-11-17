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
