import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { mutationOptions } from '@/lib/mutation';
import * as appearance from '@/routes/settings/appearance';
import Page from '@/Shell/Components/Page';
import type { Auth, Theme } from '@/types/auth';

const CHOICES: { value: Theme; label: string; description: string }[] = [
    {
        value: 'system',
        label: 'Same as this device',
        description: 'Light or dark, as your phone or computer is set.',
    },
    {
        value: 'light',
        label: 'Light',
        description: 'Warm white, day and night.',
    },
    {
        value: 'dark',
        label: 'Dark',
        description: 'Warm and dim, easier on the eyes at night.',
    },
];

export default function AppearanceSettings() {
    const { auth } = usePage<{ auth: Auth }>().props;
    // What was asked for while the request is out; the shared prop once it settles.
    const [asked, setAsked] = useState<Theme | null>(null);

    const change = (theme: Theme) => {
        setAsked(theme);
        router.patch(
            appearance.update.url(),
            { theme },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Settings/Appearance',
                    action: 'theme.update',
                    onPendingChange: (pending) => {
                        if (!pending) {
                            setAsked(null);
                        }
                    },
                }),
            },
        );
    };

    return (
        <Page tier="prose" title="Appearance" room="Settings" backChevron>
            <div className="os-settings-card p-6">
                <RadioGroup
                    aria-label="Theme"
                    value={asked ?? auth.user?.theme ?? 'system'}
                    onValueChange={(value) => change(value as Theme)}
                    disabled={asked !== null}
                    className="gap-5"
                >
                    {CHOICES.map(({ value, label, description }) => (
                        <Field
                            key={value}
                            orientation="horizontal"
                            className="data-[orientation=horizontal]:items-start"
                        >
                            <RadioGroupItem
                                id={`theme-${value}`}
                                value={value}
                                aria-describedby={`theme-${value}-description`}
                                className="mt-0.5"
                            />
                            <FieldContent>
                                <FieldLabel
                                    htmlFor={`theme-${value}`}
                                    className="os-settings-row-label"
                                >
                                    {label}
                                </FieldLabel>
                                <FieldDescription
                                    id={`theme-${value}-description`}
                                    className="os-settings-row-status"
                                >
                                    {description}
                                </FieldDescription>
                            </FieldContent>
                        </Field>
                    ))}
                </RadioGroup>
            </div>
        </Page>
    );
}
