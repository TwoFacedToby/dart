import { useEffect, useState } from "react";

import { fetchActiveGame, type ActiveGame } from "../../hooks/useActiveGame";
import { AtwSetup } from "../atw/AtwSetup";
import { AtwGamePlay } from "../atw/AtwGamePlay";
import { CricketSetup } from "../cricket/CricketSetup";
import { CricketGamePlay } from "../cricket/CricketGamePlay";
import { X01Setup } from "../x01/X01Setup";
import { X01GamePlay } from "../x01/X01GamePlay";

import "./GameEditorPage.css";

type GameType = "atw" | "cricket" | "x01";

const GAME_TYPES: { type: GameType; label: string }[] = [
    { type: "atw", label: "Around the World" },
    { type: "cricket", label: "Cricket" },
    { type: "x01", label: "101 / 301 / 501" },
];

// Only one game is played at a time, so this is the single entry point for
// both starting a new game and playing whichever one is currently active,
// instead of three separate per-game-type editor pages.
export function GameEditorPage() {
    const [active, setActive] = useState<ActiveGame | undefined>(undefined);
    const [chosenType, setChosenType] = useState<GameType | null>(null);

    useEffect(() => {
        fetchActiveGame().then(setActive);
    }, []);

    if (active === undefined) return <p className="form-help">Loading...</p>;

    if (active.kind === "atw") {
        return (
            <AtwGamePlay
                game={active.game}
                onGameChange={game => setActive({ kind: "atw", game })}
                onGameEnded={() => setActive({ kind: "none" })}
            />
        );
    }
    if (active.kind === "cricket") {
        return (
            <CricketGamePlay
                game={active.game}
                onGameChange={game => setActive({ kind: "cricket", game })}
                onGameEnded={() => setActive({ kind: "none" })}
            />
        );
    }
    if (active.kind === "x01") {
        return (
            <X01GamePlay
                game={active.game}
                onGameChange={game => setActive({ kind: "x01", game })}
                onGameEnded={() => setActive({ kind: "none" })}
            />
        );
    }

    if (chosenType === "atw") {
        return <AtwSetup onGameCreated={game => setActive({ kind: "atw", game })} onBack={() => setChosenType(null)} />;
    }
    if (chosenType === "cricket") {
        return <CricketSetup onGameCreated={game => setActive({ kind: "cricket", game })} onBack={() => setChosenType(null)} />;
    }
    if (chosenType === "x01") {
        return <X01Setup onGameCreated={game => setActive({ kind: "x01", game })} onBack={() => setChosenType(null)} />;
    }

    return (
        <div className="page">
            <h1 className="page__title">Start a game</h1>
            <p className="form-help">Pick which game to play.</p>

            <div className="game-editor__type-picker">
                {GAME_TYPES.map(g => (
                    <button
                        key={g.type}
                        type="button"
                        className="game-editor__type-btn"
                        onClick={() => setChosenType(g.type)}
                    >
                        {g.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
