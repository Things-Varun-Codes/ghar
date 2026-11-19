<?php

namespace App\Shell\Support;

use Carbon\CarbonImmutable;
use DateTimeZone;
use IntlCalendar;
use InvalidArgumentException;

/**
 * Where the household lives: its timezone, the locale its dates read in, and the day its
 * week starts. One per install, from GHAR_TIMEZONE and GHAR_LOCALE.
 */
final class Region
{
    /** What a date reads like when the timezone names no country (UTC). */
    private const FALLBACK_LOCALE = 'en-GB';

    public static function timezone(): string
    {
        $timezone = (string) config('shell.timezone');

        if (! in_array($timezone, DateTimeZone::listIdentifiers(), true)) {
            throw new InvalidArgumentException("GHAR_TIMEZONE must be a timezone such as Asia/Kolkata, not '{$timezone}'.");
        }

        return $timezone;
    }

    /** A BCP 47 tag such as en-IN, for the browser's Intl. */
    public static function locale(): string
    {
        $configured = config('shell.locale');

        if (is_string($configured) && $configured !== '') {
            return str_replace('_', '-', $configured);
        }

        $country = (new DateTimeZone(self::timezone()))->getLocation()['country_code'] ?? '??';

        return preg_match('/^[A-Z]{2}$/', $country) === 1 ? "en-{$country}" : self::FALLBACK_LOCALE;
    }

    /** 0 for Sunday through 6 for Saturday, as JavaScript's Date counts. */
    public static function weekStart(): int
    {
        $calendar = IntlCalendar::createInstance(self::timezone(), str_replace('-', '_', self::locale()));

        // ICU counts from 1 = Sunday.
        return $calendar === null ? 1 : ($calendar->getFirstDayOfWeek() - 1) % 7;
    }

    /** Now on the household's clock. */
    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::timezone());
    }

    public static function today(): CarbonImmutable
    {
        return self::now()->startOfDay();
    }

    /** @return array{timezone: string, locale: string, week_start: int} */
    public static function forPage(): array
    {
        return [
            'timezone' => self::timezone(),
            'locale' => self::locale(),
            'week_start' => self::weekStart(),
        ];
    }
}
