<?php

namespace Tests\Feature\Inertia;

use App\Http\Middleware\HandleInertiaRequests;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SharedPropsContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_tsx_usepage_shared_props_read_matches_a_shared_key(): void
    {
        $this->actingAs(User::factory()->create());

        /** @var HandleInertiaRequests $middleware */
        $middleware = app(HandleInertiaRequests::class);
        $shared = $middleware->share(request());

        $sharedKeys = array_keys($shared);

        $reads = $this->collectSharedPropsReads();

        $missing = [];
        foreach ($reads as $path => $sources) {
            $top = explode('.', $path)[0];
            if (! in_array($top, $sharedKeys, true)) {
                $missing[] = sprintf(
                    "  - read `usePage<SharedProps>().props.%s` — no top-level `%s` in HandleInertiaRequests::share().\n    Sources: %s",
                    $path,
                    $top,
                    implode(', ', $sources)
                );
            }
        }

        $this->assertEmpty(
            $missing,
            "SharedProps contract drift — TSX reads a key that share() does not emit:\n".implode("\n", $missing)
                ."\n\nShared keys currently exposed: ".implode(', ', $sharedKeys)
        );
    }

    /** @return array<string, list<string>> */
    private function collectSharedPropsReads(): array
    {
        $reads = [];

        $root = resource_path('js');
        foreach (File::allFiles($root) as $file) {
            $name = $file->getFilename();
            if (! str_ends_with($name, '.tsx') && ! str_ends_with($name, '.ts')) {
                continue;
            }
            $relPath = ltrim(str_replace($root, '', $file->getPathname()), DIRECTORY_SEPARATOR);
            $content = $file->getContents();

            // Strip inline anonymous type literals so a single regex catches all  forms.
            // Anonymous types in resources/js do not contain nested braces.
            $normalized = preg_replace(
                '/usePage<\s*\{[^{}]*\}\s*>\(\)/',
                'usePage<>()',
                $content
            ) ?? $content;

            // Pattern A/C/D (dotted): typed/empty/no type-slot
            if (preg_match_all(
                '/usePage(?:<(?:SharedProps)?>)?\(\)\.props\.([A-Za-z_][\w.]*)/',
                $normalized,
                $m
            )) {
                foreach ($m[1] as $path) {
                    $reads[$path][] = $relPath;
                }
            }

            // Pattern B (destructured): const { foo, bar } = usePage(...)?.props
            if (preg_match_all(
                '/const\s*\{\s*([^}]+?)\s*\}\s*=\s*usePage(?:<(?:SharedProps)?>)?\(\)\.props/',
                $normalized,
                $m
            )) {
                foreach ($m[1] as $destructured) {
                    foreach (preg_split('/\s*,\s*/', trim($destructured)) as $key) {
                        // Strip rename aliases (`foo: renamed`) - keep the source key
                        $sourceKey = trim(explode(':', $key)[0]);
                        if ($sourceKey === '') {
                            continue;
                        }
                        $reads[$sourceKey][] = $relPath;
                    }
                }
            }
        }

        foreach ($reads as $k => $v) {
            $reads[$k] = array_values(array_unique($v));
        }

        return $reads;
    }
}
