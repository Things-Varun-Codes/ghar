<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? config('app.name') }}</title>
</head>
<body style="background:#FAF5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2A2622;margin:0;padding:0;">
    <div style="max-width:560px;margin:48px auto;padding:32px;background:#FFFEFB;border-radius:12px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#B45827;line-height:1;">{{ config('app.name') }}</div>
        <div style="margin-top:24px;color:#2A2622;">{{ $slot }}</div>
    </div>
</body>
</html>
