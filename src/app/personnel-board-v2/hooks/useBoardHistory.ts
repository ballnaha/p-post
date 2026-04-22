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
            const cloneCols = typeof structuredClone === 'function' ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));
            const cloneMap = typeof structuredClone === 'function' ? structuredClone(personnelMap) : JSON.parse(JSON.stringify(personnelMap));
            
            const newPast = [...prev, {
                columns: cloneCols,
                personnelMap: cloneMap,
                selectedIds: [...selectedIds]
            }];
            // Reduce max history states from 50 to 15 for 200+ lanes performance
            if (newPast.length > 15) return newPast.slice(newPast.length - 15);
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
            setFuture(prev => {
                const cloneCols = typeof structuredClone === 'function' ? structuredClone(currentColumns) : JSON.parse(JSON.stringify(currentColumns));
                const cloneMap = typeof structuredClone === 'function' ? structuredClone(currentPersonnelMap) : JSON.parse(JSON.stringify(currentPersonnelMap));
                
                return [{
                    columns: cloneCols,
                    personnelMap: cloneMap,
                    selectedIds: [...currentSelectedIds]
                }, ...prev].slice(0, 15);
            });
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
            setPast(prev => {
                const cloneCols = typeof structuredClone === 'function' ? structuredClone(currentColumns) : JSON.parse(JSON.stringify(currentColumns));
                const cloneMap = typeof structuredClone === 'function' ? structuredClone(currentPersonnelMap) : JSON.parse(JSON.stringify(currentPersonnelMap));
                
                return [...prev, {
                    columns: cloneCols,
                    personnelMap: cloneMap,
                    selectedIds: [...currentSelectedIds]
                }].slice(-15);
            });
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
