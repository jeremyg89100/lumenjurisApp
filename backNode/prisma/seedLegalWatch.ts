/**
 * Seed de la veille juridique : source Judilibre + taxonomie des concepts CDD.
 *
 * Idempotent : upsert par clé unique (name / concept) — relançable sans doublon.
 *
 * Lancement : npx tsx prisma/seedLegalWatch.ts
 *
 * `contractTypes` contient des CLÉS de modèles du moteur de génération
 * (front/src/contractEngine/models — ex. "cdd_accroissement"). Le matching
 * (src/services/legalWatch/matching.ts) résout ces clés vers les valeurs
 * réelles de Contract.contractType via CONTRACT_TYPE_PATTERNS.
 */
import "dotenv/config";
import { prisma } from "./singletonPrisma.js";

const DOMAIN_CDD = "droit_travail_contrats_precaires";

type ConceptSeed = {
  concept: string;
  label: string;
  legalDomain: string;
  keywords: string[];
  contractTypes: string[];
  title?: string;
};

const CONCEPTS: ConceptSeed[] = [
  {
    concept: "motif_recours_cdd",
    label: "Motif de recours au CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "motif de recours",
      "cas de recours",
      "contrat à durée déterminée",
      "article L1242-2",
      "L. 1242-2",
      "recours au CDD",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "accroissement_temporaire_activite",
    label: "Accroissement temporaire d'activité",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "accroissement temporaire d'activité",
      "surcroît d'activité",
      "surcroît temporaire",
      "activité normale et permanente de l'entreprise",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "requalification_cdi",
    label: "Requalification en CDI",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "requalification en contrat à durée indéterminée",
      "requalification du CDD",
      "requalification en CDI",
      "article L1245-1",
      "L. 1245-1",
      "action en requalification",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "duree_maximale_renouvellement",
    label: "Durée maximale et renouvellement du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "durée maximale du contrat à durée déterminée",
      "renouvellement du CDD",
      "dix-huit mois",
      "18 mois",
      "article L1242-8",
      "L. 1242-8",
      "avenant de renouvellement",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "delai_de_carence",
    label: "Délai de carence",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "délai de carence",
      "contrats successifs",
      "même poste de travail",
      "article L1244-3",
      "L. 1244-3",
      "tiers de la durée du contrat",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "mentions_obligatoires_cdd",
    label: "Mentions obligatoires du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "mentions obligatoires",
      "définition précise de son motif",
      "contrat écrit",
      "article L1242-12",
      "L. 1242-12",
      "défaut de mention",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "indemnite_precarite",
    label: "Indemnité de précarité",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "indemnité de fin de contrat",
      "indemnité de précarité",
      "10 % de la rémunération",
      "article L1243-8",
      "L. 1243-8",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "rupture_anticipee_cdd",
    label: "Rupture anticipée du CDD",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "rupture anticipée du contrat à durée déterminée",
      "rupture anticipée du CDD",
      "faute grave",
      "force majeure",
      "article L1243-1",
      "L. 1243-1",
      "article L1243-4",
      "dommages et intérêts d'un montant au moins égal",
    ],
    contractTypes: ["cdd_accroissement"],
  },
  {
    concept: "transmission_tardive_contrat",
    label: "Transmission tardive du contrat",
    legalDomain: DOMAIN_CDD,
    keywords: [
      "transmission du contrat",
      "deux jours ouvrables",
      "transmission tardive",
      "article L1242-13",
      "L. 1242-13",
      "signature du contrat de travail",
    ],
    contractTypes: ["cdd_accroissement"],
  },
];

