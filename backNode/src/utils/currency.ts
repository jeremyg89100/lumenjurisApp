// Conversion de devise USD → EUR.
//
// Les coûts des LLM (Anthropic, OpenAI…) sont enregistrés en dollars dans la
// table LlmUsage. Pour les afficher côté fiscalité (déclaration en euros), on a
// besoin d'un taux de change.
//
// Choix volontairement simple pour le moment : un taux FIXE, configurable via la
// variable d'environnement `USD_TO_EUR_RATE`. C'est approximatif et assumé comme
// tel — l'écran affiche le taux utilisé pour rester transparent.
//
// Le jour où l'on voudra un taux dynamique (API de change, taux mensuel Stripe,
// etc.), il suffira de modifier CE fichier : c'est le seul endroit du code qui
// convertit des dollars en euros.

// Taux par défaut si la variable d'environnement n'est pas définie.
// 1 dollar ≈ 0,92 euro (valeur indicative de repli).
const DEFAULT_USD_TO_EUR_RATE = 0.92;

/**
 * Renvoie le taux de conversion 1 USD → X EUR utilisé actuellement.
 * Lu à chaque appel (et non au chargement du module) pour que la valeur du .env
 * soit prise en compte même si dotenv est initialisé après cet import.
 */
export function getUsdToEurRate(): number {
  const raw = process.env.USD_TO_EUR_RATE;
  if (!raw) return DEFAULT_USD_TO_EUR_RATE;

  const parsed = Number(raw);
  // Garde-fou : une valeur non numérique ou absurde retombe sur le défaut.
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_USD_TO_EUR_RATE;

  return parsed;
}

/** Convertit un montant en dollars vers un montant en euros, avec le taux courant. */
export function convertUsdToEur(amountUsd: number): number {
  return amountUsd * getUsdToEurRate();
}
