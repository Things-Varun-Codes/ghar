<?php

namespace App\MiniApps\Mailbox\Support;

class BouquetPromptBuilder
{
    private const VANTAGE = [
        'Seen straight on, the whole bouquet in frame.',
        'Seen from a slight overhead angle, looking down into the blooms.',
        'A close crop — the blooms fill the frame, the binding just visible at the bottom.',
        'Held in two hands, offered toward the viewer.',
        'Resting at a slight tilt, stems angled across the frame.',
    ];

    private const WRAP = [
        'Wrapped in brown kraft paper and tied with string.',
        'Wrapped in soft tissue paper, loosely folded.',
        'Bound in a piece of cloth, edges frayed.',
        'Sleeved in a sheet of newsprint.',
        'Tied with twine alone, stems bare and showing.',
        'Wrapped in translucent vellum with a ribbon bow.',
    ];

    private const LIGHT = [
        'Warm afternoon sunlight, long soft shadows.',
        'Cool, even morning light.',
        'Muted dusk tones, low and golden.',
        'High-key pastel light, airy and pale.',
        'Overcast diffused light, gentle and shadowless.',
    ];

    private const GROUND = [
        'Plain off-white background.',
        'A soft wash of color behind, bleeding at the edges.',
        'Laid on a wooden tabletop.',
        'Set on a windowsill with light behind it.',
        'Against visibly textured watercolor paper, the grain showing through.',
        'A faint hand-painted background with a suggestion of foliage.',
    ];

    private const TECHNIQUE = [
        'Loose wet-on-wet washes, colors bleeding softly into one another.',
        'Ink and wash — visible pen linework over transparent color.',
        'Opaque gouache, flat confident shapes with little blending.',
        'Fine dry-brush detail, crisp petal edges.',
        'Sparse, minimal brushwork with large areas of the paper left bare.',
    ];

    public static function build(array $flowerNames, ?string $refine = null): string
    {
        $flowerList = implode(', ', $flowerNames);

        $prompt = 'A soft watercolor illustration of a hand-tied bouquet of flowers, '
            .'gathered as if just handed to someone as a gift. '
            ."Flowers include: {$flowerList}. "
            .self::pick(self::WRAP).' '
            .self::pick(self::VANTAGE).' '
            .self::pick(self::LIGHT).' '
            .self::pick(self::GROUND).' '
            .self::pick(self::TECHNIQUE).' '
            .'Portrait orientation, 3:4 aspect ratio, taller than wide. '
            .'Delicate, warm, painted style — NOT photoreal. '
            .'Warm, intimate, personal feeling.';

        if ($refine !== null && trim($refine) !== '') {
            $prompt .= ' Additional detail: '.trim($refine);
        }

        return $prompt;
    }

    private static function pick(array $options): string
    {
        return $options[random_int(0, count($options) - 1)];
    }
}
