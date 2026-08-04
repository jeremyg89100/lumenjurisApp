
***Notice d'information sur tout le client Stripe***


# Stripe événement

## Webhook
Stripe va jouer avec un webhook que l'on rends accessible dans l'endpoint "...domaine/billing/stripe/webhook";

Ce controller vas valider le http puis renvoyer l'evenement de Stripe dans le service.

---

## Clef webhook pour teste en dev
1. **Installer le client stripe CLI**
```windows
winget install Stripe.StripeCLI
stripe version
```

2. **S'authentifier auprès de son compte stripe**
```windows
stripe login
```
Renseigner les champs de connexion

3. **Lancer le serveur local**
```windows
stripe listen -f localhost:3020/billing/stripe/webhook
```
La clef webhook va s'afficher dans le terminal : whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Copier coller dans le .env  STRIPE_WEBHOOK_SECRET_TEST="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

4. **Déclancher des événements**
```windows
stripe trigger checkout.session.completed
```
-> Paiement terminé = stripe trigger checkout.session.completed
-> Paiement réussi = stripe stripe trigger invoice.payment_succeeded
-> Paiement échoué = stripe trigger invoice.payment_failed
-> Suppression abonnement = stripe trigger customer.subscription.deleted
-> Création abonnement = stripe trigger customer.subscription.created
-> Modification abonnement = stripe trigger customer.subscription.updated


## Service
Le fichier du service stripe est situé à  "backNode/billing/stripe.service.ts".
Ce service va utiliser une switch case pour transferer les événements aux bonnes methodes du service.


## Liste des events
1. checkout.session.completed
- Quand? : Premier achat terminé
- Action métier : Activer le plan + enregistrer les IDs Stripe
- Point d'attention : 
Il ne faut pas remettre les crédits ici si tu les remets aussi dans invoice.payment_succeeded, sinon le premier achat sera crédité deux fois.

récupérer le userId dans les metadata
enregistrer :
customerId
subscriptionId
affecter le plan acheté

Puis laisser : invoice.payment_succeeded gérer toute la logique de crédits.

2. invoice.payment_succeeded
- Quand? : Chaque facture payée (premier paiement + renouvellements)
- Action métier : Créditer les quotas mensuels/annuels

3. customer.subscription.created
- Quand : Création de l'abonnement
- Action métier : Synchroniser les données Stripe (statut, période...)

4. customer.subscription.updated
- Quand : Changement de plan, annulation différée...
- Action métier : Mettre à jour le plan local

5. customer.subscription.deleted
- Quand : Abonnement terminé
- Action métier : Repasser en Freemium

6. invoice.payment_failed
- Quand : Paiement refusé
- Action métier : Prévenir l'utilisateur, attendre Stripe avant de rétrograder(Stripe procede a d'autres tentatives les jours d'après en cas d'echec)

## Tester les events avec la clefs de teste
Une fois que vous avez installer le webhook secret teste avec les CLI, on peut demarrer l'application et lancer des achat
directement depuis l'app, le webhook sera automatiquement relayer depuis le teste.



## Tester les resultats de carte
Paiement Réussis : 4242 4242 4242 4242
Carte Refusée : 4000 0000 0000 0002
Fonds Insuffisants : 4000 0000 0000 9995
Carte Volée : 4000 0000 0000 9979
Carte Perdu : 4000 0000 0000 9987
Authentification 3D Secure réussie : 4000 0025 0000 3155
Authentification 3D Secure échouée: 4000 0084 0000 1629
Paiement nécessitant une action : 4000 0027 6000 3184 (Permet de tester le cas où le paiement est en attente d'une action supplémentaire.)