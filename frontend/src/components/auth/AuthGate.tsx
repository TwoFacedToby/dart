import { useEffect, useState } from "react";
import { getStoredAccessKey, setStoredAccessKey, onUnauthorized, verifyAccessKey } from "../../api";

import "./AuthGate.css";

interface AuthGateProps {
    children: React.ReactNode;
}

// Wraps the entire app (both the normal editor/viewer routes and the
// second-screen /view route) behind a single shared key. There's no user
// system, no accounts -- just one key, handed out to the people who
// should have it, checked against a single value on the server.
export function AuthGate({ children }: AuthGateProps) {
    const [authed, setAuthed] = useState(() => !!getStoredAccessKey());
    const [input, setInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onUnauthorized(() => setAuthed(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const result = await verifyAccessKey(input.trim());
        setSubmitting(false);

        if (result === "ok") {
            setStoredAccessKey(input.trim());
            setAuthed(true);
        } else if (result === "locked") {
            setError("Too many failed attempts. Try again later.");
        } else if (result === "invalid") {
            setError("That key isn't right.");
        } else {
            setError("Couldn't reach the server. Try again.");
        }
    }

    if (authed) return <>{children}</>;

    return (
        <div className="auth-gate">
            <form className="auth-gate__form" onSubmit={handleSubmit}>
                <h1 className="auth-gate__title">Enter key</h1>
                <input
                    className="form-input"
                    type="password"
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={submitting}
                />
                {error && <div className="form-error">{error}</div>}
                <button className="btn btn-primary" type="submit" disabled={submitting || !input}>
                    {submitting ? "Checking..." : "Enter"}
                </button>
            </form>
        </div>
    );
}
