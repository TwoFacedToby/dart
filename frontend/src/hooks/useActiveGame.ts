import { useEffect, useState } from "react";

import {
    getAtwActiveGame,
    getCricketActiveGame,
    getX01ActiveGame,
    type AtwGameState,
    type CricketGameState,
    type X01GameState,
} from "../api";

export type ActiveGame =
    | { kind: "atw"; game: AtwGameState }
    | { kind: "cricket"; game: CricketGameState }
    | { kind: "x01"; game: X01GameState }
    | { kind: "none" };

const POLL_INTERVAL_MS = 2000;

// Only one game is ever played at a time, so this checks all three
// active-game endpoints in parallel and reports whichever one comes back
// non-null.
export async function fetchActiveGame(): Promise<ActiveGame> {
    const [atw, cricket, x01] = await Promise.all([
        getAtwActiveGame().catch(() => null),
        getCricketActiveGame().catch(() => null),
        getX01ActiveGame().catch(() => null),
    ]);

    if (atw) return { kind: "atw", game: atw };
    if (cricket) return { kind: "cricket", game: cricket };
    if (x01) return { kind: "x01", game: x01 };
    return { kind: "none" };
}

// Polling version of fetchActiveGame. Used by GameViewerPage to render the
// right board without the person having to pick a game type first, and to
// pick up whatever is being played from another window.
export function useActiveGame(): ActiveGame | undefined {
    const [active, setActive] = useState<ActiveGame | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        async function poll() {
            const result = await fetchActiveGame();
            if (!cancelled) setActive(result);
        }

        poll();
        const interval = setInterval(poll, POLL_INTERVAL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    return active;
}
