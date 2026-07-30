import { useEffect, useState } from "react";
import { UploadZone } from "../ContractAnalysis/UploadZone";
import { useContractAnalysis } from "../../hooks/useContractAnalysis";
import { ContractSummary, ContractSummuryList, summarizeContract } from "../../utils/contractSummarizer";
import { fetchProxy } from "../../utils/fetchProxy";

const formatParty = (partie: any) => {
  if (typeof partie === "string") return partie;
  if (typeof partie === "object" && partie !== null) {
    const name = partie.nom || partie.nom_prenom || partie.denomination || partie.raison_sociale;
    const role = partie.qualite || partie.role || partie.type;
    if (name) return role ? `${name} (${role})` : name;
    if (role) return role;
  }
  return "Partie non identifiée";
};

const hasValidContent = (obj: any) => {
  if (!obj) return false;
  if (typeof obj === "string") return obj.trim().length > 0;
  if (typeof obj === "object") {
    return Object.values(obj).some(
      (val) => val !== null && val !== undefined && val !== "" && (!Array.isArray(val) || val.length > 0)
    );
  }
  return false;
};

export function ComprendreContrat() {
  const { handleFileUpload, handleTextSubmit, isProcessing, processingPhase } = useContractAnalysis();
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [selectedLlm, setSelectedLlm] = useState<string>("gpt-4o-mini");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractSummary | null>(null);
  const [contractsList, setContractsList] = useState<ContractSummuryList[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeSummary = selectedContract || summary;

  const handleFile = async (file: File) => {
    const extracted = await handleFileUpload(file);
    if (!extracted?.content) return;

    const resSummary = await summarizeContract(extracted.content, extracted.fileName, selectedLlm);
    setSummary(resSummary);
    setSelectedContract(null);
    setIsModalOpen(false);

    await handleListContract();
  };

  const handleListContract = async () => {
    try {
      setIsLoading(true);
      const res = await fetchProxy("/api/summarize-contrac/list-contract-summarize", {
        credentials: "include",
      });
      const result = await res.json();

      if (result.success) {
        setContractsList(result.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la liste :", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectContract = async (idSummary: number) => {
    try {
      const res = await fetchProxy(`/api/contract-summarize/contract-summarize-content?idSummary=${idSummary}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (result.success) {
        setSelectedContract(result.data);
        setSummary(null);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du contrat :", error);
    }
  };

  const textSubmit = async (text: string, fileName: string) => {
    const extracted = await handleTextSubmit(text, fileName);
    if (!extracted) return;

    const contentToSummarize = typeof extracted === "string" ? extracted : extracted.content;
    if (!contentToSummarize) return;

    const resSummary = await summarizeContract(contentToSummarize, extracted.fileName, selectedLlm);
    setSummary(resSummary);
    setSelectedContract(null);
    setIsModalOpen(false);
    
    await handleListContract();
  };

  useEffect(() => {
    handleListContract();
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col items-center justify-center p-6 text-center border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Analyse et compréhension de contrat
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          Importez votre document ou collez du texte pour obtenir un résumé automatique.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors"
        >
          Analysé un nouveau contrat
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Vos contrats enregistrés :</h3>
        
        {isLoading && <p className="text-xs text-gray-500">Chargement de la liste...</p>}

        <div className="flex flex-col gap-3">
          {contractsList?.map((contract: any) => (
            <div
              key={contract.idSummary}
              onClick={() => handleSelectContract(contract.idSummary)}
              className={`cursor-pointer p-3 rounded-lg border transition-all ${
                selectedContract?.idSummary === contract.idSummary
                  ? "border-blue-500 bg-blue-50/40 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <p className="font-medium text-sm text-gray-800 truncate">{contract.fileName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(contract.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {activeSummary ? (
        <div className="mt-8 space-y-6 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Résumé du contrat</h3>

            {activeSummary.niveau_risque?.niveau && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  activeSummary.niveau_risque.niveau.toLowerCase().includes("élevé") ||
                  activeSummary.niveau_risque.niveau.toLowerCase().includes("haut")
                    ? "bg-red-100 text-red-800"
                    : activeSummary.niveau_risque.niveau.toLowerCase().includes("moyen")
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                Risque : {activeSummary.niveau_risque.niveau}
              </span>
            )}
          </div>

          {activeSummary.niveau_risque?.justification && (
            <p className="text-xs text-gray-500 italic">
              {activeSummary.niveau_risque.justification}
            </p>
          )}

          {activeSummary.resume_executif && (
            <div className="rounded-lg bg-blue-50/50 p-4 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-1">📝 Résumé exécutif</h4>
              <p className="text-sm text-blue-950 leading-relaxed">{activeSummary.resume_executif}</p>
            </div>
          )}

          {activeSummary.objet && (
            <div>
              <h4 className="font-semibold text-gray-700">📌 Objet du contrat</h4>
              <p className="text-sm text-gray-600 mt-1">{activeSummary.objet}</p>
            </div>
          )}

          {Array.isArray(activeSummary.parties) && activeSummary.parties.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">👥 Parties au contrat</h4>
              <div className="flex flex-wrap gap-2">
                {activeSummary.parties.map((partie, index) => (
                  <span
                    key={index}
                    className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 capitalize"
                  >
                    {formatParty(partie)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(activeSummary.points_attention) && activeSummary.points_attention.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Points d'attention</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-900">
                {activeSummary.points_attention.map((point, index) => (
                  <li key={index}>{typeof point === "string" ? point : JSON.stringify(point)}</li>
                ))}
              </ul>
            </div>
          )}

          {activeSummary.obligations && Object.keys(activeSummary.obligations).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">📋 Obligations principales</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {typeof activeSummary.obligations === "object" && !Array.isArray(activeSummary.obligations) ? (
                  Object.entries(activeSummary.obligations).map(([key, val], index) => (
                    <div key={index} className="rounded-md bg-gray-50 p-3">
                      <span className="font-medium text-gray-800 capitalize">{key.replace(/_/g, " ")} : </span>
                      {Array.isArray(val) ? (
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {val.map((item, i) => (
                            <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                          ))}
                        </ul>
                      ) : typeof val === "object" && val !== null ? (
                        <span className="text-gray-700">
                          {Object.entries(val)
                            .filter(([_, v]) => v !== null && v !== undefined)
                            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                            .join(", ") || "Aucune obligation spécifique"}
                        </span>
                      ) : (
                        <span>{String(val ?? "Non spécifié")}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p>{String(activeSummary.obligations)}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.isArray(activeSummary.delais_importants) && activeSummary.delais_importants.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-2">⏳ Délais importants</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {activeSummary.delais_importants.map((delai, index) => (
                    <li key={index}>{typeof delai === "string" ? delai : JSON.stringify(delai)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* {Array.isArray(activeSummary.clauses_particulieres) && activeSummary.clauses_particulieres.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-2">⚖️ Clauses particulières</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {activeSummary.clauses_particulieres.map((clauseItem, index) => {
                    if (typeof clauseItem === "string") {
                      return <li key={index}>{clauseItem}</li>;
                    }

                    if (typeof clauseItem === "object" && clauseItem !== null) {
                      const entries = Object.entries(clauseItem);
                      const clauseName = entries[0]?.[0] || "Clause";
                      const textContent = entries.find(
                        ([_, val]) => typeof val === "string" && val.trim() !== ""
                      )?.[1];

                      return (
                        <li key={index}>
                          <strong className="capitalize">{clauseName.replace(/_/g, " ")}</strong>
                          {textContent ? ` : ${textContent}` : ""}
                        </li>
                      );
                    }

                    return null;
                  })}
                </ul>
              </div>
            )} */}
          </div>

          {(hasValidContent(activeSummary.conditions_financieres) || hasValidContent(activeSummary.resiliation)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              {hasValidContent(activeSummary.conditions_financieres) && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">💳 Conditions financières</h4>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg space-y-1">
                    {typeof activeSummary.conditions_financieres === "object"
                      ? Object.entries(activeSummary.conditions_financieres)
                          .filter(([_, val]) => val !== null && val !== undefined)
                          .map(([k, val], i) => (
                            <div key={i}>
                              <span className="font-medium text-gray-700 capitalize">{k.replace(/_/g, " ")} : </span>
                              <span>{String(val)}</span>
                            </div>
                          ))
                      : activeSummary.conditions_financieres}
                  </div>
                </div>
              )}

              {hasValidContent(activeSummary.resiliation) && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">🚪 Modalités de résiliation</h4>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg space-y-1">
                    {typeof activeSummary.resiliation === "object"
                      ? Object.entries(activeSummary.resiliation)
                          .filter(([_, val]) => val !== null && val !== undefined)
                          .map(([k, val], i) => (
                            <div key={i}>
                              <span className="font-medium text-gray-700 capitalize">{k.replace(/_/g, " ")} : </span>
                              <span>{String(val)}</span>
                            </div>
                          ))
                      : activeSummary.resiliation}
                  </div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(activeSummary.annexes) && activeSummary.annexes.length > 0 && (
            <div className="text-xs text-gray-500 pt-2">
              <span className="font-medium text-gray-700">📎 Annexes mentionnées : </span>
              {activeSummary.annexes
                .map((annexe) => {
                  if (typeof annexe === "string") return annexe;

                  if (typeof annexe === "object" && annexe !== null) {
                    const entries = Object.entries(annexe);
                    const textVal = entries.find(
                      ([_, val]) => typeof val === "string" && val.trim() !== ""
                    )?.[1];

                    return textVal || "Annexe sans nom";
                  }

                  return String(annexe);
                })
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 border-t border-gray-100 pt-8 text-center text-gray-400">
          <p className="text-sm">Sélectionnez un contrat dans la liste ci-dessus ou analysez-en un nouveau.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isProcessing}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ✕
            </button>

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Importer ou coller votre texte
            </h3>

            <div className="mb-4">
              <label htmlFor="llm-select" className="block text-xs font-semibold text-gray-600 mb-1">
                Modèle d'IA utilisé
              </label>
              <select
                id="llm-select"
                value={selectedLlm}
                onChange={(e) => setSelectedLlm(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Rapide & Économique)</option>
                <option value="gpt-4o">GPT-4o (Standard - Recommandé)</option>
                <option value="gpt-5.2">GPT-5.2 (Raisonnement avancé)</option>
              </select>
            </div>

            <UploadZone
              onFileSelect={handleFile}
              disabled={isProcessing}
              onTextSubmit={textSubmit}
              isProcessing={isProcessing}
              processingPhase={processingPhase}
              analyseCredit={9999}
            />
          </div>
        </div>
      )}
    </div>
  );
}
