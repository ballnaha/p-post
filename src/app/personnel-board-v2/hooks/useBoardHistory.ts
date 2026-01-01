import { useState, useCallback } from 'react';
import { Column, Personnel } from '../types';

interface BoardState {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    selectedIds: string[];
}

export const useBoardHistory = (
    initialColumns: Column[],
    initialPersonnelMap: Record<string, Personnel>,
    initialSelectedIds: string[] = []
) => {
    const [past, setPast] = useState<BoardState[]>([]);
    const [future, setFuture] = useState<BoardState[]>([]);

    const takeSnapshot = useCallback((
        columns: Column[],
        personnelMap: Record<string, Personnel>,
        selectedIds: string[]
    ) => {
        setPast(prev => {
            const newPast = [...prev, {
                columns: JSON.parse(JSON.stringify(columns)),
                personnelMap: JSON.parse(JSON.stringify(personnelMap)),
                selectedIds: [...selectedIds]
            }];
            if (newPast.length > 50) return newPast.slice(newPast.length - 50);
            return newPast;
        });
        setFuture([]);
    }, []);

    const undo = useCallback((
        currentColumns: Column[],
        currentPersonnelMap: Record<string, Personnel>,
        currentSelectedIds: string[]
    ) => {
        if (past.length === 0) return null;

        const newPast = [...past];
        const previousState = newPast.pop();

        if (previousState) {
            setPast(newPast);
            setFuture(prev => [{
                columns: JSON.parse(JSON.stringify(currentColumns)),
                personnelMap: JSON.parse(JSON.stringify(currentPersonnelMap)),
                selectedIds: [...currentSelectedIds]
            }, ...prev]);
            return previousState;
        }
        return null;
    }, [past]);

    const redo = useCallback((
        currentColumns: Column[],
        currentPersonnelMap: Record<string, Personnel>,
        currentSelectedIds: string[]
    ) => {
        if (future.length === 0) return null;

        const newFuture = [...future];
        const nextState = newFuture.shift();

        if (nextState) {
            setFuture(newFuture);
            setPast(prev => [...prev, {
                columns: JSON.parse(JSON.stringify(currentColumns)),
                personnelMap: JSON.parse(JSON.stringify(currentPersonnelMap)),
                selectedIds: [...currentSelectedIds]
            }]);
            return nextState;
        }
        return null;
    }, [future]);

    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    return {
        past,
        future,
        takeSnapshot,
        undo,
        redo,
        clearHistory,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
};
