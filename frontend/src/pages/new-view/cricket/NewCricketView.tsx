import type { CricketGameState } from "../../../api";

import "../NewView.css";

interface NewCricketViewProps {
    game: CricketGameState;
}

export function NewCricketView({ game: _game }: NewCricketViewProps) {
    return (
        <div className="new-view">
            <div className="new-view-placeholder">
                <div className="new-view-placeholder__title">Cricket</div>
                <div className="new-view-placeholder__note">New portrait view not designed yet</div>
            </div>
        </div>
    );
}
