import { useEffect, useState } from "react";
import { getPlayers, type Player } from "../../api";

import "./PlayerPicker.css";

interface PlayerPickerProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

// Shared "who's playing today" checklist, used by the setup screen of all
// three game editors.
export function PlayerPicker({ selectedIds, onChange }: PlayerPickerProps) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPlayers().then(setPlayers).finally(() => setLoading(false));
    }, []);

    function toggle(id: string) {
        if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
        else onChange([...selectedIds, id]);
    }

    if (loading) return <p className="form-help">Loading players...</p>;
    if (players.length === 0) return <p className="form-help">No players yet. Add players first.</p>;

    return (
        <div className="player-picker">
            {players.map(p => (
                <button
                    key={p.id}
                    type="button"
                    className={`chip${selectedIds.includes(p.id) ? " chip--selected" : ""}`}
                    onClick={() => toggle(p.id)}
                >
                    <span className="player-picker__initials">{p.initials}</span>
                    <span>{p.name}</span>
                </button>
            ))}
        </div>
    );
}
