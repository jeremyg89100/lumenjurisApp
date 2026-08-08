// import { Library } from 'lucide-react';

import { useState } from "react";
import { fetchProxy } from "../../utils/fetchProxy";
import { AlertBanner } from "../common/AlertBanner";

export function LegalWatchSection() {
    const [ isAlertSuccess, setIsAlertSuccess] = useState(false);
    const [ isAlertError, setIsAlertError] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        
        const keywordsRaw = (formData.get("keywords") as string) || "";
        const keywordsArray: string[] = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);
        const contractTypesRaw = (formData.get("contractTypes") as string || "");
        const contractTypesArray: string[] = contractTypesRaw.split(",").map((c) => c.trim()).filter(Boolean);

        const payload = {
            concept: formData.get("concept") as string,
            label: formData.get("label") as string,
            keywords: keywordsArray,
            legalDomain: formData.get("legalDomain"),
            contractTypes: contractTypesArray,
        }

        try {
            const res = await fetchProxy("/api/legal-watch/legal-concept", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            })

            const result = await res.json();

            if (res.ok && result.success) {
                setIsAlertSuccess(true);
                form.reset();
            }
        } catch (error) {
            setIsAlertError(true);
            console.error("Erreur lors de la soumission du formulaire: ", error);
        }
    }
    return (
        <div>
            {isAlertError && (
            <AlertBanner
            title="Une erreur est survenue"
            variant="error"
            detail="La convention collective n'a pas pu être ajoutée, veuillez réessayer."
            duration={8000}
            onClose={() => setIsAlertError(false)}
            />
            )}

            {isAlertSuccess && (
            <AlertBanner
            title="Convention collective ajoutée avec succès"
            variant="success"
            detail="La convention collective a bien été ajoutée"
            duration={8000}
            onClose={() => setIsAlertSuccess(false)}
            />
            )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md p-4">
            <div className="space-y-4">
                {/* Domaine Juridique */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domaine juridique
                    </label>
                    <select
                    name="legalDomain"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                    <option value="convention_collective">Convention collective</option>
                    </select>
                </div>

                {/* Type de contrats */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de contrat
                    </label>
                    <select
                    name="contractTypes"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                    <option value="convention_collective">Convention collective</option>
                    </select>
                </div>
                </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Concept (ID)</label>
                <input name="concept" type="text" placeholder="ex: conv_metallurgie" 
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Label</label>
                <input name="label" type="text" placeholder="ex: Metallurgie" className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" required/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Keywords (Doit comporter KALICONT)</label>
                <input type="text" name="keywords" placeholder="Les mots doivent être séparés par des virgules" required 
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"/> 
            </div>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Ajouter</button>  
            
        </form>
        </div>
    )
}
