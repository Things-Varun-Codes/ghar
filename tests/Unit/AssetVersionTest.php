<?php

namespace Tests\Unit;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Tests\TestCase;

class AssetVersionTest extends TestCase
{
    public function test_version_returns_md5_of_manifest_when_manifest_exists(): void
    {
        $manifestPath = public_path('build/manifest.json');
        $this->assertFileExists($manifestPath, 'public/build/manifest.json must exist (run npm run build)');

        $middleware = new HandleInertiaRequests;
        $request = Request::create('/');

        $version = $middleware->version($request);

        $this->assertEquals(
            md5_file($manifestPath),
            $version,
            'version() must return md5_file(public/build/manifest.json) to trigger client reloads on deploy'
        );
    }

    public function test_version_falls_back_gracefully_when_manifest_is_absent(): void
    {
        // This tests the guard in HandleInertiaRequests::version():  file_exists($manifest) ?
        // md5_file($manifest) : parent::version($request)  In a test env without a manifest,
        // it should not throw.
        $tempDir = sys_get_temp_dir().'/ghar_test_'.uniqid();
        mkdir($tempDir);

        // Point public_path to a dir without a build/manifest.json
        app()->usePublicPath($tempDir);

        try {
            $middleware = new HandleInertiaRequests;
            $request = Request::create('/');

            // Parent::version() returns null when no Inertia version is set — that's fine.
            // The important thing is the call doesn't throw.
            $version = $middleware->version($request);
            $this->assertNull($version, 'version() falls back to null when manifest is absent and no inertia version set');
        } finally {
            // Restore public path for subsequent tests
            app()->usePublicPath(base_path('public'));
            rmdir($tempDir);
        }
    }
}
