/**
 * Création assistée d'un contrat « de zéro », façon juriste :
 *  1. questions de CADRAGE fermées (choix) qui déterminent la structure/options,
 *  2. rédaction du contrat avec des VARIABLES {{…}} pour les données factuelles.
 * Réutilise le client IA existant (proxy → /openai-chat-5).
 */
import { callOpenAi52 } from "../../../utils/aiClient";

export interface WizardQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

export interface DraftVariable {
  id: string;
  label: string;
}
export interface DraftSection {
  heading?: string;
  content: string;
}
export interface ContractDraft {
  title: string;
  variables: DraftVariable[];
  sections: DraftSection[];
}

/** Isole le premier bloc JSON ([...] ou {...}) d'une réponse potentiellement bavarde. */
function extractJson(s: string): string {
  const openArr = s.indexOf("[");
  const closeArr = s.lastIndexOf("]");
  const openObj = s.indexOf("{");
  const closeObj = s.lastIndexOf("}");
  // Choisit le conteneur qui commence le plus tôt.
  if (openArr !== -1 && (openObj === -1 || openArr < openObj) && closeArr > openArr) {
    return s.slice(openArr, closeArr + 1);
  }
  if (openObj !== -1 && closeObj > openObj) return s.slice(openObj, closeObj + 1);
  return s;
}

let qCounter = 0;

/**
 * Exigence transverse : chaque contrat généré comporte un article RGPD adapté.
 * C'est un marqueur de la spécialité de l'outil — jamais une clause générique.
 */
const EXIGENCE_RGPD =
  `EXIGENCE RGPD (systématique) : inclure un article dédié « Protection des données personnelles (RGPD) », ` +
  `concret et rattaché à l'objet de CE contrat : quelles données sont traitées, pour quelles finalités et sur ` +
  `quelles bases légales, durées de conservation, droits des personnes et point de contact, mesures de sécurité. ` +
  `Si une partie traite des données pour le compte de l'autre, refléter l'article 28 du RGPD (instructions ` +
  `documentées, confidentialité, sous-traitance ultérieure, assistance, sort des données en fin de contrat). ` +
  `Ne jamais omettre cet article, même si le besoin exprimé n'en parle pas. `;

/** Exigence transverse : rien de contraire au droit français dans le texte produit. */
const EXIGENCE_LICEITE =
  `Le contrat doit être conforme au droit français en vigueur : n'insère aucune clause illicite, ` +
  `réputée non écrite ou contraire à une règle d'ordre public. `;

