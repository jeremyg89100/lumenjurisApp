import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Page d'atterrissage après un paiement annulé ou échoué sur Stripe Checkout.
 * (URL d'annulation configurée côté backend dans `createCheckout`.)
 *
 * Aucun débit n'a eu lieu : l'utilisateur peut simplement réessayer.
 */
export function SubscriptionFailed() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="text-xl font-bold text-ink">Paiement non abouti</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Votre paiement a été annulé ou n'a pas pu aboutir. Aucun montant n'a
          été débité — vous pouvez réessayer à tout moment.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            className="w-full bg-lumenjuris text-white hover:bg-lumenjuris/90"
            onClick={() => navigate("/souscription")}
          >
            Revenir aux offres
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}
