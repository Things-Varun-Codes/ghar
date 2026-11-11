<x-mail.layouts.warm title="Confirm your new email address">
    <p style="margin:0 0 16px;">You asked to change your {{ config('app.name') }} email to <strong>{{ $newEmail }}</strong>.</p>

    <p style="margin:0 0 24px;">Tap below to confirm. The link works for the next hour.</p>

    <a href="{{ $verifyUrl }}"
       style="display:inline-block;padding:12px 24px;background:#B45827;color:#FFFEFB;text-decoration:none;border-radius:8px;font-weight:600;">
        Confirm email change
    </a>

    <p style="margin:24px 0 0;font-size:14px;color:#7A716A;">
        Didn't ask for this? Sign in and change your password right away. Someone may have access to your account.
    </p>

    <p style="margin:16px 0 0;font-size:12px;color:#7A716A;word-break:break-all;">
        Or copy this link: {{ $verifyUrl }}
    </p>
</x-mail.layouts.warm>
