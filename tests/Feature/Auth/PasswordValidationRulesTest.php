<?php

namespace Tests\Feature\Auth;

use App\Concerns\PasswordValidationRules;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class PasswordValidationRulesTest extends TestCase
{
    private function subject(): object
    {
        return new class
        {
            use PasswordValidationRules;

            /** @return array<int, mixed> */
            public function rules(): array
            {
                return $this->passwordRules();
            }
        };
    }

    public function test_weak_password_fails_validation(): void
    {
        $subject = $this->subject();

        $validator = Validator::make(
            ['password' => 'a', 'password_confirmation' => 'a'],
            ['password' => $subject->rules()],
        );

        $this->assertTrue(
            $validator->fails(),
            "Weak password 'a' was accepted by the trait. "
            .'PasswordValidationRules::passwordRules() must include Password::defaults(), '
            .'which resolves to either the chain registered in AppServiceProvider::configureDefaults '
            .'(production: min(12)+mixedCase+letters+numbers+symbols+uncompromised) or the framework '
            .'fallback Password::min(8) when the registered callback returns null (non-prod). Both '
            .'paths must reject a single-character password.',
        );

        $this->assertArrayHasKey('password', $validator->errors()->toArray());
    }

    public function test_strong_password_passes_validation(): void
    {
        $subject = $this->subject();

        $strong = 'Th!sIsAStr0ngPassw0rd';

        $validator = Validator::make(
            ['password' => $strong, 'password_confirmation' => $strong],
            ['password' => $subject->rules()],
        );

        $this->assertTrue(
            $validator->passes(),
            'Strong password unexpectedly rejected. Errors: '.json_encode($validator->errors()->toArray()),
        );
    }

    public function test_mismatched_confirmation_fails(): void
    {
        $subject = $this->subject();

        $validator = Validator::make(
            ['password' => 'Th!sIsAStr0ngPassw0rd', 'password_confirmation' => 'different'],
            ['password' => $subject->rules()],
        );

        $this->assertTrue($validator->fails(), 'Mismatched confirmation must fail the confirmed rule.');
        $this->assertArrayHasKey('password', $validator->errors()->toArray());
    }
}
