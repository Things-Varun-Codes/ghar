import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useMemo, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

interface User {
    id: number;
    name: string;
    email: string;
}

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
        <AppLayout>
            <Head title="Send notification — Admin" />

            <Page
                tier="prose"
                title="Send notification"
                backChevron
                subtitle="Send one person a ping. Save it for things worth interrupting them for."
            >
                {(flash?.success || flash?.error) && (
                    <div
                        className={cn(
                            'os-admin-flash mb-6 rounded-lg px-4 py-3',
                            !flash?.success && 'os-admin-flash--error',
                        )}
                        role={flash?.success ? 'status' : 'alert'}
                        aria-live="polite"
                        data-testid="admin-notifications-flash"
                    >
                        {flash?.success ?? flash?.error}
                    </div>
                )}

                <div className="os-admin-surface rounded-xl border p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Recipient"
                            name="user_id"
                            required
                            error={errors.user_id}
                            helper={
                                isOnlyUser
                                    ? "You're the only user. Invite someone from /admin/invites first."
                                    : undefined
                            }
                        >
                            <Select
                                value={data.user_id}
                                onValueChange={(val) => setData('user_id', val)}
                                disabled={isOnlyUser}
                            >
                                <SelectTrigger
                                    id="user_id"
                                    className="os-admin-tap w-full"
                                    data-testid="admin-notifications-recipient-select"
                                >
                                    <SelectValue placeholder="Select a person…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {users.map((u) => (
                                            <SelectItem
                                                key={u.id}
                                                value={String(u.id)}
                                            >
                                                <div className="flex flex-col items-start gap-1 py-1">
                                                    <span className="os-admin-strong">
                                                        {u.name}
                                                    </span>
                                                    <span className="os-admin-muted text-xs">
                                                        {u.email}
                                                    </span>
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
                            helper="Where tapping the notification lands. Defaults to /dashboard."
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

                        <div>
                            <p className="os-admin-group-label mb-1.5 block">
                                Channels
                                <span
                                    aria-hidden="true"
                                    className="os-admin-required-mark"
                                >
                                    *
                                </span>
                            </p>
                            <p
                                className={cn(
                                    'os-admin-group-help mb-2',
                                    showChannelError &&
                                        'os-admin-group-help--invalid',
                                )}
                            >
                                Choose at least one.
                            </p>

                            <label className="flex cursor-pointer items-center gap-3 py-2.5">
                                <Checkbox
                                    id="channel-push"
                                    checked={data.channels.includes('push')}
                                    onCheckedChange={() =>
                                        toggleChannel('push')
                                    }
                                />
                                <div className="flex flex-col gap-0.5">
                                    <span className="os-admin-option-name">
                                        Push
                                    </span>
                                    <span className="os-admin-option-desc">
                                        On every device they&#39;ve subscribed
                                    </span>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3 py-2.5">
                                <Checkbox
                                    id="channel-email"
                                    checked={data.channels.includes('email')}
                                    onCheckedChange={() =>
                                        toggleChannel('email')
                                    }
                                />
                                <div className="flex flex-col gap-0.5">
                                    <span className="os-admin-option-name">
                                        Email
                                    </span>
                                    <span className="os-admin-option-desc">
                                        One email to their account address
                                    </span>
                                </div>
                            </label>

                            {showChannelError && (
                                <p
                                    className="os-admin-field-error mt-1"
                                    data-testid="admin-notifications-channel-error"
                                >
                                    Pick at least one channel.
                                </p>
                            )}
                        </div>

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
        </AppLayout>
    );
}