/** Questions de cadrage fermées qu'un juriste poserait pour ce contrat. */
export async function generateContractQuestions(title: string): Promise<WizardQuestion[]> {
  const prompt =
    `Tu es un juriste français spécialisé, expérimenté sur le contrat de type « ${title.trim()} ». ` +
    `Avant de rédiger, identifie d'abord silencieusement : (a) le domaine juridique précis de ce contrat, ` +
    `(b) les 4 à 7 points qui font le plus souvent l'objet d'un désaccord ou d'un arbitrage dans CE type de ` +
    `contrat spécifique en pratique française. ` +
    `Transforme UNIQUEMENT ces points en questions de CADRAGE fermées — celles qui changent la structure, ` +
    `les clauses ou le régime juridique du contrat. ` +
    `INTERDIT : questions génériques qui s'appliqueraient à n'importe quel contrat (ex. « Quelle est la durée ? », ` +
    `« Y a-t-il une clause de confidentialité ? ») sauf si ce point est spécifiquement structurant pour CE type ` +
    `de contrat précis. ` +
    `TON PUBLIC : des professionnels du droit et des opérationnels habitués aux contrats (juristes, RH, ` +
    `dirigeants). Emploie le terme juridique exact quand c'est le mot juste — sans le vulgariser inutilement — ` +
    `mais reste direct : une seule idée par question, formulation courte. Chaque option doit donner la portée ` +
    `PRATIQUE du choix (un chiffre, une conséquence, un usage de place) plutôt qu'un intitulé abstrait — et ` +
    `n'explique une notion entre parenthèses que si elle est réellement ambiguë. ` +
    `RÈGLE ABSOLUE SUR LES OPTIONS : chaque option proposée doit être LICITE en droit français. Ne propose JAMAIS ` +
    `une option contraire à une règle d'ordre public ou manifestement illégale (par exemple : durée ou renouvellement ` +
    `d'essai au-delà des maxima légaux, clause de non-concurrence sans contrepartie financière, délai de paiement ` +
    `au-delà du plafond légal, renonciation à un droit auquel on ne peut pas renoncer). Quand la loi fixe un plafond ` +
    `ou un plancher, toutes les options restent dans les limites légales et la plus proche de la limite le rappelle ` +
    `(ex. « 2 mois — maximum légal »). ` +
    `Ignore les informations factuelles (noms, adresses, dates, montants) : ce seront des variables à remplir. ` +
    `Réponds UNIQUEMENT en JSON : un tableau de 4 à 7 objets ` +
    `{"question": string, "type": "choice", "options": [string, …]} avec 2 à 4 options courtes, concrètes et ` +
    `mutuellement exclusives (pas de simples « Oui »/« Non » sauf si le choix est réellement binaire). ` +
    `N'emploie "type":"text" que si un choix fermé est vraiment impossible. Aucun texte hors JSON. ` +
    `Exemple de forme attendue (le contenu doit être adapté au contrat demandé, pas recopié) : ` +
    `{"question":"Quel régime de responsabilité en cas de manquement du prestataire ?","type":"choice","options":["Plafonnée au montant annuel du contrat — l'usage en prestation de services","Limitée aux seuls dommages directs, sans plafond","Responsabilité intégrale, préjudices indirects compris — protecteur pour le client"]}.`;
  const out = await callOpenAi52(prompt, "high", "low", "gpt-5.4-nano");
  let arr: unknown;
  try { arr = JSON.parse(extractJson(out)); } catch { arr = null; }
  if (!Array.isArray(arr)) throw new Error("Questions illisibles");
  const questions = (arr as unknown[])
    .map((raw): WizardQuestion | null => {
      const o = raw as { question?: unknown; type?: unknown; options?: unknown };
      const question = typeof o.question === "string" ? o.question.trim() : "";
      if (!question) return null;
      const options = Array.isArray(o.options)
        ? o.options.map((x) => String(x).trim()).filter(Boolean)
        : [];
      const type: "choice" | "text" = o.type === "text" || options.length === 0 ? "text" : "choice";
      qCounter += 1;
      return { id: `q${qCounter}`, question, type, options: type === "choice" ? options.slice(0, 4) : undefined };
    })
    .filter((q): q is WizardQuestion => q !== null)
    .slice(0, 8);
  if (questions.length === 0) throw new Error("Aucune question générée");
  return questions;
}

function parseDraft(out: string, title: string): ContractDraft {
  try {
    const j = JSON.parse(extractJson(out)) as {
      title?: unknown; variables?: unknown; sections?: unknown;
    };
    if (j && Array.isArray(j.sections)) {
      const variables = Array.isArray(j.variables)
        ? (j.variables as unknown[])
            .map((v) => {
              const o = v as { id?: unknown; label?: unknown };
              const id = typeof o.id === "string" ? o.id.trim() : "";
              return id ? { id, label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : id } : null;
            })
            .filter((v): v is DraftVariable => v !== null)
        : [];
      const sections = (j.sections as unknown[])
        .map((s) => {
          const o = s as { heading?: unknown; content?: unknown };
          return {
            heading: typeof o.heading === "string" && o.heading.trim() ? o.heading.trim() : undefined,
            content: String(o.content ?? "").trim(),
          };
        })
        .filter((s) => s.content);
      if (sections.length > 0) {
        return {
          title: typeof j.title === "string" && j.title.trim() ? j.title.trim() : title.toUpperCase(),
          variables,
          sections,
        };
      }
    }
  } catch { /* repli ci-dessous */ }
  return { title: title.toUpperCase(), variables: [], sections: [{ content: out.trim() }] };
}

/**
 * Identité d'une partie, telle que renvoyée par la recherche d'entreprise
 * (base publique SIREN/SIRET) ou saisie à la main.
 */
export interface PartyIdentity {
  role: string;
  nom?: string | null;
  forme_juridique?: string | null;
  siren?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  rcs_ville?: string | null;
  representant?: string | null;
  qualite?: string | null;
}

/**
 * Bloc d'instructions décrivant les parties connues. Ces données sont ecrites
 * en toutes lettres dans le contrat : inutile d'en faire des variables a
 * remplir, elles sont deja renseignees.
 */
