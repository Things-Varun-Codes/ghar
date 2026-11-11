<?php

namespace Tests\Feature\Observability;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class BackendSilentPathTest extends TestCase
{
    public function test_no_empty_body_bare_catch_throwable_in_app(): void
    {
        $base = base_path();

        // Empty-body-only matcher — shares semantics with scripts/check-bare-catch.sh.
        // Matches `catch (\Throwable...) { }` and `catch (\Throwable...) {}` with
        // whitespace-only body.
        $process = new Process([
            'grep', '-rn', '-E',
            'catch *\(\\\\?Throwable[^)]*\) *\{[[:space:]]*\}',
            'app/',
        ]);
        $process->setWorkingDirectory($base);
        $process->run();

        // grep exits 1 when zero matches — that is a success, not a failure.
        $output = (string) $process->getOutput();
        $matches = array_values(array_filter(
            preg_split('/\R/', $output) ?: [],
            fn (string $line) => $line !== ''
        ));

        $this->assertSame(
            [],
            $matches,
            'Empty-body bare-catch sites in app/. Replace the empty catch with'
            ." `catch (\\Throwable \$e) { report(\$e); ... }`.\nSites:\n  - "
            .implode("\n  - ", $matches)
        );
    }

    public function test_attach_media_catch_reports_throwable(): void
    {
        $contents = file_get_contents(base_path('app/MiniApps/History/Actions/AttachMedia.php'));
        $this->assertIsString($contents);

        $this->assertStringContainsString(
            'report(',
            $contents,
            'AttachMedia.php must call report($e) in its Throwable catch'
        );
    }

    public function test_media_dimensions_observer_catch_reports_throwable(): void
    {
        $contents = file_get_contents(base_path('app/MiniApps/History/Observers/MediaDimensionsObserver.php'));
        $this->assertIsString($contents);

        $this->assertStringContainsString(
            'report(',
            $contents,
            'MediaDimensionsObserver.php must call report($e) in its Throwable catch'
        );
    }
}
