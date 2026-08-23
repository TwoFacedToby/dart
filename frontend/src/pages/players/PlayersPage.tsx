import { useEffect, useState } from "react";
import { getPlayers, createPlayer, updatePlayer, deletePlayer, type Player } from "../../api";

import "./PlayersPage.css";

export function PlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [initials, setInitials] = useState("");
    const [creating, setCreating] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editInitials, setEditInitials] = useState("");

    async function load() {
        setLoading(true);
        try {
            setPlayers(await getPlayers());
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load players");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleCreate() {
        if (!name || !initials) return;
        setCreating(true);
        setError(null);
        try {
            await createPlayer(name, initials);
            setName("");
            setInitials("");
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create player");
        } finally {
            setCreating(false);
        }
    }

    function startEdit(player: Player) {
        setEditingId(player.id);
        setEditName(player.name);
        setEditInitials(player.initials);
    }

    async function saveEdit(id: string) {
        setError(null);
        try {
            await updatePlayer(id, { name: editName, initials: editInitials });
            setEditingId(null);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update player");
        }
    }

    async function handleDelete(id: string) {
        setError(null);
        try {
            await deletePlayer(id);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete player");
        }
    }

    return (
        <div className="page">
            <h1 className="page__title">Players</h1>

            {error && <div className="form-error">{error}</div>}

            <div className="player-create-row">
                <input
                    className="form-input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Name"
                />
                <input
                    className="form-input player-create-row__initials"
                    type="text"
                    value={initials}
                    onChange={e => setInitials(e.target.value.toUpperCase())}
                    placeholder="Initials"
                    maxLength={8}
                />
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !name || !initials}>
                    {creating ? "Adding..." : "Add player"}
                </button>
            </div>

            {loading ? (
                <p className="form-help">Loading...</p>
            ) : (
                <ul className="player-list">
                    {players.map(player => (
                        <li key={player.id} className="player-list__item">
                            {editingId === player.id ? (
                                <>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                    />
                                    <input
                                        className="form-input player-create-row__initials"
                                        type="text"
                                        value={editInitials}
                                        onChange={e => setEditInitials(e.target.value.toUpperCase())}
                                        maxLength={8}
                                    />
                                    <button className="btn btn-primary" onClick={() => saveEdit(player.id)}>Save</button>
                                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="player-list__initials">{player.initials}</span>
                                    <span className="player-list__name">{player.name}</span>
                                    <span className="player-list__streak">
                                        {player.atw_win_streak > 0 ? `ATW streak: ${player.atw_win_streak}` : ""}
                                    </span>
                                    <button className="btn btn-secondary" onClick={() => startEdit(player)}>Edit</button>
                                    <button className="btn btn-danger" onClick={() => handleDelete(player.id)}>Delete</button>
                                </>
                            )}
                        </li>
                    ))}
                    {players.length === 0 && <p className="form-help">No players yet, add one above.</p>}
                </ul>
            )}
        </div>
    );
}
