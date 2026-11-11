<?php

namespace Tests\Feature\Shell;

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Exceptions;
use Minishlink\WebPush\MessageSentReport;
use NotificationChannels\WebPush\Events\NotificationFailed;
use NotificationChannels\WebPush\PushSubscription;
use NotificationChannels\WebPush\WebPushMessage;
use RuntimeException;
use Tests\TestCase;

class ReportFailedPushTest extends TestCase
{
    private const ENDPOINT = 'https://push.example.test/send/secret-token';

    private function failureWith(?int $status): NotificationFailed
    {
        return new NotificationFailed(
            new MessageSentReport(
                new Request('POST', self::ENDPOINT),
                $status === null ? null : new Response($status),
                false,
                'rejected '.self::ENDPOINT,
            ),
            new PushSubscription,
            new WebPushMessage,
        );
    }

    public function test_a_rejected_push_is_reported_without_its_endpoint(): void
    {
        Exceptions::fake();

        event($this->failureWith(500));

        Exceptions::assertReported(fn (RuntimeException $e): bool => $e->getMessage()
            === 'Web push delivery failed (500 from push.example.test).');
    }

    public function test_a_transport_failure_is_reported(): void
    {
        Exceptions::fake();

        event($this->failureWith(null));

        Exceptions::assertReported(fn (RuntimeException $e): bool => str_contains($e->getMessage(), 'no response'));
    }

    public function test_an_expired_subscription_is_not_reported(): void
    {
        Exceptions::fake();

        event($this->failureWith(410));

        Exceptions::assertNothingReported();
    }
}
