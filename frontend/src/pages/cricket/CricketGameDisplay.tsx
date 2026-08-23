import type { CricketGameState } from "../../api";
import { CricketBoard } from "./CricketBoard";

interface CricketGameDisplayProps {
    game: CricketGameState;
}

export function CricketGameDisplay({ game }: CricketGameDisplayProps) {
    const current = game.participants.find(p => p.id === game.current_participant_id);

    return (
        <div className="game-viewer">
            <h1 className="game-viewer__title">Cricket</h1>

            {game.status === "finished" ? (
                <div className="game-banner game-banner--success game-banner--large">
                    {game.participants.find(p => p.player.id === game.winner_id)?.player.name ?? "-"} wins!
                </div>
            ) : current ? (
                <div className="game-banner game-banner--large">{current.player.name}'s turn</div>
            ) : null}

            <CricketBoard game={game} big />
        </div>
    );
}
