<?php

namespace App\Shell\Support;

use App\Shell\Models\User;
use App\Shell\Services\Household;

/**
 * How a person is sent to a page wherever they're named: id, name and a signed picture URL
 * (null without one, and the page draws their initials). Scoped to the request, so a list
 * naming the same people many times signs each picture once.
 */
final class Person
{
    /** @var array<string, string> */
    private array $urls = [];

    public function __construct(private readonly SignedUrls $signedUrls) {}

    /** @return array{id: int, name: string, avatar_url: string|null} */
    public static function of(User $user): array
    {
        return app(self::class)->present($user);
    }

    /**
     * The same, named the way the household says it: by first name, unless two members share it
     * (Household::shortName).
     *
     * @return array{id: int, name: string, avatar_url: string|null}
     */
    public static function short(User $user): array
    {
        return [...self::of($user), 'name' => app(Household::class)->shortName($user)];
    }

    /** @return array{id: int, name: string, avatar_url: string|null} */
    public function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $this->avatarUrl($user),
        ];
    }

    public function avatarUrl(User $user): ?string
    {
        $key = $user->avatar_key;

        if ($key === null || $key === '') {
            return null;
        }

        return $this->urls[$key] ??= $this->signedUrls->forDiskObject(config('shell.media_disk'), $key);
    }
}
