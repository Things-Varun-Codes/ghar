<x-mail.layouts.warm :title="'You\'re invited to '.config('app.name')">
    <p style="margin:0 0 16px;">You've been invited to {{ config('app.name') }} as a <strong>{{ $invitation->role_name }}</strong>.</p>

    <p style="margin:0 0 24px;">Tap below to accept and set yourself up. The link works for the next 7 days.</p>

    <a href="{{ $acceptUrl }}"
       style="display:inline-block;padding:12px 24px;background:#B45827;color:#FFFEFB;text-decoration:none;border-radius:8px;font-weight:600;">
        Accept invitation
    </a>

    <p style="margin:24px 0 0;font-size:14px;color:#7A716A;">
        Not expecting this? You can ignore it.
    </p>

    <p style="margin:16px 0 0;font-size:12px;color:#7A716A;word-break:break-all;">
        Or copy this link: {{ $acceptUrl }}
    </p>
</x-mail.layouts.warm>
