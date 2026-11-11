<?php

namespace App\Shell\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class GenericPushNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array{app: string, body: string, url?: string, title?: string, tag?: string}  $payload
     * @param  list<'push'|'email'>  $channels
     */
    public function __construct(
        private readonly array $payload,
        private readonly array $channels,
    ) {}

    /** @return array<int, class-string|string> */
    public function via(mixed $notifiable): array
    {
        return array_map(
            fn (string $c) => $c === 'push' ? WebPushChannel::class : 'mail',
            $this->channels,
        );
    }

    public function toWebPush(mixed $notifiable, mixed $notification): WebPushMessage
    {
        $title = $this->payload['title']
            ?? collect(config('miniapps', []))
                ->firstWhere('slug', $this->payload['app'])['name']
            ?? $this->payload['app'];

        return (new WebPushMessage)
            ->title($title)
            ->body($this->payload['body'])
            ->data(['url' => $this->payload['url'] ?? '/dashboard'])
            ->tag($this->payload['tag'] ?? $this->payload['app']);
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->payload['title'] ?? config('app.name'))
            ->line($this->payload['body'])
            ->action('Open', url($this->payload['url'] ?? '/dashboard'));
    }
}
