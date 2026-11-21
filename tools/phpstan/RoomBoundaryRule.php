<?php

namespace Tools\PHPStan;

use PhpParser\Node;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\GroupUse;
use PhpParser\NodeFinder;
use PHPStan\Analyser\Scope;
use PHPStan\Node\FileNode;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/**
 * Code in app/ outside a room never names that room's classes, however it is written: a `use`
 * line, an inline \App\MiniApps\… name, a type or an attribute. Strings and docblocks aren't read.
 *
 * @implements Rule<FileNode>
 */
final class RoomBoundaryRule implements Rule
{
    public function getNodeType(): string
    {
        return FileNode::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        $app = dirname(__DIR__, 2).'/app/';
        $file = $scope->getFile();
        if (! str_starts_with($file, $app)) {
            return [];
        }

        $own = preg_match('#^MiniApps/([^/]+)/#', substr($file, strlen($app)), $m) ? $m[1] : null;
        $finder = new NodeFinder;

        $names = [];
        foreach ($finder->findInstanceOf($node->getNodes(), Name::class) as $name) {
            $resolved = $name->getAttribute('resolvedName');
            $names[] = [($resolved instanceof Name ? $resolved : $name)->toString(), $name->getStartLine()];
        }
        foreach ($finder->findInstanceOf($node->getNodes(), GroupUse::class) as $group) {
            foreach ($group->uses as $use) {
                $names[] = [$group->prefix->toString().'\\'.$use->name->toString(), $use->getStartLine()];
            }
        }

        $errors = [];
        foreach ($names as [$class, $line]) {
            if (preg_match('#^App\\\\MiniApps\\\\([^\\\\]+)\\\\#', $class, $m) && $m[1] !== $own) {
                $errors[] = RuleErrorBuilder::message($own === null
                    ? "The shell names the {$m[1]} room ({$class}): take it from the registry, or let the room pass it in."
                    : "The {$own} room names the {$m[1]} room ({$class}): rooms never import each other.")
                    ->line($line)
                    ->identifier('ghar.roomBoundary')
                    ->build();
            }
        }

        return $errors;
    }
}
