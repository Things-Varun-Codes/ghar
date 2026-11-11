<?php

namespace App\Shell\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class TestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @return array<int, class-string|string> */
    public function via(mixed $notifiable): array
    {
        return [WebPushChannel::class, 'mail'];
    }

    public function toWebPush(mixed $notifiable, mixed $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title(config('app.name'))
            ->body('If you see this, push is working.')
            ->data(['url' => '/dashboard'])
            ->tag('shell');
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(config('app.name').' test notification')
            ->line('If you see this, the email channel is working.');
    }
}
