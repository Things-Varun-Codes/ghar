<?php

namespace App\Shell\Listeners;

use NotificationChannels\WebPush\Events\NotificationFailed;
use RuntimeException;

/**
 * The webpush channel dispatches NotificationFailed and doesn't throw, so a rejected push is
 * invisible without this. Expired subscriptions are routine: the package's ReportHandler has
 * already deleted them. Only the push service's host is reported, never the endpoint.
 */
class ReportFailedPush
{
    public function handle(NotificationFailed $event): void
    {
        if ($event->report->isSubscriptionExpired()) {
            return;
        }

        $status = $event->report->getResponse()?->getStatusCode() ?? 'no response';
        $host = parse_url($event->report->getEndpoint(), PHP_URL_HOST) ?: 'unknown host';

        report(new RuntimeException("Web push delivery failed ({$status} from {$host})."));
    }
}
