<?php

namespace Tests\Unit\Mailbox;

use App\MiniApps\Mailbox\Support\ExpenseCategory;
use App\Shell\Support\LucideIcon;
use PHPUnit\Framework\TestCase;

class ExpenseCategoryTest extends TestCase
{
    public function test_every_category_has_an_icon_the_page_can_draw_and_something_to_match(): void
    {
        $icons = [];

        foreach (ExpenseCategory::forPage() as $category) {
            $this->assertTrue(LucideIcon::isValid($category['icon']), "{$category['key']}: {$category['icon']}");
            $this->assertNotSame('receipt-text', $category['icon'], 'the receipt is for an expense with no category');
            $this->assertNotSame('', $category['emoji']);
            $icons[] = $category['icon'];
        }

        $this->assertSame($icons, array_unique($icons), 'two categories would look the same');
    }
}
