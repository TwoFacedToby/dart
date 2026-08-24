import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/forms.css";

import { AppRouter } from "./router/AppRouter";
import { AuthGate } from "./components/auth/AuthGate";

export default function App() {
    return (
        <AuthGate>
            <AppRouter />
        </AuthGate>
    );
}
