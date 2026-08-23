import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";

import { PlayersPage } from "../pages/players/PlayersPage";
import { GameEditorPage } from "../pages/game-editor/GameEditorPage";
import { GameViewerPage } from "../pages/game-viewer/GameViewerPage";
import { StatsPage } from "../pages/stats/StatsPage";

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Renders full-screen, no sidebar, for the second display */}
                <Route path="/view" element={<GameViewerPage />} />

                <Route path="/" element={<AppShell />}>
                    <Route index element={<Navigate to="/play" replace />} />
                    <Route path="players" element={<PlayersPage />} />
                    <Route path="play" element={<GameEditorPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="*" element={<Navigate to="/play" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
