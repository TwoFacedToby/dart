import { Outlet, Link } from "react-router-dom";
import { ROUTES } from "../../router/routes";

import "./AppShell.css";

export function AppShell() {
    return (
        <div className="app-shell">
            <aside className="app-shell__sidebar">
                <Link className="app-shell__logo" to={ROUTES.home}>Dart Stats</Link>
                <nav className="app-shell__nav">
                    <Link className="app-shell__nav-link" to={ROUTES.players}>Players</Link>
                    <Link className="app-shell__nav-link" to={ROUTES.play}>Play Game</Link>
                    <Link className="app-shell__nav-link" to={ROUTES.stats}>Stats</Link>
                    <Link className="app-shell__nav-link" to={ROUTES.gameViewer}>View Game</Link>
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
