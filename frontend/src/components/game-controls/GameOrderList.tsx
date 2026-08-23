import { useState } from "react";

import "./GameOrderList.css";

interface GameOrderItem {
    id: string;
    label: string;
    locked?: boolean;
}

interface GameOrderListProps {
    items: GameOrderItem[];
    onMove: (id: string, direction: "up" | "down") => Promise<void>;
}

// Drag-to-reorder list of participants, backed by the same one-step
// up/down move each game type already exposes. A drag from position i to
// position j is just i-to-j one-step moves in a row, so this works
// against every game's existing swap logic without needing a bulk
// reorder endpoint. Locked rows (current turn, finished) can't be
// dragged and stop a drag from landing past them.
export function GameOrderList({ items, onMove }: GameOrderListProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [moving, setMoving] = useState(false);

    async function handleDrop(targetIndex: number) {
        if (!draggedId || moving) return;
        const fromIndex = items.findIndex(i => i.id === draggedId);
        setDraggedId(null);
        if (fromIndex === -1 || fromIndex === targetIndex) return;

        const steps = Math.abs(targetIndex - fromIndex);
        const direction = targetIndex > fromIndex ? "down" : "up";

        setMoving(true);
        try {
            for (let i = 0; i < steps; i++) {
                await onMove(draggedId, direction);
            }
        } finally {
            setMoving(false);
        }
    }

    return (
        <ul className="game-order-list">
            {items.map((item, index) => (
                <li
                    key={item.id}
                    className={`game-order-list__item${item.locked ? " game-order-list__item--locked" : ""}${draggedId === item.id ? " game-order-list__item--dragging" : ""}`}
                    draggable={!item.locked && !moving}
                    onDragStart={() => setDraggedId(item.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                >
                    <span className="game-order-list__handle" aria-hidden="true">
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="2" r="1.4" fill="currentColor" />
                            <circle cx="2" cy="8" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                            <circle cx="2" cy="14" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="14" r="1.4" fill="currentColor" />
                        </svg>
                    </span>
                    <span className="game-order-list__label">{item.label}</span>
                </li>
            ))}
        </ul>
    );
}
