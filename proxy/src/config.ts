import dotenv from "dotenv";
import path from "path";

// Charge d'abord server/.env puis la racine.
// IMPORTANT : ce chargement vit ici (et non dans index.ts) pour qu'il s'exécute
// AVANT la lecture des variables ci-dessous. En ESM, un module importé est
// évalué avant le corps de celui qui l'importe : comme tous les modules du proxy
// importent `config`, dotenv est donc toujours chargé en premier.
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config();

export const IS_PROD = process.env.NODE_ENV === "production";
export const PORT = Number(process.env.PORT || 3000);
export const BACKEND_URL = IS_PROD
  ? process.env.BACKEND_URL
  : "http://127.0.0.1:5678";
export const BACKNODE_URL = IS_PROD
  ? process.env.BACKNODE_URL
  : "http://127.0.0.1:3020";
