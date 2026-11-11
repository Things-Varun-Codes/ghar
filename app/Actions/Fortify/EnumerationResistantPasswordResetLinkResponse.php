<?php

namespace App\Actions\Fortify;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;

/**
 * Fortify's default failed response reveals that an email isn't registered. This returns
 * exactly what the success response does, so /forgot-password can't be used to probe for
 * accounts.
 */
class EnumerationResistantPasswordResetLinkResponse implements FailedPasswordResetLinkRequestResponse
{
    public function toResponse($request)
    {
        $status = trans('passwords.sent');

        return $request->wantsJson()
            ? new JsonResponse(['message' => $status], 200)
            : back()->with('status', $status);
    }
}
