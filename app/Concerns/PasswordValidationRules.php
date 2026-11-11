<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /** @return array<int, ValidationRule|array<mixed>|string> */
    protected function passwordRules(): array
    {
        return ['required', 'string', Password::defaults(), 'confirmed'];
    }
}
