// The browser tab reads "{page} · {room} · {app}"; app.tsx adds the app name.
export function pageTitle(page: string, room?: string): string {
    return room ? `${page} · ${room}` : page;
}
