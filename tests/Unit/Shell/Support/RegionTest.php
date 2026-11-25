<?php

namespace Tests\Unit\Shell\Support;

use App\Shell\Support\Region;
use InvalidArgumentException;
use Tests\TestCase;

class RegionTest extends TestCase
{
    public function test_the_locale_follows_the_timezones_country(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata', 'shell.locale' => null, 'shell.currency' => null]);

        $this->assertSame('en-IN', Region::locale());
        $this->assertSame(0, Region::weekStart());
    }

    public function test_utc_reads_as_british_english_with_a_monday_week(): void
    {
        config(['shell.timezone' => 'UTC', 'shell.locale' => null]);

        $this->assertSame('en-GB', Region::locale());
        $this->assertSame(1, Region::weekStart());
    }

    public function test_an_explicit_locale_wins(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata', 'shell.locale' => 'en_GB']);

        $this->assertSame('en-GB', Region::locale());
        $this->assertSame(1, Region::weekStart());
    }

    public function test_today_is_the_households_date(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata']);
        $this->travelTo('2026-11-19 20:00:00');

        $this->assertSame('2026-11-20', Region::today()->toDateString());
    }

    public function test_an_unknown_timezone_is_refused(): void
    {
        config(['shell.timezone' => 'Mars/Olympus']);

        $this->expectException(InvalidArgumentException::class);
        Region::timezone();
    }

    public function test_the_page_gets_the_region(): void
    {
        config(['shell.timezone' => 'Asia/Kolkata', 'shell.locale' => null, 'shell.currency' => null]);

        $this->assertSame(
            ['timezone' => 'Asia/Kolkata', 'locale' => 'en-IN', 'week_start' => 0, 'currency' => 'INR'],
            Region::forPage(),
        );
    }

    public function test_an_unset_currency_follows_the_timezones_country_not_the_locale(): void
    {
        config(['shell.currency' => null, 'shell.timezone' => 'Asia/Kolkata', 'shell.locale' => 'en-GB']);
        $this->assertSame('INR', Region::currency());

        config(['shell.timezone' => 'Asia/Tokyo']);
        $this->assertSame('JPY', Region::currency());

        config(['shell.timezone' => 'UTC']);
        $this->assertSame('GBP', Region::currency());
    }

    public function test_the_currency_is_a_three_letter_code(): void
    {
        config(['shell.currency' => 'eur']);
        $this->assertSame('EUR', Region::currency());

        config(['shell.currency' => 'rupees']);
        $this->expectException(InvalidArgumentException::class);
        Region::currency();
    }
}
