<?php

namespace App\Shell\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $token,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $email = $notifiable->getEmailForPasswordReset();

        $resetUrl = route('password.reset', [
            'token' => $this->token,
            'email' => $email,
        ]);

        return (new MailMessage)
            ->view('mail.password-reset', [
                'resetUrl' => $resetUrl,
            ]);
    }
}
