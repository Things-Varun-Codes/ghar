import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '@/MiniApps/History/Components/MediaGrid';
import { testMoment } from '@/MiniApps/History/lib/testMoment';
import EventCard from './EventCard';

const open = vi.fn();

vi.mock('@/Shell/Components/MediaLightbox', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');

    return {
        default: forwardRef(function MediaLightbox(_props, ref) {
            useImperativeHandle(ref, () => ({ open }));

            return null;
        }),
    };
});

const video: MediaItem = {
    id: 9,
    kind: 'video',
    thumb: null,
    medium: null,
    original: '/v.mp4',
    poster: null,
    alt: '',
};

describe('EventCard', () => {
    it('shows a video-only moment on its print, which opens without opening the moment', () => {
        const onRead = vi.fn();
        render(
            <EventCard
                event={testMoment({ media: [video] })}
                onRead={onRead}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Open the video from Monsoon drive to the coast',
            }),
        );

        expect(open).toHaveBeenCalledWith(0);
        expect(onRead).not.toHaveBeenCalled();
    });

    it('skips a photo still processing', () => {
        render(
            <EventCard
                event={testMoment({
                    media: [{ ...video, kind: 'photo', original: null }],
                })}
                onRead={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /^Open the/ })).toBeNull();
    });
});
