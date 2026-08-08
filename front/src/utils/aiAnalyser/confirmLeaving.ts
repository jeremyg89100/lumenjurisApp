

export const RECENT_NAVIGATION_CONFIRM_MS = 500;
export const LEAVE_ANALYSIS_WARNING =
    "Une analyse est en cours ou n'a pas été finalisée. Si vous quittez cette page, elle sera abandonnée.";

export const confirmLeavingUnfinishedAnalysis = (
    shouldWarnBeforeLeaving: any
    , confirmedNavigationAtRef: any
) => {
    if (!shouldWarnBeforeLeaving) return true;

    const hasRecentlyConfirmed =
        Date.now() - confirmedNavigationAtRef.current <
        RECENT_NAVIGATION_CONFIRM_MS;
    if (hasRecentlyConfirmed) return true;

    const confirmed = window.confirm(LEAVE_ANALYSIS_WARNING);
    if (confirmed) {
        confirmedNavigationAtRef.current = Date.now();
    }

    return confirmed;
};