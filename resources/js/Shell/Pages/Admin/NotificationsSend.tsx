import { useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLegend,
    FieldSet,
    Field,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import * as adminNotifications from '@/routes/admin/notifications';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

interface User extends Person {
    email: string;
}

const CHANNELS = [
    {
        value: 'push',
        name: 'Push',
        description: "On every device they've subscribed",
    },
    {
        value: 'email',
        name: 'Email',
        description: 'One email to their account address',
    },
] as const;

interface PageProps {
    users: User[];
    flash?: {
        success?: string;
        error?: string;
    };
    errors: Record<string, string>;
    [key: string]: unknown;
}

export default function NotificationsSend() {
    const { users, flash, errors, name: appName } = usePage<PageProps>().props;

    const { data, setData, post, processing, reset } = useForm<{
        user_id: string;
        title: string;
        body: string;
        url: string;
        channels: string[];
    }>({
        user_id: '',
        title: '',
        body: '',
        url: '',
        channels: ['push'],
    });

    const [attemptedSubmit, setAttemptedSubmit] = useState(false);

    const showChannelError =
        !!errors.channels || (attemptedSubmit && data.channels.length === 0);

    const isOnlyUser = useMemo(() => users.length === 1, [users.length]);

    const toggleChannel = (channel: string) => {
        // Inertia v3's setData(key, value) does NOT unpack a function updater —
        // passing `(prev) => ...` literally stores the function as the value,
        // breaking subsequent `data.channels.includes(...)` reads. Compute the
        // next array from `data.channels` directly. Found via MCP smoke when
        // toggling Email after a successful submit (post-reset) crashed the page.
        const next = data.channels.includes(channel)
            ? data.channels.filter((c) => c !== channel)
            : [...data.channels, channel];
        setData('channels', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setAttemptedSubmit(true);

        if (data.channels.length === 0) {
            return;
        }

        post(adminNotifications.send.url(), {
            onSuccess: () => {
                reset();
                setAttemptedSubmit(false);
            },
        });
    };

    const isSendDisabled =
        data.channels.length === 0 || processing || isOnlyUser;

    return (
        <>
            <Page
                tier="prose"
                title="Send notification"
                room="Admin"
                backChevron
                subtitle="Sends one person a push notification, an email, or both."
            >
                {(flash?.success || flash?.error) && (
                    <Alert
                        variant={flash?.success ? 'default' : 'destructive'}
                        className={cn(
                            'os-admin-flash mb-6 border-0',
                            !flash?.success && 'os-admin-flash--error',
                        )}
                        role={flash?.success ? 'status' : 'alert'}
                        data-testid="admin-notifications-flash"
                    >
                        <AlertDescription className="text-current">
                            {flash?.success ?? flash?.error}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="os-admin-surface border p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Recipient"
                            name="user_id"
                            required
                            error={errors.user_id}
                            helper={
                                isOnlyUser
                                    ? "You're the only person here. Invite someone from the Invites page first."
                                    : undefined
                            }
                        >
                            <Select
                                value={data.user_id || null}
                                items={users.map((u) => ({
                                    value: String(u.id),
                                    label: u.name,
                                }))}
                                onValueChange={(val) =>
                                    setData('user_id', val ?? '')
                                }
                                disabled={isOnlyUser}
                            >
                                <SelectTrigger
                                    id="user_id"
                                    className="os-admin-tap w-full"
                                    data-testid="admin-notifications-recipient-select"
                                >
                                    <SelectValue placeholder="Choose a person" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {users.map((u) => (
                                            <SelectItem
                                                key={u.id}
                                                value={String(u.id)}
                                            >
                                                <div className="flex items-center gap-3 py-1">
                                                    <PersonAvatar
                                                        person={u}
                                                        size={24}
                                                    />
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="os-admin-strong">
                                                            {u.name}
                                                        </span>
                                                        <span className="os-admin-muted text-[13px]">
                                                            {u.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField
                            label="Title"
                            name="title"
                            required
                            error={errors.title}
                            helper="The heading they see on the lock screen."
                        >
                            <Input
                                id="title"
                                type="text"
                                value={data.title}
                                onChange={(e) =>
                                    setData('title', e.target.value)
                                }
                                placeholder={appName}
                                className="os-admin-input"
                            />
                        </FormField>

                        <FormField
                            label="Body"
                            name="body"
                            required
                            error={errors.body}
                            helper="Roughly 200 characters reads well on a lock screen."
                        >
                            <Textarea
                                id="body"
                                value={data.body}
                                onChange={(e) =>
                                    setData('body', e.target.value)
                                }
                                placeholder="What's up?"
                                className="os-admin-textarea min-h-24"
                            />
                        </FormField>

                        <FormField
                            label="Link"
                            name="url"
                            error={errors.url}
                            helper="The page that opens when they tap the notification. Leave it empty for Home."
                        >
                            <Input
                                id="url"
                                type="text"
                                value={data.url}
                                onChange={(e) => setData('url', e.target.value)}
                                placeholder="/dashboard"
                                className="os-admin-input"
                            />
                        </FormField>

                        <FieldSet
                            aria-describedby="channels-help"
                            aria-invalid={showChannelError || undefined}
                            className="gap-0"
                        >
                            <FieldLegend className="os-admin-group-label">
                                Channels
                                <span
                                    aria-hidden="true"
                                    className="os-admin-required-mark"
                                >
                                    *
                                </span>
                            </FieldLegend>
                            <FieldDescription
                                id="channels-help"
                                className={cn(
                                    'os-admin-group-help mb-2',
                                    showChannelError &&
                                        'os-admin-group-help--invalid',
                                )}
                            >
                                Choose at least one.
                            </FieldDescription>

                            {CHANNELS.map((channel) => (
                                <Field
                                    key={channel.value}
                                    orientation="horizontal"
                                    className="py-2.5"
                                >
                                    <Checkbox
                                        id={`channel-${channel.value}`}
                                        checked={data.channels.includes(
                                            channel.value,
                                        )}
                                        onCheckedChange={() =>
                                            toggleChannel(channel.value)
                                        }
                                        aria-describedby={`channel-${channel.value}-description`}
                                    />
                                    <FieldContent>
                                        <Label
                                            htmlFor={`channel-${channel.value}`}
                                            className="os-admin-option-name cursor-pointer"
                                        >
                                            {channel.name}
                                        </Label>
                                        <span
                                            id={`channel-${channel.value}-description`}
                                            className="os-admin-option-desc"
                                        >
                                            {channel.description}
                                        </span>
                                    </FieldContent>
                                </Field>
                            ))}

                            {showChannelError && (
                                <FieldError
                                    className="os-admin-field-error mt-1"
                                    data-testid="admin-notifications-channel-error"
                                >
                                    {errors.channels ??
                                        'Pick at least one channel.'}
                                </FieldError>
                            )}
                        </FieldSet>

                        <div className="flex justify-end">
                            <SubmitButton
                                processing={processing}
                                disabled={isSendDisabled}
                                busyText="Sending…"
                                className="min-h-[44px] px-6"
                                data-testid="admin-notifications-send-button"
                            >
                                Send
                            </SubmitButton>
                        </div>
                    </form>
                </div>
            </Page>
        </>
    );
}
