import { callOpenAI } from "./openaiClient.js";
import { promptSummary } from "./templatePrompt.js";

export interface ContractSummary {
    parties: string,
    objet: string,
    obligations: string[],
    pointsAttention: string[];
    duree: string | null,
}

export async function summarizeContract(content: string, selectedLlm: string):Promise<ContractSummary> {
    const prompt = promptSummary(content);

    const llm = selectedLlm;

    const raw = await callOpenAI([{role: "user", content: prompt}], {
        model: llm,
        temperature: 0.2,
        max_tokens: 2000,
        response_format: {type: "json_object"},
    }) 

    const cleanedRaw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(cleanedRaw) as ContractSummary;
    } catch (err) {
        console.error("Echec du parse JSON OpenAi :", raw);
        throw new Error("Réponse OpenAI invalide (JSON corrompu");
    }
    
}
