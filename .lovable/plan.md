# Refonte sombre et réparation WhatsApp

## Résultat attendu
- Rapprocher le tableau de bord et la configuration de l’agent des captures : fond graphite, panneaux compacts, vert WhatsApp, navigation horizontale et actions très lisibles sur mobile.
- Restaurer la génération du QR réel pour chaque agent, sans QR factice.

## Étapes
1. Recomposer le tableau de bord mobile autour d’une carte d’agent et d’actions « Déployer » / « Modifier ».
2. Harmoniser l’écran de configuration avec les onglets, panneaux et boutons des captures, en conservant toutes les fonctions actuelles.
3. Corriger l’appairage : appeler la fonction `whatsapp-connect-`, lire `whatsapp_connections` avec l’utilisateur connecté, écouter les changements en temps réel et afficher uniquement `qr_code`.
4. Vérifier les états attente, QR prêt, connecté, déconnecté et erreur sur mobile et ordinateur.

## Détails techniques
- La fonction WhatsApp recevra aussi l’identifiant de l’agent dans sa demande, mais la lecture restera compatible avec la table actuelle indexée par `user_id`.
- Aucun QR ne sera créé dans le navigateur ; `qrcode.react` ne fera que représenter la valeur reçue depuis la base.
- La connexion Railway résiduelle sera retirée de ce parcours.
