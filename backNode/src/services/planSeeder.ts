import { Json } from "twilio/lib/interfaces.js";
import { prisma } from "../../prisma/singletonPrisma.js";






type PlanSeed = {
  name: string;
  price: number;
  interval: string;
  creditIncluded: object;
  stripeProductId: string;
  stripePriceId : string;
};

const PLANS_SEED: PlanSeed[] = [
  {
    name: "Freemium",
    price: 0,
    interval: "month",
    creditIncluded: {
      "analyzer": "3 analyses de contrat par IA / mois",
      "generationContract": "illimité",
      "exportContract": "Avec filigrane",
      "signatureElectronique": "Signature électronique simple illimitée",
      "negociation": "Négociation collaborative incluse",
      "veilleJuridique": true,
      "contratheque": "Contrathèque : 5 contrats suivis"
    },
    stripeProductId: "",
    stripePriceId: "",
  },
  {
    name: "Starter_mensuel",
    price: 49_00,
    interval: "month",
    creditIncluded: {
      "generationContract": "illimité",
      "exportContract": "sans filigrane",
      "analyzer": "30 analyses de contrat par IA / mois",
      "suivisDesEcheances": "Suivi des échéances illimité + alertes (préavis, loi Chatel)",
      "dashboard": "Tableau de bord des renouvellements",

      "signatureElectronique": "Signature électronique simple illimitée",
      "negociation": "Négociation collaborative incluse",
      "veilleJuridique": true,
      "contratheque": "Contrathèque : 5 contrats suivis",
    },
    stripeProductId: "prod_Uzwv74n813QFUj",
    stripePriceId: "price_1Tzx1pHjiTZrRhmvwc77AaOP",
  },
  {
    name: "Starter_annuel",
    price: 468_00,
    interval: "year",
    creditIncluded: {
      "generationContract": "illimité",
      "exportContract": "sans filigrane",
      "analyzer": "30 analyses de contrat par IA / mois",
      "suivisDesEcheances": "Suivi des échéances illimité + alertes (préavis, loi Chatel)",
      "dashboard": "Tableau de bord des renouvellements",

      "signatureElectronique": "Signature électronique simple illimitée",
      "negociation": "Négociation collaborative incluse",
      "veilleJuridique": true,
      "contratheque": "Contrathèque : 5 contrats suivis",
    },
    stripeProductId: "prod_UzwvInSRbmCi3q",
    stripePriceId: "price_1Tzx1QHjiTZrRhmvhBjNoTWP",
  },
  {
    name: "Pro_mensuel",
    price: 119_00,
    interval: "month",
    creditIncluded: {
      "analyzer": "Analyses de contrat par IA illimitées",
      "jurisprudence": "Jurisprudence reliée aux clauses analysées",
      "tool": "Workflows d'approbation interne",
      "signatureElectronique": "10 signatures avancées eIDAS / mois (via DocuSign)",
      "integration": "Integration standard"
    },
    stripeProductId: "prod_Uzwy9wCTYQtRfr",
    stripePriceId: "price_1Tzx4LHjiTZrRhmvGvNeGbJj",
  },
  {
    name: "Pro_annuel",
    price: 1_188_00,
    interval: "year",
    creditIncluded: {
      "analyzer": "Analyses de contrat par IA illimitées",
      "jurisprudence": "Jurisprudence reliée aux clauses analysées",
      "tool": "Workflows d'approbation interne",
      "signatureElectronique": "10 signatures avancées eIDAS / mois (via DocuSign)",
      "integration": "Integration standard"
    },
    stripeProductId: "prod_UzwyQfcdBdU0w2",
    stripePriceId: "price_1Tzx4uHjiTZrRhmv24NjwbKr",
  },
];

export async function seedPlans(): Promise<void> {

  for (const plan of PLANS_SEED) {
    const exists = await prisma.plan.findFirst({
      where: { name: plan.name, interval: plan.interval },
    });

    if (!exists) {
      await prisma.plan.create({ data: plan });
    }
  }

  console.log("Plans ready.");
}