function blocParties(parties: PartyIdentity[] = []): string {
  const connues = parties.filter((p) => p.nom?.trim());
  if (connues.length === 0) return "";

  const fiches = connues
    .map((p) => {
      const lignes: string[] = [];
      const ajoute = (label: string, v?: string | null) => {
        if (v?.trim()) lignes.push(`  ${label} : ${v.trim()}`);
      };
      ajoute("Dénomination", p.nom);
      ajoute("Forme juridique", p.forme_juridique);
      ajoute("SIREN", p.siren);
      ajoute("Ville", p.ville);
      ajoute("Code postal", p.code_postal);
      ajoute("Greffe RCS", p.rcs_ville);
      ajoute("Représentant", p.representant);
      ajoute("Qualité du représentant", p.qualite);
      return `- ${p.role} :\n${lignes.join("\n")}`;
    })
    .join("\n");

  return (
    `PARTIES DÉJÀ IDENTIFIÉES — reprends ces informations telles quelles dans le préambule ` +
    `et partout où la partie est désignée. Ne crée AUCUNE variable {{…}} pour une donnée ` +
    `figurant ci-dessous : elle est connue, écris-la en clair. Les données absentes de cette ` +
    `liste (capital, adresse précise…) restent, elles, des variables.\n${fiches}\n\n`
  );
}

/** Format de sortie commun aux deux modes de rédaction. */
const FORMAT_JSON_CONTRAT =
  `Emploie des VARIABLES au format {{snake_case}} pour TOUTES les données factuelles à remplir ` +
  `(parties, adresses, dates, montants…). ` +
  `Réponds UNIQUEMENT en JSON : ` +
  `{"title": string en MAJUSCULES, "variables": [{"id": "snake_case", "label": "Libellé lisible"}], ` +
  `"sections": [{"heading": "Article 1 – …", "content": "… {{variable}} …"}]}. ` +
  `Inclure un préambule (heading « Préambule ») et une dernière section « Signatures ». ` +
  `Chaque variable utilisée dans un content DOIT figurer dans "variables". Aucun texte hors JSON.`;

/** Rédige le contrat structuré, avec variables {{…}}, à partir des choix de cadrage. */
export async function generateContractDraft(
  title: string,
  answers: { question: string; answer: string }[],
  parties: PartyIdentity[] = [],
): Promise<ContractDraft> {
  const choices = answers.map((a) => `- ${a.question} → ${a.answer || "(indifférent)"}`).join("\n");
  const prompt =
    `Tu es un juriste français. Rédige un contrat de type « ${title.trim()} » conforme et structuré, ` +
    `en tenant compte des choix de cadrage suivants :\n${choices}\n\n` +
    blocParties(parties) +
    EXIGENCE_LICEITE + EXIGENCE_RGPD + FORMAT_JSON_CONTRAT;
  const out = await callOpenAi52(prompt, "medium", "medium", "gpt-5.2");
  return parseDraft(out, title);
}

export interface BriefAttachment {
  name: string;
  text: string;
}

/**
 * Mode « je décris, l'outil se débrouille » : rédige le contrat directement
 * depuis un besoin exprimé librement, en s'adaptant aux pièces jointes fournies
 * (texte extrait de PDF/Word). L'IA tranche elle-même les arbitrages, en
 * retenant l'option usuelle la plus protectrice.
 */
export async function generateContractDraftFromBrief(
  title: string,
  brief: string,
  attachments: BriefAttachment[] = [],
  parties: PartyIdentity[] = [],
): Promise<ContractDraft> {
  const docs = attachments
    .filter((a) => a.text.trim())
    .map((a) => {
      const text = a.text.trim();
      const excerpt = text.slice(0, 6000);
      const truncated = text.length > 6000 ? "\n[… document tronqué : seul le début est fourni]" : "";
      return `--- Pièce jointe « ${a.name} » ---\n${excerpt}${truncated}`;
    })
    .join("\n\n");
  const prompt =
    `Tu es un juriste français. Rédige un contrat de type « ${title.trim()} », complet et directement ` +
    `utilisable, à partir du besoin exprimé ci-dessous par un professionnel qui n'a pas le temps de ` +
    `détailler. Prends toi-même toutes les décisions de structure et de clauses qu'il n'a pas précisées, ` +
    `en retenant à chaque fois l'option la plus usuelle et la plus équilibrée en pratique française.\n\n` +
    `BESOIN EXPRIMÉ :\n${brief.trim()}\n\n` +
    (docs
      ? `PIÈCES JOINTES — adapte le contrat à leur contenu : reprends les informations et le contexte ` +
        `utiles, reste cohérent avec elles, et signale par une variable {{…}} toute donnée qu'elles ne ` +
        `fournissent pas :\n${docs}\n\n`
      : "") +
    blocParties(parties) +
    EXIGENCE_LICEITE + EXIGENCE_RGPD + FORMAT_JSON_CONTRAT;
  const out = await callOpenAi52(prompt, "high", "medium", "gpt-5.2");
  return parseDraft(out, title);
}
