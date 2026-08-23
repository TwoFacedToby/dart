interface UndoButtonProps {
    onUndo: () => void;
    disabled?: boolean;
}

export function UndoButton({ onUndo, disabled }: UndoButtonProps) {
    return (
        <button
            type="button"
            className="icon-btn"
            onClick={onUndo}
            disabled={disabled}
            aria-label="Undo last throw"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h11a5 5 0 0 1 0 10h-2" />
                <path d="M8 14 4 10l4-4" />
            </svg>
        </button>
    );
}
