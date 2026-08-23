import { useActiveGame } from "../../hooks/useActiveGame";
import { AtwGameDisplay } from "../atw/AtwGameDisplay";
import { CricketGameDisplay } from "../cricket/CricketGameDisplay";
import { X01GameDisplay } from "../x01/X01GameDisplay";

// Full-screen board display for the second monitor. Only one game is played
// at a time, so this detects which game type is currently active and renders
// its board, instead of the person having to pick the right viewer route.
export function GameViewerPage() {
    const active = useActiveGame();

    if (active === undefined) return null;

    switch (active.kind) {
        case "atw":
            return <AtwGameDisplay game={active.game} />;
        case "cricket":
            return <CricketGameDisplay game={active.game} />;
        case "x01":
            return <X01GameDisplay game={active.game} />;
        case "none":
            return <div className="game-viewer game-viewer--empty">No game in progress</div>;
    }
}
