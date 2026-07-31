


// Fonction retité de la page ContractAnalysis



const visibleHistoryItems = useMemo(() => {
    const temporaryItems = Object.values(temporaryHistoryEntries).map((entry) =>
        createContractHistoryPreviewItem(
            createTemporaryHistorySnapshot(entry),
            historyItems.find((item) => item.id === entry.id),
        ),
    );
    const temporaryIds = new Set(temporaryItems.map((item) => item.id));

    return [
        ...temporaryItems,
        ...historyItems.filter((item) => !temporaryIds.has(item.id)),
    ].sort(compareByUploadTimeDesc);
}, [historyItems, temporaryHistoryEntries]);



const handleDeleteHistoryItem = async (historyId: string) => {
    const isTemporaryItem = Boolean(
        temporaryHistoryEntriesRef.current[historyId],
    );
    const isDraftItem =
        isTemporaryItem ||
        (historyId === currentHistoryId && contract?.processed === false);
    const confirmMessage = isDraftItem
        ? "Abandonner cette analyse en cours ?"
        : "Supprimer ce document de l'historique ?";

    if (!window.confirm(confirmMessage)) return;

    if (isTemporaryItem) {
        removeTemporaryHistoryEntry(historyId);

        if (historyId !== currentHistoryId) return;

        setActiveHistoryId(null);
        resetAllPatches();
        clearEnhancedClauseCaches();
        resetAnalysis();
        setSelectedClause(null);
        setReviewedClauses(new Set());
        setShowAnalysisForm(false);
        setShowMarketAnalysis(false);
        return;
    }

    await deleteContractHistoryEntry(historyId);
    setHistoryItems(await loadContractHistoryIndex());

    if (historyId !== currentHistoryId) return;

    setActiveHistoryId(null);
    resetAllPatches();
    clearEnhancedClauseCaches();
    resetAnalysis();
    setSelectedClause(null);
    setReviewedClauses(new Set());
    setShowAnalysisForm(false);
    setShowMarketAnalysis(false);
};


const handleNewAnalysis = () => {
    if (!confirmLeavingUnfinishedAnalysis()) return;
    resetPageState();
};




const resetPageState = () => {
    documentPreparationRef.current = null;
    temporaryHistoryEntriesRef.current = {};
    setTemporaryHistoryEntries({});
    setActiveHistoryId(null);
    clearAllAppliedRecommendations();
    resetAllPatches();
    clearEnhancedClauseCaches();
    resetAnalysis();
    setSelectedClause(null);
    setShowAnalysisForm(false);
    setReviewedClauses(new Set());
    setShowMarketAnalysis(false);
};