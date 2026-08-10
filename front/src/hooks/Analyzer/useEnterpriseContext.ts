import { useEffect, useState } from "react"
import { EnterpriseAnalysisContext } from "../../types/contextualAnalysis";
import { fetchProxy } from "../../utils/fetchProxy";
import { ApiResponse } from "../../types/paramSettings";
import { ConventionCollectiveOption } from "../../types/paramSettings";
import { EnterpriseSettings } from "../../types/paramSettings";

type EnterpriseGetData = EnterpriseSettings & {
    selectedIdcc?: ConventionCollectiveOption | null;
};


export const useEnterpriseContext = () => {
    const [enterpriseContext, setEntrepriseContext] =
        useState<EnterpriseAnalysisContext | undefined>(undefined);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const abortController = new AbortController();

        const loadEnterpriseContext = async () => {
            try {
                setIsLoading(true);

                const response = await fetchProxy("/api/enterprise", {
                    credentials: "include",
                    signal: abortController.signal,
                });

                const payload = (await response
                    .json()
                    .catch(() => null)) as ApiResponse<EnterpriseGetData> | null;

                if (!response.ok || !payload?.success) {
                    setEntrepriseContext(undefined);
                    return;
                }

                setEntrepriseContext(
                    mapEnterpriseToAnalysisContext(payload.data)
                );

            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error(
                    "Impossible de charger le contexte entreprise.",
                    error
                );

                setEntrepriseContext(undefined);

            } finally {
                setIsLoading(false);
            }
        };

        loadEnterpriseContext();

        return () => abortController.abort();

    }, []);

    return {
        enterpriseContext,
        isLoading,
    };
};



function mapEnterpriseToAnalysisContext(
    enterprise?: EnterpriseGetData | null,
): EnterpriseAnalysisContext | undefined {
    const selectedConvention = getSelectedConventionCollective(enterprise);
    const enterpriseContext: EnterpriseAnalysisContext = {
        collectiveAgreement: cleanEnterpriseContextValue(selectedConvention?.name),
        companyLegalForm: cleanEnterpriseContextValue(enterprise?.statusJuridique),
    };

    return Object.values(enterpriseContext).some(Boolean)
        ? enterpriseContext
        : undefined;
}



function cleanEnterpriseContextValue(value?: string | null): string | null {
    const cleanedValue = value?.trim();
    return cleanedValue ? cleanedValue : null;
}

function getSelectedConventionCollective(
    enterprise?: EnterpriseGetData | null,
): ConventionCollectiveOption | null {
    if (!enterprise) return null;

    if (enterprise.selectedIdcc) {
        return enterprise.selectedIdcc;
    }

    return (
        enterprise.idccSelections.find(
            (selection) => selection.key === enterprise.selectedIdccKey,
        ) ?? null
    );
}
