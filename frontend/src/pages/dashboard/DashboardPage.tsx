import { Link } from "react-router-dom";
import { ROUTES } from "../../router/routes";

import "./DashboardPage.css";

const CARDS = [
    { title: "Around the World", desc: "Daily weekday game, 1 to 20." },
    { title: "Cricket", desc: "Friday game, 15-20 and Bull." },
    { title: "101 / 301 / 501", desc: "Standard countdown games." },
];

export function DashboardPage() {
    return (
        <div className="page">
            <h1 className="page__title">Dart Stats</h1>

            <div className="dashboard-grid">
                {CARDS.map(card => (
                    <div key={card.title} className="dashboard-card">
                        <h2 className="dashboard-card__title">{card.title}</h2>
                        <p className="dashboard-card__desc">{card.desc}</p>
                    </div>
                ))}
            </div>

            <div className="dashboard-links">
                <Link className="btn btn-primary" to={ROUTES.play}>Play Game</Link>
                <Link className="btn btn-secondary" to={ROUTES.players}>Manage players</Link>
                <Link className="btn btn-secondary" to={ROUTES.stats}>View stats</Link>
                <Link className="btn btn-secondary" to={ROUTES.gameViewer}>View Game</Link>
            </div>
        </div>
    );
}
