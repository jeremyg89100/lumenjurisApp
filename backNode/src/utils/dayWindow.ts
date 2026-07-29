/**
 * Utilitaires de fenêtre temporelle "par jour" pour les graphes du monitoring.
 *
 * Objectif : garantir que TOUS les graphes journaliers (usage LLM, usage des
 * fonctionnalités…) découpent les jours de la même manière, pour éviter les
 * écarts de "nombre de jours d'activité" d'un graphe à l'autre.
 *
 * Conventions communes :
 *  - un "jour" est calculé sur le fuseau LOCAL du serveur (pas en UTC), pour
 *    correspondre à la façon dont l'usage LLM stocke ses dates ;
 *  - la fenêtre commence à MINUIT (et non à l'heure courante moins N×24 h),
 *    pour que le jour le plus ancien ne soit jamais tronqué ;
 *  - la fenêtre est "zéro-remplie" : chaque jour de la période est présent,
 *    même sans activité, pour un axe X régulier et sans trou.
 */

/** Clé de jour "YYYY-MM-DD" à partir des composantes LOCALES de la date. */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Construit une fenêtre de `days` jours se terminant aujourd'hui (inclus).
 * @returns `from` = minuit local du premier jour, et `keys` = la liste ordonnée
 *          des clés de jour ("YYYY-MM-DD"), du plus ancien au plus récent.
 */
export function buildDayWindow(days: number): { from: Date; keys: string[] } {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // On remonte (days - 1) jours pour qu'aujourd'hui soit toujours inclus.
  const from = new Date(todayStart);
  from.setDate(from.getDate() - (days - 1));

  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    keys.push(localDayKey(d));
  }

  return { from, keys };
}
