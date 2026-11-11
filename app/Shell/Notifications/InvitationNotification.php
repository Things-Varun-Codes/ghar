<?php

namespace App\Shell\Notifications;

use App\Shell\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Invitation $invitation,
        private readonly string $plaintext,
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $acceptUrl = route('invitations.accept.show', ['token' => $this->plaintext]);

        return (new MailMessage)
            ->view('mail.invitation', [
                'invitation' => $this->invitation,
                'acceptUrl' => $acceptUrl,
            ]);
    }
}
