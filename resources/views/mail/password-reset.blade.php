<x-mail.layouts.warm title="Reset your password">
    <p style="margin:0 0 16px;">Someone (hopefully you) asked to reset your {{ config('app.name') }} password.</p>

    <p style="margin:0 0 24px;">Tap the button below to pick a new one. The link works for the next hour.</p>

    <a href="{{ $resetUrl }}"
       style="display:inline-block;padding:12px 24px;background:#B45827;color:#FFFEFB;text-decoration:none;border-radius:8px;font-weight:600;">
        Reset password
    </a>

    <p style="margin:24px 0 0;font-size:14px;color:#7A716A;">
        Didn't ask for this? You can ignore the email. Your password stays the same.
    </p>

    <p style="margin:16px 0 0;font-size:12px;color:#7A716A;word-break:break-all;">
        Or copy this link: {{ $resetUrl }}
    </p>
</x-mail.layouts.warm>
