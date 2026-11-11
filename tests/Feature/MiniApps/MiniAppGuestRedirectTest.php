<?php

namespace Tests\Feature\MiniApps;

use Illuminate\Routing\Route;
use Tests\TestCase;

class MiniAppGuestRedirectTest extends TestCase
{
    /** @return array<int, array{route: Route, verb: string}> */
    private function discoverMiniAppMutatingRoutes(): array
    {
        $mutatingVerbs = ['POST', 'PATCH', 'PUT', 'DELETE'];
        $miniAppNamespaces = ['App\\MiniApps\\Corner\\', 'App\\MiniApps\\Mailbox\\'];

        $matches = [];

        foreach (app('router')->getRoutes()->getRoutes() as $route) {
            $mutatingMethods = array_values(array_intersect($route->methods(), $mutatingVerbs));

            if ($mutatingMethods === []) {
                continue;
            }

            $uses = $route->getAction('uses');

            if (! is_string($uses)) {
                continue;
            }

            foreach ($miniAppNamespaces as $namespace) {
                if (str_starts_with($uses, $namespace)) {
                    $matches[] = ['route' => $route, 'verb' => $mutatingMethods[0]];
                    break;
                }
            }
        }

        return $matches;
    }

    private function countDeclaredMutatingRoutesInSource(): int
    {
        $files = [
            base_path('routes/miniapps/our-corner.php'),
            base_path('routes/miniapps/our-mailbox.php'),
        ];

        $count = 0;

        foreach ($files as $file) {
            $source = file_get_contents($file);

            if ($source === false) {
                continue;
            }

            $count += preg_match_all('/^\s*Route::(post|patch|put|delete)\s*\(/mi', $source);
        }

        return $count;
    }

    public function test_every_mini_app_mutating_route_redirects_guests_to_login(): void
    {
        $routes = $this->discoverMiniAppMutatingRoutes();

        // Drift guard B (floor) — a discovery filter that silently starts  matching nothing
        // must fail instead of vacuously passing.
        $this->assertGreaterThanOrEqual(
            29,
            count($routes),
            'Discovered mutating mini-app route count dropped below the floor of 29. This '.
            'means the discovery filter in discoverMiniAppMutatingRoutes() broke (e.g. the '.
            'controller-namespace allowlist no longer matches), NOT that routes were '.
            'legitimately deleted. Investigate before ever lowering this floor.'
        );

        $declaredCount = $this->countDeclaredMutatingRoutesInSource();

        $this->assertSame(
            $declaredCount,
            count($routes),
            sprintf(
                'Live-router discovery found %d mutating mini-app routes but parsing the route '.
                'file sources found %d declared. The discovery filter in '.
                'discoverMiniAppMutatingRoutes() has gone stale — widen (or otherwise fix) the '.
                'controller-namespace allowlist so the two counts agree again.',
                count($routes),
                $declaredCount,
            )
        );

        $failures = [];
        $expectedLocation = route('login');

        foreach ($routes as $entry) {
            $route = $entry['route'];
            $verb = $entry['verb'];
            $uri = '/'.preg_replace('/\{[^}]+\}/', '1', $route->uri());

            $response = $this->call($verb, $uri);

            $status = $response->getStatusCode();
            $location = $response->headers->get('Location');

            if ($status !== 302 || $location !== $expectedLocation) {
                $failures[] = sprintf(
                    '%s %s (route: %s) — expected 302 to %s, got status %d, Location %s',
                    $verb,
                    $uri,
                    $route->getName() ?? '(unnamed)',
                    $expectedLocation,
                    $status,
                    $location ?? '(none)',
                );
            }
        }

        $this->assertSame(
            [],
            $failures,
            'An unauthenticated request reached a mini-app mutation endpoint instead of being '.
            "redirected to login:\n".implode("\n", $failures)
        );
    }
}