const CONVENTIONS: ConceptSeed[]= [
  {
    concept: "conv_syntec",
    label: "Syntec / Bureaux d'études",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "syntec",
      "bureaux d'études",
      "ingénieurs conseils",
      "sociétés de conseils",
      "KALICONT000005635173",
      "convention collective syntec",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des bureaux d’études techniques, cabinets d’ingénieurs-conseils et sociétés de conseils",
  },
  {
    concept: "conv_metallurgie",
    label: "Métallurgie",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "métallurgie",
      "industrie métallurgique",
      "KALICONT000046993250",
      "convention collective métallurgie",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale de la métallurgie du 7 février 2022",
  },
  {
    concept: "conv_hcr",
    label: "Hôtels, cafés, restaurants (HCR)",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "hcr",
      "hôtels",
      "cafés",
      "restaurants",
      "restauration",
      "hôtellerie",
      "KALICONT000005635534",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des hôtels, cafés et restaurants",
  },
  {
    concept: "conv_commerce_alimentaire",
    label: "Commerce à prédominance alimentaire",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "commerce alimentaire",
      "grande distribution",
      "supermarché",
      "hypermarché",
      "commerce de détail alimentaire",
      "KALICONT000005635085",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale du commerce de détail et de gros à prédominance alimentaire",
  },
  {
    concept: "conv_commerce_gros",
    label: "Commerce de gros",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "commerce de gros",
      "negoce",
      "grossiste",
      "KALICONT000005635373",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale du commerce de gros",
  },
  {
    concept: "conv_transports_routiers",
    label: "Transports routiers",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "transports routiers",
      "transport routier",
      "chauffeur routier",
      "logistique",
      "activités auxiliaires du transport",
      "KALICONT000005635624",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des transports routiers et activités auxiliaires du transport",
  },
  {
    concept: "conv_batiment_ouvriers_moins_10",
    label: "Bâtiment ouvriers (-10 salariés)",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "bâtiment ouvriers",
      "btp",
      "moins de 10 salariés",
      "artisanat bâtiment",
      "KALICONT000005635221",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale du bâtiment – ouvriers (entreprises occupant jusqu’à 10 salariés)",
  },
  {
    concept: "conv_batiment_ouvriers_plus_10",
    label: "Bâtiment ouvriers (+10 salariés)",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "bâtiment ouvriers",
      "btp",
      "plus de 10 salariés",
      "entreprise du bâtiment",
      "KALICONT000005635220",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale du bâtiment – ouvriers (entreprises occupant plus de 10 salariés)",
  },
  {
    concept: "conv_aide_domicile",
    label: "Aide et soins à domicile",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "aide à domicile",
      "soins à domicile",
      "accompagnement à domicile",
      "services à domicile",
      "KALICONT000025805800",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale de l’aide, de l’accompagnement, des soins et des services à domicile",
  },
  {
    concept: "conv_medico_social",
    label: "Établissements médico-sociaux",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "médico-social",
      "établissement médico-social",
      "secteurs sanitaires et sociaux",
      "uisss",
      "KALICONT000026950865",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective relative aux établissements médico-sociaux de l’union intersyndicale des secteurs sanitaires et sociaux",
  },
  {
    concept: "conv_particuliers_employeurs",
    label: "Particuliers employeurs et emploi à domicile",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "particuliers employeurs",
      "emploi à domicile",
      "salarié du particulier employeur",
      "assistante maternelle",
      "KALICONT000044594539",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des particuliers employeurs et de l’emploi à domicile",
  },
  {
    concept: "conv_immobilier",
    label: "Immobilier",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "immobilier",
      "agence immobilière",
      "gestion immobilière",
      "copropriété",
      "KALICONT000005635413",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale de l’immobilier",
  },
  {
    concept: "conv_coiffure",
    label: "Coiffure",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "coiffure",
      "salon de coiffure",
      "professions connexes coiffure",
      "KALICONT000018563755",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale de la coiffure et des professions connexes",
  },
  {
    concept: "conv_chimie",
    label: "Industries chimiques",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "chimie",
      "industries chimiques",
      "secteur chimique",
      "KALICONT000005635613",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des industries chimiques et connexes",
  },
  {
    concept: "conv_dechet",
    label: "Activités du déchet",
    legalDomain: "DOMAIN_CONVENTION_COLLECTIVE",
    keywords: [
      "déchet",
      "activités du déchet",
      "gestion des déchets",
      "recyclage",
      "propreté urbaine",
      "KALICONT000005635782",
    ],
    contractTypes: ["convention_collective"],
    title: "Convention collective nationale des activités du déchet",
  },
];

async function main() {
  // Sources (l'ingestion met à jour lastRunAt à chaque run). Judilibre active
  // par défaut ; Légifrance présente mais désactivée — l'utilisateur l'active
  // depuis l'onglet Paramètres. `update` ne force PAS isActive (respecte le
  // choix de l'utilisateur sur un reseed).
  const judilibre = await prisma.legalWatchSource.upsert({
    where: { name: "judilibre" },
    update: {},
    create: { name: "judilibre", isActive: true },
  });
  const legifrance = await prisma.legalWatchSource.upsert({
    where: { name: "legifrance" },
    update: {},
    create: { name: "legifrance", isActive: false },
  });
  const conventionCollective = await prisma.legalWatchSource.upsert({
    where: {name: "convention_collective"},
    update: {},
    create: {name: "convention_collective", isActive: true},
  })
  console.log(`✔ Sources : ${judilibre.name} (active), ${legifrance.name}, ${conventionCollective.name} (désactivée par défaut)`);

  for (const c of CONCEPTS) {
    await prisma.legalConceptMapping.upsert({
      where: { concept: c.concept },
      update: {
        label: c.label,
        legalDomain: c.legalDomain,
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
      create: {
        concept: c.concept,
        label: c.label,
        legalDomain: c.legalDomain,
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
    });
  }

  for (const c of CONVENTIONS) {
    await prisma.legalConceptMapping.upsert({
      where: { concept: c.concept},
      update: {
        label: c.label,
        legalDomain: "convention_collective",
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
      create: {
        concept: c.concept,
        label: c.label,
        legalDomain: "convention_collective",
        keywords: c.keywords,
        contractTypes: c.contractTypes,
      },
    });
  }
  const total = await prisma.legalConceptMapping.count();
  console.log(`✔ ${CONCEPTS.length} concepts CDD upsertés (${total} au total en base).`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
