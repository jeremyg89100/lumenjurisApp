import { useState, useRef } from "react"
import { ContractHistoryItem } from "../../utils/contractHistory";

import { AnalysisContext } from "../../types/contextualAnalysis";
import { AppliedRecommendation } from "../../store/appliedRecommendationsStore";
import { TextPatch } from "../../store/documentTextStore";
import { AnalysisProgress } from "../../types/analysisProgress";
import { ProcessingPhase } from "../useContractAnalysis";
import { MarketAnalysisResult } from "../../utils/marketAnalysis";
import { ContractAnalysis as ContractAnalysisType } from "../../types";
import { useDocumentTextStore } from "../../store/documentTextStore";
import { useAppliedRecommendationsStore } from "../../store/appliedRecommendationsStore";



export type TemporaryHistoryEntry = {
    id: string;
    contract: ContractAnalysisType;
    htmlContent: string | null;
    currentAnalysisContext: AnalysisContext | null;
    patches: TextPatch[];
    appliedRecommendations: AppliedRecommendation[];
    marketAnalysis: MarketAnalysisResult | null;
    reviewedClauseIds: string[];
    isProcessing: boolean;
    processingPhase: ProcessingPhase;
    analysisProgress: AnalysisProgress | null;
};


/**
 * Gestion de l'historique d'un contrat avec persistence dans la base de données
 * 
 */
export const useContractHistory = () => {

    const [historyItems, setHistoryItems] = useState<ContractHistoryItem[]>([]);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const [temporaryHistoryEntries, setTemporaryHistoryEntries] = useState<Record<string, TemporaryHistoryEntry>>({});
    const temporaryHistoryEntriesRef = useRef<Record<string, TemporaryHistoryEntry>>({});




    const updateTemporaryHistoryEntry = (
        historyId: string,
        updater: (entry: TemporaryHistoryEntry) => TemporaryHistoryEntry,
    ) => {
        const currentRefEntry = temporaryHistoryEntriesRef.current[historyId];
        if (currentRefEntry) {
            temporaryHistoryEntriesRef.current = {
                ...temporaryHistoryEntriesRef.current,
                [historyId]: updater(currentRefEntry),
            };
        }

        setTemporaryHistoryEntries((previousEntries) => {
            const currentEntry = previousEntries[historyId];
            if (!currentEntry) return previousEntries;

            return {
                ...previousEntries,
                [historyId]: updater(currentEntry),
            };
        });
    };





    const removeTemporaryHistoryEntry = (historyId: string) => {
        if (temporaryHistoryEntriesRef.current[historyId]) {
            const nextRefEntries = { ...temporaryHistoryEntriesRef.current };
            delete nextRefEntries[historyId];
            temporaryHistoryEntriesRef.current = nextRefEntries;
        }

        setTemporaryHistoryEntries((previousEntries) => {
            if (!previousEntries[historyId]) return previousEntries;

            const nextEntries = { ...previousEntries };
            delete nextEntries[historyId];
            return nextEntries;
        });
    };





    const rememberTemporaryContract = (
        historyId: string,
        preparedContract: ContractAnalysisType,
    ) => {
        const documentState = useDocumentTextStore.getState();
        const recommendationState = useAppliedRecommendationsStore.getState();
        const entry: TemporaryHistoryEntry = {
            id: historyId,
            contract: preparedContract,
            htmlContent: documentState.htmlContent,
            currentAnalysisContext: null,
            patches: documentState.patches,
            appliedRecommendations: recommendationState.appliedRecommendations,
            marketAnalysis: null,
            reviewedClauseIds: [],
            isProcessing: false,
            processingPhase: "extraction",
            analysisProgress: null,
        };

        temporaryHistoryEntriesRef.current = {
            ...temporaryHistoryEntriesRef.current,
            [historyId]: entry,
        };

        setTemporaryHistoryEntries((previousEntries) => ({
            ...previousEntries,
            [historyId]: entry,
        }));
    };





    return {

        historyItems,
        currentHistoryId,
        temporaryHistoryEntriesRef,
        temporaryHistoryEntries,

        setCurrentHistoryId,
        setHistoryItems,
        updateTemporaryHistoryEntry,
        removeTemporaryHistoryEntry,
        rememberTemporaryContract,
    }
}