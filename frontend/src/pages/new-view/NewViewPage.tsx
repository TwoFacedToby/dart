import { useActiveGame } from "../../hooks/useActiveGame";
import { NewAtwView } from "./atw/NewAtwView";
import { NewCricketView } from "./cricket/NewCricketView";
import { NewX01View } from "./x01/NewX01View";

import "./NewView.css";

// Portrait-screen viewer (1080x1920), light theme, built for a fixed
// second screen with no zoom control -- unlike /view, everything here has
// to fit and stay legible without the person ever touching the display.
export function NewViewPage() {
    const active = useActiveGame();

    if (active === undefined) return null;

    switch (active.kind) {
        case "atw":
            return <NewAtwView game={active.game} />;
        case "cricket":
            return <NewCricketView game={active.game} />;
        case "x01":
            return <NewX01View game={active.game} />;
        case "none":
            return <div className="new-view new-view--empty">No game in progress</div>;
    }
}
