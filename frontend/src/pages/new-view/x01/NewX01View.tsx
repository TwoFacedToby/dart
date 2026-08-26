import type { X01GameState } from "../../../api";

import "../NewView.css";

interface NewX01ViewProps {
    game: X01GameState;
}

export function NewX01View({ game: _game }: NewX01ViewProps) {
    return (
        <div className="new-view">
            <div className="new-view-placeholder">
                <div className="new-view-placeholder__title">101 / 301 / 501</div>
                <div className="new-view-placeholder__note">New portrait view not designed yet</div>
            </div>
        </div>
    );
}
