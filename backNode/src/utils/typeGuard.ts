import { PlanName } from "@prisma/client"


//Valide le typage de l'enum PlanName de prisma
export const isPlanName = (value: unknown): value is PlanName => {
    return Object.values(PlanName).includes(value as PlanName)
}