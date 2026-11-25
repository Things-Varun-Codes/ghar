<?php

namespace App\MiniApps\Mailbox\Providers;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Policies\CitationPolicy;
use App\MiniApps\Mailbox\Policies\CouponPolicy;
use App\MiniApps\Mailbox\Policies\ExpenseGroupPolicy;
use App\MiniApps\Mailbox\Policies\ExpensePolicy;
use App\MiniApps\Mailbox\Policies\RecipientMailPolicy;
use App\MiniApps\Mailbox\Services\CloudflareImageGenerator;
use App\MiniApps\Mailbox\Services\FakeImageGenerator;
use App\MiniApps\Mailbox\Services\OpenAiImageGenerator;
use App\MiniApps\Mailbox\Support\DashboardFeed;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\ImageAi;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\Rooms;
use App\Shell\Services\UserOwnedContent;
use App\Shell\Support\Limits;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class MailboxServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ImageGenerator::class, function (): ImageGenerator {
            if (($missing = ImageAi::missing()) !== null) {
                throw new \RuntimeException($missing);
            }

            $config = config('services.image_ai');

            return match (ImageAi::provider()) {
                ImageAi::OPENAI => new OpenAiImageGenerator($config['url'], $config['key'], $config['model'], $config['size']),
                ImageAi::CLOUDFLARE => new CloudflareImageGenerator($config['url'], $config['key'], $config['model']),
                default => new FakeImageGenerator,
            };
        });
    }

    public function boot(DashboardSummaries $summaries, UserOwnedContent $ownedContent, Rooms $rooms): void
    {
        EntryTypes::register($rooms);

        $ownedContent->register('mailbox_messages', ['sender_id'], 'Exchange messages');
        $ownedContent->register('mailbox_message_recipients', ['user_id'], 'Exchange messages received');
        $ownedContent->register('mailbox_citations', ['issuer_id', 'recipient_id'], 'Exchange citations');
        $ownedContent->register('mailbox_coupons', ['issuer_id', 'recipient_id'], 'Exchange coupons');
        $ownedContent->register('mailbox_postcards', ['sender_id'], 'Exchange postcards');
        $ownedContent->register('mailbox_postcard_recipients', ['user_id'], 'Exchange postcards received');
        $ownedContent->register('mailbox_expense_groups', ['created_by_id'], 'Exchange expense groups created');
        $ownedContent->register('mailbox_expense_group_members', ['user_id'], 'Exchange expense groups joined');
        $ownedContent->register('mailbox_expenses', ['paid_by_id', 'created_by_id', 'updated_by_id', 'deleted_by_id'], 'Exchange expenses');
        $ownedContent->register('mailbox_expense_shares', ['user_id'], 'Exchange expense shares');
        $ownedContent->register('mailbox_expense_activity', ['actor_id'], 'Exchange expense activity');

        $summaries->registerFeed('our-exchange', fn (User $user): array => DashboardFeed::forUser($user));

        RateLimiter::for('mailbox-mutations', Limits::perUser(30));

        // Tight because each call spends the image model's quota.
        RateLimiter::for('postcard-generate', Limits::perUser(3));

        Gate::policy(Citation::class, CitationPolicy::class);

        Gate::policy(Coupon::class, CouponPolicy::class);

        Gate::policy(ExpenseGroup::class, ExpenseGroupPolicy::class);
        Gate::policy(Expense::class, ExpensePolicy::class);

        Gate::policy(MailboxMessage::class, RecipientMailPolicy::class);
        Gate::policy(Postcard::class, RecipientMailPolicy::class);
    }
}
