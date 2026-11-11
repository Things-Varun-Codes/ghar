<?php

namespace Tests\Unit\Mailbox;

use App\MiniApps\Mailbox\Support\BouquetPromptBuilder;
use Tests\TestCase;

class BouquetPromptBuilderTest extends TestCase
{
    private const FLOWERS = ['Red Rose', 'Peony', 'Lavender'];

    public function test_repeated_builds_with_identical_flowers_produce_varied_prompts(): void
    {
        $prompts = [];

        for ($i = 0; $i < 40; $i++) {
            $prompts[] = BouquetPromptBuilder::build(self::FLOWERS);
        }

        $distinct = array_unique($prompts);

        $this->assertGreaterThan(
            1,
            count($distinct),
            'build() returned the same prompt on every call — the variation axes are not rolling.'
        );
    }

    public function test_identity_invariants_appear_in_every_prompt(): void
    {
        for ($i = 0; $i < 40; $i++) {
            $prompt = BouquetPromptBuilder::build(self::FLOWERS);

            // Watercolor, explicitly not photoreal.
            $this->assertStringContainsString('watercolor', $prompt);
            $this->assertStringContainsString('NOT photoreal', $prompt);

            // Hand-tied bouquet handed over as a gift.
            $this->assertStringContainsString('hand-tied', $prompt);
            $this->assertStringContainsString('gift', $prompt);

            // Portrait 3:4.
            $this->assertStringContainsString('3:4', $prompt);
            $this->assertStringContainsString('taller than wide', $prompt);

            // The selection itself.
            foreach (self::FLOWERS as $flower) {
                $this->assertStringContainsString($flower, $prompt);
            }
        }
    }

    public function test_refine_text_is_appended_when_supplied(): void
    {
        $prompt = BouquetPromptBuilder::build(self::FLOWERS, '  with a small blue ribbon  ');

        $this->assertStringContainsString('Additional detail: with a small blue ribbon', $prompt);
    }

    public function test_blank_refine_is_ignored(): void
    {
        $this->assertStringNotContainsString(
            'Additional detail',
            BouquetPromptBuilder::build(self::FLOWERS, '   ')
        );

        $this->assertStringNotContainsString(
            'Additional detail',
            BouquetPromptBuilder::build(self::FLOWERS, null)
        );
    }
}
