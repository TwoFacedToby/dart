import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getAtwGame, discardAtwGame, type AtwGameState } from "../../api";
import { getCricketGame, discardCricketGame, type CricketGameState } from "../../api";
import { getX01Game, discardX01Game, type X01GameState } from "../../api";
import { AtwGameDisplay } from "../atw/AtwGameDisplay";
import { CricketGameDisplay } from "../cricket/CricketGameDisplay";
import { X01GameDisplay } from "../x01/X01GameDisplay";
import { ConfirmDeleteModal } from "../../components/game-controls/ConfirmDeleteModal";

import "./GameHistoryDetailPage.css";

type GameType = "atw" | "cricket" | "x01";
type AnyGameState = AtwGameState | CricketGameState | X01GameState;

const FETCH_BY_TYPE: Record<GameType, (id: string) => Promise<AnyGameState>> = {
    atw: getAtwGame,
    cricket: getCricketGame,
    x01: getX01Game,
};

const DISCARD_BY_TYPE: Record<GameType, (id: string) => Promise<unknown>> = {
    atw: discardAtwGame,
    cricket: discardCricketGame,
    x01: discardX01Game,
};

export function GameHistoryDetailPage() {
    const { type, id } = useParams<{ type: GameType; id: string }>();
    const navigate = useNavigate();
    const [game, setGame] = useState<AnyGameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        if (!type || !id || !FETCH_BY_TYPE[type]) {
            setError("Unknown game type");
            return;
        }
        FETCH_BY_TYPE[type](id)
            .then(setGame)
            .catch(e => setError(e instanceof Error ? e.message : "Failed to load game"));
    }, [type, id]);

    async function handleDelete() {
        if (!type || !id) return;
        await DISCARD_BY_TYPE[type](id);
        navigate("/history");
    }

    return (
        <div className="game-history-detail">
            <div className="game-history-detail__bar">
                <Link className="btn btn-secondary" to="/history">&larr; Back to history</Link>
                <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>Delete game</button>
            </div>

            {error && <div className="form-error">{error}</div>}

            {game && type === "atw" && <AtwGameDisplay game={game as AtwGameState} />}
            {game && type === "cricket" && <CricketGameDisplay game={game as CricketGameState} />}
            {game && type === "x01" && <X01GameDisplay game={game as X01GameState} />}

            {confirmingDelete && (
                <ConfirmDeleteModal
                    title="Delete game"
                    body="Permanently delete this game? This can't be undone."
                    onCancel={() => setConfirmingDelete(false)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
