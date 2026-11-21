/*
 * Ghar's mark, drawn from the favicon file itself, so the tab, the header, the sign-in page and
 * the loading screen change together when the file does. Sized to its text (1em); decorative,
 * as the name always sits beside it.
 */
export default function AppMark() {
    return <img src="/favicon.svg" alt="" className="shell-app-mark" />;
}
