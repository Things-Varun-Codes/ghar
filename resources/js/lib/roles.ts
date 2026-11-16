const ROLE_LABELS: Record<string, string> = {
    user: 'Member',
    admin: 'Admin',
};

export function roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
}
