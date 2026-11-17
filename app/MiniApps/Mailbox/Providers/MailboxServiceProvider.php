<?php

namespace App\MiniApps\Mailbox\Providers;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Policies\CitationPolicy;
use App\MiniApps\Mailbox\Policies\CouponPolicy;
use App\MiniApps\Mailbox\Policies\RecipientMailPolicy;
use App\MiniApps\Mailbox\Services\CloudflareBouquetGenerator;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\MiniApps\Mailbox\Support\DashboardLine;
use App\MiniApps\Mailbox\Support\DashboardPreview;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\Rooms;
use App\Shell\Services\UserOwnedContent;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class MailboxServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Fails loudly on a misconfigured provider instead of silently faking images in
        // production.
        $this->app->bind(
            BouquetImageGenerator::class,
            function ($app): CloudflareBouquetGenerator|FakeBouquetGenerator {
                $provider = config('services.bouquet.provider');

                if ($provider === 'cloudflare') {
                    $accountId = config('services.bouquet.cf_account_id');
                    $token = config('services.bouquet.cf_token');

                    if (empty($accountId) || empty($token)) {
                        throw new \RuntimeException(
                            'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_TOKEN are required when BOUQUET_IMAGE_PROVIDER=cloudflare'
                        );
                    }

                    return new CloudflareBouquetGenerator(
                        accountId: $accountId,
                        apiToken: $token,
                        model: config(
                            'services.bouquet.cf_model',
                            '@cf/black-forest-labs/flux-1-schnell'
                        ),
                    );
                }

                if ($provider === 'fake') {
                    return new FakeBouquetGenerator;
                }

                if ($app->environment(['local', 'testing'])) {
                    return new FakeBouquetGenerator;
                }

                throw new \RuntimeException(
                    'BOUQUET_IMAGE_PROVIDER must be set (cloudflare|fake) in production'
                );
            }
        );
    }

    public function boot(DashboardSummaries $summaries, UserOwnedContent $ownedContent, Rooms $rooms): void
    {
        EntryTypes::register($rooms);

        $ownedContent->register('mailbox_messages', ['sender_id'], 'Mailbox messages');
        $ownedContent->register('mailbox_message_recipients', ['user_id'], 'Mailbox messages received');
        $ownedContent->register('mailbox_citations', ['issuer_id', 'recipient_id'], 'Mailbox citations');
        $ownedContent->register('mailbox_coupons', ['issuer_id', 'recipient_id'], 'Mailbox coupons');
        $ownedContent->register('mailbox_bouquets', ['sender_id'], 'Mailbox flowers');
        $ownedContent->register('mailbox_bouquet_recipients', ['user_id'], 'Mailbox flowers received');

        $summaries->register('our-mailbox', fn (User $user): string => DashboardLine::forUser($user));
        $summaries->registerPreview('our-mailbox', fn (User $user): ?array => DashboardPreview::forUser($user));

        // A guest is covered: `??` reads ->id off a null user() without an error.
        RateLimiter::for('mailbox-mutations', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()->id ?? $request->ip()));
        });

        // Tight because each call spends Cloudflare Workers AI quota.
        RateLimiter::for('bouquet-generate', function (Request $request) {
            return Limit::perMinute(3)->by((string) ($request->user()->id ?? $request->ip()));
        });

        Gate::policy(Citation::class, CitationPolicy::class);

        Gate::policy(Coupon::class, CouponPolicy::class);

        Gate::policy(MailboxMessage::class, RecipientMailPolicy::class);
        Gate::policy(Bouquet::class, RecipientMailPolicy::class);
    }
}
