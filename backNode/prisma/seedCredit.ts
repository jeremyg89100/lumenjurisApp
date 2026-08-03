import { prisma } from "./singletonPrisma.js";
import { Prisma } from "@prisma/client";
/**
 * Création de tout les plans d'abonnement dans la base de données
 * 
 * Comprend actuellement : 
 * -Freemium
 * -Betatesteur
 * -Starter monthly
 * -Starter yearly
 * -Pro monthly
 * -Pro yearly
 */


type Interval = "yearly" | "monthly"

type Quota = { unlimited: true } | { unlimited: false, value: number }
type MeteredFeature = { enabled: false } | { enabled: true, limit: number }
type Feature = { enabled: true } | { enabled: false }


interface CreditPlan {

    //Necessaire pour freemium
    analyzer: Quota;
    signatureEnhanced: MeteredFeature;
    generationContractWithFiligrane: Feature;
    contrathequeLimit: Quota;

    //necessaire pour starter
    suivisEcheance: Feature;
    dashboardRenouvellements: Feature;

    //necessaire pour pro
    veilleReviewContract: Feature;
    internalWorkflowValidator: Feature;

}

type PlanSeed = {
    name: string;
    price: number;
    interval: Interval;
    creditsIncluded: CreditPlan;
    stripeProductId: string;
    stripePriceId: string;
};

const PLANS_SEED = [
    //FREEMIUM
    {
        name: "Freemium",
        price: 0,
        interval: "monthly",
        creditsIncluded: {
            analyzer: {
                unlimited: false,
                value: 3
            },
            signatureEnhanced: { enabled: false },
            generationContractWithFiligrane: { enabled: true },

            contrathequeLimit: {
                unlimited: false,
                value: 5
            },
            suivisEcheance: { enabled: false },
            dashboardRenouvellements: { enabled: false },

            veilleReviewContract: { enabled: false },
            internalWorkflowValidator: { enabled: false },
        },
        stripeProductId: "",
        stripePriceId: "",
    },

    //BETA Gratuit, offre pour les beta testeur accès illimité
    {
        name: "Betatesteur",
        price: 0,
        interval: "monthly",
        creditsIncluded: {
            analyzer: { unlimited: true },
            signatureEnhanced: { enabled: true, limit: 30 },
            generationContractWithFiligrane: { enabled: true },
            contrathequeLimit: { unlimited: true },
            suivisEcheance: { enabled: true },
            dashboardRenouvellements: { enabled: true },

            veilleReviewContract: { enabled: true },
            internalWorkflowValidator: { enabled: true },
        },
        stripeProductId: "",
        stripePriceId: "",
    },

    //STARTER mois:49€ | année:468€(39€/mois)
    {
        name: "Starter_mensuel",
        price: 49_00,
        interval: "monthly",
        creditsIncluded: {
            analyzer: {
                unlimited: false,
                value: 30
            },
            signatureEnhanced: { enabled: false },
            generationContractWithFiligrane: { enabled: false },

            contrathequeLimit: {
                unlimited: true,
            },
            suivisEcheance: { enabled: true },
            dashboardRenouvellements: { enabled: true },

            veilleReviewContract: { enabled: false },
            internalWorkflowValidator: { enabled: false },
        },
        stripeProductId: "prod_Uzwv74n813QFUj",
        stripePriceId: "price_1Tzx1pHjiTZrRhmvwc77AaOP",
    },
    {
        name: "Starter_annuel",
        price: 468_00,
        interval: "yearly",
        creditsIncluded: {
            analyzer: {
                unlimited: false,
                value: 30
            },
            signatureEnhanced: { enabled: false },
            generationContractWithFiligrane: { enabled: false },

            contrathequeLimit: { unlimited: true },
            suivisEcheance: { enabled: true },
            dashboardRenouvellements: { enabled: true },

            veilleReviewContract: { enabled: false },
            internalWorkflowValidator: { enabled: false },
        },
        stripeProductId: "prod_UzwvInSRbmCi3q",
        stripePriceId: "price_1Tzx1QHjiTZrRhmvhBjNoTWP",
    },

    //PRO mois:119€ | année:1188€(99€/mois)
    {
        name: "Pro_mensuel",
        price: 119_00,
        interval: "monthly",
        creditsIncluded: {
            analyzer: { unlimited: true },
            signatureEnhanced: { enabled: true, limit: 10 },
            generationContractWithFiligrane: { enabled: false },

            contrathequeLimit: { unlimited: true },
            suivisEcheance: { enabled: true },
            dashboardRenouvellements: { enabled: true },

            veilleReviewContract: { enabled: true },
            internalWorkflowValidator: { enabled: true },
        },
        stripeProductId: "prod_Uzwy9wCTYQtRfr",
        stripePriceId: "price_1Tzx4LHjiTZrRhmvGvNeGbJj",
    },
    {
        name: "Pro_annuel",
        price: 1_188_00,
        interval: "yearly",
        creditsIncluded: {
            analyzer: { unlimited: true },
            signatureEnhanced: { enabled: true, limit: 10 },
            generationContractWithFiligrane: { enabled: false },

            contrathequeLimit: { unlimited: true },
            suivisEcheance: { enabled: true },
            dashboardRenouvellements: { enabled: true },

            veilleReviewContract: { enabled: true },
            internalWorkflowValidator: { enabled: true },
        },
        stripeProductId: "prod_UzwyQfcdBdU0w2",
        stripePriceId: "price_1Tzx4uHjiTZrRhmv24NjwbKr",
    },
] satisfies PlanSeed[];



//Integration des plans dans la bdd
export async function seedPlans(): Promise<void> {
    for (const plan of PLANS_SEED) {
        await prisma.plan.upsert({
            where: {
                name_interval: {
                    name: plan.name,
                    interval: plan.interval,
                }
            },
            create: {
                ...plan,
                creditsIncluded: plan.creditsIncluded as Prisma.InputJsonValue,
            },
            update: {
                ...plan,
                creditsIncluded: plan.creditsIncluded as Prisma.InputJsonValue
            }
        });
    }

    console.log("Plans ready.");
}