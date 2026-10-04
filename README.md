# Chatplay AI Studio

Agis en tant qu'expert développeur Full Stack React et Tailwind CSS. Crée l'application SaaS complète d'automatisation WhatsApp qui s'appelle Chatplay propulsée par l'IA (au design sombre, haut de gamme, épuré, avec des touches de bleu néon inspirées de Wazzap.ai).



ARCHITECTURE TECHNIQUE & CONNEXIONS :

- N'utilise PAS l'intégration Supabase native de Lovable. Utilise ma propre base de données Supabase externe via les variables d'environnement (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).

- Configure les requêtes API pour communiquer avec mon backend hébergé sur Railway (VITE_BACKEND_URL).



LES 4 ÉCRANS ET MODULES À GÉNÉRER :



1. Page d'Accueil (Landing Page) :

- En-tête avec logo et bouton "Lancer l'essai".

- Section hero percutante sur l'automatisation WhatsApp 24h/24 par l'IA.

- Arguments de réassurance (anti-spam, voix ElevenLabs, essai exclusif).



2. Tunnel d'Onboarding Interactif (Multi-étapes de 1/7 à 7/7) :

- Barre de progression dynamique.

- Étape de calibrage du volume de messages reçus par jour (Moins de 10, 10-50, 50-200, Plus de 200).

- Étape conversationnelle simulant l'assistant virtuel qui résume le profil de l'utilisateur.

- Étape des raccourcis rapides avec des boutons cliquables pré-remplis ("Mes tarifs", "Mes disponibilités", "Livraison").



3. Page de Paiement, Paywall et Rétention (SwyChr) :

- Mise en avant de l'offre d'essai exclusive : 3 jours pour seulement 5 $ (avec le tarif normal mensuel barré).

- Bouton de validation relié au flux de paiement de la passerelle SwyChr (Mobile Money et cartes).

- Réassurance avec notes et témoignages clients (4.8/5).

- Module Anti-Churn (Pop-up de sortie qui s'active si l'utilisateur tente de quitter la page de paiement pour le dissuader d'abandonner son essai à 5 $).



4. Tableau de Bord (Dashboard) & Studio :

- Message d'accueil personnalisé ("Content de vous revoir").

- Compteur d'agents et statuts (en ligne / brouillon).

- Studio de création d'agent : configuration des instructions et activation des notes vocales ElevenLabs.

- Interface d'appairage WhatsApp par QR code (reliée à Railway) et panneau de configuration anti-spam.



Le code doit être entièrement fonctionnel, modulaire, propre et responsive (mobile-first).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/504fb548-87e2-4a1a-9f97-ee9ae386730f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
