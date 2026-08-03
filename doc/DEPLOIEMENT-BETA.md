# Mettre en ligne beta.lumenjuris.com

Note écrite en langage courant. Elle décrit ce qui est réellement en place
sur l'hébergement o2switch au 3 août 2026.

## Ce qu'il faut savoir avant tout

L'application est faite de **trois morceaux séparés**, chacun dans son dossier
sur le serveur :

| Morceau | Ce que c'est | Adresse publique | Dossier sur le serveur |
|---|---|---|---|
| Interface | Ce que voient les clients | `beta.lumenjuris.com` | `~/lumenjurisFront` |
| Relais | Fait le lien interface / moteur | `proxy.lumenjuris.com` | `~/lumenjurisproxy.lumenjuris.com` |
| Moteur | Comptes, contrats, e-mails | `lumenjurisbackendnodejs.lumenjuris.com` | `~/lumenjurisbackendnodejs.lumenjuris.com` |

**Il n'y a aucun dépôt Git sur le serveur.** Les fichiers y sont déposés à la
main. Un `git push` ne met donc rien en ligne : GitHub sert d'archive du code
source, pas de mécanisme de déploiement.

Les fichiers réellement déployés sont des fichiers *construits* (compilés), et
ils ne sont volontairement pas dans Git. Il faut donc toujours construire avant
d'envoyer.

Connexion au serveur :

    ssh -i ~/.ssh/codex_o2switch dxin1098@dxin1098.odns.fr

## Piège à connaître (déjà rencontré le 3 août 2026)

Le fichier `app.js` est le fichier de **démarrage** lu par le serveur. Le
projet est en modules ES : si `app.ts` contient `require(...)`, le fichier
compilé mélange deux écritures incompatibles et **le moteur refuse de
démarrer** (erreur « Web application could not be started »).

`backNode/app.ts` et `proxy/app.ts` doivent donc commencer par :

    import dotenv from "dotenv";
    dotenv.config();

et jamais par `require('dotenv').config();`.

## Procédure

### 1. Construire les trois morceaux

    cd front     && npm run build      # produit front/dist
    cd proxy     && npm run build      # produit proxy/dist
    cd backNode  && npm run build      # produit backNode/dist

Si la construction du moteur échoue en se plaignant de tables inconnues
(`ContractSummary` par exemple), régénérer le traducteur de base de données —
cette commande ne touche aucune base :

    cd backNode && npx prisma generate

### 2. Vérifier l'interface avant d'envoyer

L'interface embarque l'adresse du relais **au moment de la construction**. Le
fichier `front/.env` pointe vers `localhost` pour le travail en local ; c'est
`front/.env.production` qui donne la bonne adresse pour la mise en ligne :

    VITE_URL_PROXY=https://proxy.lumenjuris.com

Contrôle obligatoire avant tout envoi — on doit voir l'adresse du relais et
aucun `localhost` :

    grep -ohE "https://[a-zA-Z0-9.-]*lumenjuris[a-zA-Z0-9.-]*" front/dist/assets/*.js | sort -u
    grep -l "localhost:3000" front/dist/assets/*.js   # ne doit rien retourner

### 3. Sauvegarder l'existant

Sur le serveur, avant de remplacer quoi que ce soit :

    STAMP=$(date +%Y-%m-%d-%H%M)
    DEST=~/sauvegardes-deploiement/$STAMP
    mkdir -p $DEST/front $DEST/proxy $DEST/backnode
    cp -a ~/lumenjurisFront/index.html ~/lumenjurisFront/assets ~/lumenjurisFront/favicon.svg $DEST/front/
    cp -a ~/lumenjurisproxy.lumenjuris.com/{index.js,app.js,src} $DEST/proxy/
    cp -a ~/lumenjurisbackendnodejs.lumenjuris.com/{index.js,app.js,prisma.config.js,src,billing,ressources} $DEST/backnode/

### 4. Envoyer

Depuis le dossier `lumenjuris` sur le poste de travail :

    SSHC="ssh -i ~/.ssh/codex_o2switch dxin1098@dxin1098.odns.fr"
    $SSHC 'mv ~/lumenjurisFront/assets ~/lumenjurisFront/assets.ancien'
    tar -czf - -C front/dist    . | $SSHC 'tar -xzf - -C ~/lumenjurisFront'
    tar -czf - -C proxy/dist    . | $SSHC 'tar -xzf - -C ~/lumenjurisproxy.lumenjuris.com'
    tar -czf - -C backNode/dist . | $SSHC 'tar -xzf - -C ~/lumenjurisbackendnodejs.lumenjuris.com'

À ne jamais supprimer sur le serveur : `node_modules`, `.env`, `contracts`,
`userassets`, `logs`, `word-addin`, `cgi-bin`, et le dossier `prisma/migrations`.

### 5. Redémarrer

L'interface est statique : rien à faire. Les deux applications Node doivent
être redémarrées, sinon le serveur continue de faire tourner l'ancienne
version en mémoire :

    $SSHC 'touch ~/lumenjurisproxy.lumenjuris.com/tmp/restart.txt ~/lumenjurisbackendnodejs.lumenjuris.com/tmp/restart.txt'

### 6. Vérifier

    curl -s -o /dev/null -w "%{http_code}\n" https://beta.lumenjuris.com                       # 200
    curl -s -o /dev/null -w "%{http_code}\n" https://proxy.lumenjuris.com/health               # 200
    curl -s -o /dev/null -w "%{http_code}\n" https://lumenjurisbackendnodejs.lumenjuris.com/health  # 200

    # inscription : refus propre attendu, surtout pas 500
    curl -s -o /dev/null -w "%{http_code}\n" -X POST https://proxy.lumenjuris.com/api/user/signup \
      -H "Content-Type: application/json" -d '{}'                                              # 400

    # connexion avec de mauvais identifiants : 401 attendu, surtout pas 500
    curl -s -o /dev/null -w "%{http_code}\n" -X POST https://proxy.lumenjuris.com/api/user/auth/login \
      -H "Content-Type: application/json" -d '{"email":"x@example.invalid","password":"faux"}'  # 401

Un `404` sur une adresse inventée ne veut rien dire : n'utiliser que les
adresses ci-dessus, qui sont celles réellement appelées par l'interface.

## Revenir en arrière

En une commande, à partir d'une sauvegarde de l'étape 3 (remplacer la date) :

    ssh -i ~/.ssh/codex_o2switch dxin1098@dxin1098.odns.fr \
      'S=~/sauvegardes-deploiement/2026-08-03-avant-deploiement; \
       rm -rf ~/lumenjurisFront/assets && \
       cp -a $S/front/.    ~/lumenjurisFront/ && \
       cp -a $S/proxy/.    ~/lumenjurisproxy.lumenjuris.com/ && \
       cp -a $S/backnode/. ~/lumenjurisbackendnodejs.lumenjuris.com/ && \
       touch ~/lumenjurisproxy.lumenjuris.com/tmp/restart.txt \
             ~/lumenjurisbackendnodejs.lumenjuris.com/tmp/restart.txt && \
       echo RETOUR_ARRIERE_TERMINE'

Filet de sécurité supplémentaire, indépendant de tout ce qui précède :
**JetBackup 5** dans cPanel, qui sauvegarde le compte entier.

## Reste à faire

La configuration e-mail du serveur (`~/lumenjurisbackendnodejs.lumenjuris.com/.env`)
contient probablement encore une adresse Gmail, alors que le serveur d'envoi
est `mail.lumenjuris.com`. Tant que ce n'est pas corrigé, aucun e-mail ne part,
quel que soit le code déployé.
