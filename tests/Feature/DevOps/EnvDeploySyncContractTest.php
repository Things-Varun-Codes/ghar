<?php

namespace Tests\Feature\DevOps;

use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class EnvDeploySyncContractTest extends TestCase
{
    public function test_script_exits_zero_against_current_repo_state(): void
    {
        $scriptPath = base_path('scripts/check-env-deploy-sync.sh');
        $this->assertFileExists($scriptPath, 'scripts/check-env-deploy-sync.sh must ship');

        $result = Process::path(base_path())->run(['bash', './scripts/check-env-deploy-sync.sh']);

        $this->assertTrue(
            $result->successful(),
            "Sync script failed against current repo state.\nSTDOUT: {$result->output()}\nSTDERR: {$result->errorOutput()}"
        );
    }

    public function test_script_fails_when_env_has_key_missing_from_deploy(): void
    {
        $tempDir = $this->makeTempRepo();
        file_put_contents("{$tempDir}/.env.example", <<<'ENV'
APP_NAME=Ghar
APP_KEY=
EXTRA_ONLY_IN_ENV_KEY=
ENV);
        file_put_contents("{$tempDir}/DEPLOY.md", <<<'MD'
# Env additions

```env
APP_NAME=
APP_KEY=
```
MD);

        $result = Process::path($tempDir)->run(['bash', "{$tempDir}/scripts/check-env-deploy-sync.sh"]);

        $this->assertFalse($result->successful(), 'Script must fail when env has unmapped keys');
        $combined = $result->output().$result->errorOutput();
        $this->assertStringContainsString('EXTRA_ONLY_IN_ENV_KEY', $combined, 'Stderr/stdout must name the missing key');
    }

    public function test_script_fails_when_deploy_has_orphan_key(): void
    {
        $tempDir = $this->makeTempRepo();
        file_put_contents("{$tempDir}/.env.example", <<<'ENV'
APP_NAME=Ghar
APP_KEY=
ENV);
        file_put_contents("{$tempDir}/DEPLOY.md", <<<'MD'
# Env additions

```env
APP_NAME=
APP_KEY=
ORPHAN_DOC_KEY=
```
MD);

        $result = Process::path($tempDir)->run(['bash', "{$tempDir}/scripts/check-env-deploy-sync.sh"]);

        $this->assertFalse($result->successful(), 'Script must fail when DEPLOY.md has orphan key');
        $combined = $result->output().$result->errorOutput();
        $this->assertStringContainsString('ORPHAN_DOC_KEY', $combined, 'Stderr/stdout must name the orphan key');
    }

    public function test_script_handles_comments_and_blank_lines_in_env_example(): void
    {
        $tempDir = $this->makeTempRepo();
        file_put_contents("{$tempDir}/.env.example", <<<'ENV'
# This is a comment
APP_NAME=Ghar

# Another comment

APP_KEY=
# lowercase_excluded should not be picked up
lowercase_ignored=value
ENV);
        file_put_contents("{$tempDir}/DEPLOY.md", <<<'MD'
# Env additions

```env
APP_NAME=
APP_KEY=
```
MD);

        $result = Process::path($tempDir)->run(['bash', "{$tempDir}/scripts/check-env-deploy-sync.sh"]);

        $this->assertTrue(
            $result->successful(),
            "Script must ignore comments/blank lines/lowercase keys.\nSTDOUT: {$result->output()}\nSTDERR: {$result->errorOutput()}"
        );
    }

    private function makeTempRepo(): string
    {
        $tempDir = sys_get_temp_dir().'/envdeploysync-'.bin2hex(random_bytes(6));
        mkdir($tempDir, 0755, true);
        mkdir("{$tempDir}/scripts", 0755, true);

        $realScript = base_path('scripts/check-env-deploy-sync.sh');
        if (! file_exists($realScript)) {
            // test_script_exits_zero_against_current_repo_state surfaces this case
            // explicitly; here we mark this scenario skipped.
            $this->markTestSkipped('scripts/check-env-deploy-sync.sh not found');
        }
        copy($realScript, "{$tempDir}/scripts/check-env-deploy-sync.sh");
        chmod("{$tempDir}/scripts/check-env-deploy-sync.sh", 0755);

        return $tempDir;
    }
}
