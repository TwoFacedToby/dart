import { Outlet, Link } from "react-router-dom";

import "./AppShell.css";

export function AppShell() {
    return (
        <div className="app-shell">
            <aside className="app-shell__sidebar">
                <Link className="app-shell__logo" to="/play">Dart Stats</Link>
                <nav className="app-shell__nav">
                    <Link className="app-shell__nav-link" to="/players">Players</Link>
                    <Link className="app-shell__nav-link" to="/play">Play Game</Link>
                    <Link className="app-shell__nav-link" to="/stats">Stats</Link>
                    <Link className="app-shell__nav-link" to="/view">View Game</Link>
                </nav>
            </aside>

            <div className="app-shell__main">
                <main className="app-shell__content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
