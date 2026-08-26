import { useState } from "react";
import { Modal } from "../modal/Modal";

interface ConfirmDeleteModalProps {
    title: string;
    body: string;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({ title, body, onCancel, onConfirm }: ConfirmDeleteModalProps) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConfirm() {
        setDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete");
            setDeleting(false);
        }
    }

    return (
        <Modal title={title} onClose={onCancel}>
            <p>{body}</p>
            {error && <div className="form-error">{error}</div>}
            <div className="settings-menu__discard-actions">
                <button className="btn btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
                <button className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                </button>
            </div>
        </Modal>
    );
}
