<?php

namespace App\Shell\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyChangedEmailNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $newEmail,
        private readonly string $verifyUrl,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->view('mail.verify-changed-email', [
                'newEmail' => $this->newEmail,
                'verifyUrl' => $this->verifyUrl,
            ]);
    }
}
