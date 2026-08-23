import type { ReactNode } from "react";

import "./Modal.css";

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">{title}</h2>
                    <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="modal__body">{children}</div>
            </div>
        </div>
    );
}
