import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Page d'atterrissage après un paiement réussi sur Stripe Checkout.
 * l'URL de succès est configurée côté backend dans `createCheckout`.
 *
 * Important ! : c'est le webhook Stripe qui active réellement l'abonnement et
 * réinitialise les quotas — de façon asynchrone. Cette page ne fait donc que
 * confirmer le paiement et inviter l'utilisateur à continuer ; 
 * L'activation peut prendre quelques secondes à se refléter dans son compte.
 */
export function SubscriptionSuccess() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>

        <h1 className="text-xl font-bold text-ink">Paiement confirmé !</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Merci pour votre confiance. Votre abonnement est en cours d'activation
          — cela peut prendre quelques secondes. Vous recevrez votre facture par
          email.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            className="w-full bg-lumenjuris text-white hover:bg-lumenjuris/90"
            onClick={() => navigate("/dashboard")}
          >
            Aller sur mon tableau de bord
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/mon-compte")}
          >
            Voir mon abonnement
          </Button>
        </div>
      </div>
    </div>
  );
}
