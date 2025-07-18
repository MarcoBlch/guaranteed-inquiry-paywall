# FASTPASS ESCROW SYSTEM - DOCUMENTATION

## Architecture Simplifiée 75/25

### Flux de Paiement
1. **Paiement** → Escrow sur compte principal (status: 'held')
2. **Message envoyé** → Timer basé sur délai choisi (24h/48h/72h)
3. **Réponse reçue** → Capture + Distribution automatique
   - 75% → Transfer vers utilisateur (si Stripe Connect configuré)
   - 25% → Reste sur compte principal (commission)
4. **Pas de réponse** → Cancel + Refund automatique

### Statuts des Transactions
- `held` → Fonds en escrow, en attente de réponse
- `released` → Réponse reçue, fonds distribués
- `pending_user_setup` → Réponse reçue mais utilisateur n'a pas configuré Stripe
- `refunded` → Timeout, fonds remboursés

### Variables d'Environnement
```bash
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Endpoints Principaux

### create-stripe-payment
Créer PaymentIntent escrow
- **Méthode**: POST
- **Auth**: Non requise
- **Corps**: `{ price, responseDeadlineHours, userId }`
- **Retour**: `{ clientSecret, paymentIntentId }`

### process-escrow-payment
Créer message + transaction après paiement
- **Méthode**: POST
- **Auth**: Requise
- **Corps**: `{ paymentIntentId, messageData }`
- **Action**: Crée message et transaction escrow

### distribute-escrow-funds
Capturer + distribuer 75/25
- **Méthode**: POST
- **Auth**: Requise
- **Corps**: `{ escrowTransactionId }`
- **Action**: Capture et distribue selon règle 75/25

### check-escrow-timeouts
Refunds automatiques (cron 15min)
- **Méthode**: POST
- **Auth**: Requise
- **Action**: Vérifie et rembourse les transactions expirées

### create-stripe-connect-account
Onboarding utilisateur
- **Méthode**: POST
- **Auth**: Requise
- **Retour**: URL d'onboarding Stripe Connect

### process-pending-transfers
Traiter fonds en attente après setup Stripe
- **Méthode**: POST
- **Auth**: Requise
- **Action**: Transfère les fonds des utilisateurs ayant configuré Stripe

## Monitoring

### Health Check
- **Endpoint**: `/functions/v1/escrow-health-check`
- **Métriques**: 
  - Statistiques 24h par statut
  - Transactions proches du timeout
  - Fonds en attente de setup utilisateur
  - Alertes automatiques

### Cron Jobs
- **GitHub Actions**: Vérification timeouts toutes les 15min
- **Monitoring**: Alertes en cas d'échec

### Base de Données

#### Table: escrow_transactions
```sql
- id (uuid, PK)
- message_id (uuid, FK)
- stripe_payment_intent_id (text)
- sender_email (text)
- recipient_user_id (uuid)
- amount (numeric)
- currency (text, default: 'EUR')
- status (text, default: 'pending')
- expires_at (timestamp)
- created_at, updated_at (timestamp)
```

#### Table: messages
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- sender_email (text)
- content (text)
- amount_paid (numeric)
- response_deadline_hours (integer)
- attachments (text[])
- notification_sent (boolean)
- read (boolean)
- created_at, updated_at (timestamp)
```

#### Table: message_responses
```sql
- id (uuid, PK)
- message_id (uuid, FK)
- escrow_transaction_id (uuid, FK)
- has_response (boolean)
- response_received_at (timestamp)
- validated_by_admin (boolean)
- admin_notes (text)
- email_thread_id (text)
```

## Configuration

### Supabase Edge Functions
```toml
[functions.create-stripe-payment]
verify_jwt = false

[functions.process-escrow-payment]
verify_jwt = true

[functions.distribute-escrow-funds]
verify_jwt = true

[functions.check-escrow-timeouts]
verify_jwt = true

[functions.create-stripe-connect-account]
verify_jwt = false

[functions.process-pending-transfers]
verify_jwt = true

[functions.escrow-health-check]
verify_jwt = false
```

### GitHub Actions Cron
```yaml
# .github/workflows/escrow-timeout-check.yml
on:
  schedule:
    - cron: '*/15 * * * *' # Toutes les 15 minutes
```

## Tests et Développement

```bash
# Développement local
npm run dev         # Dev avec hot reload
supabase start      # Base locale

# Tests
npm run test:e2e    # Tests end-to-end complets

# Monitoring
curl https://your-project.supabase.co/functions/v1/escrow-health-check
```

## Sécurité

### Row Level Security (RLS)
- ✅ Tous les tables ont RLS activé
- ✅ Utilisateurs ne voient que leurs données
- ✅ Edge functions utilisent service role pour bypasser RLS

### Stripe Connect
- ✅ Fonds sécurisés sur compte principal
- ✅ Distribution automatique via transfers
- ✅ Webhook de sécurité pour validation

### Timeouts Automatiques
- ✅ Refunds automatiques si pas de réponse
- ✅ Monitoring continu des expirations
- ✅ Alertes en cas de problème

## Support et Maintenance

### Logs
- **Edge Functions**: Supabase Dashboard → Functions → Logs
- **Database**: Supabase Dashboard → Logs → Postgres
- **Stripe**: Stripe Dashboard → Logs

### Métriques Clés
- Taux de réponse dans les délais
- Volume de transactions par jour
- Montant moyen par transaction
- Taux de refund vs release

### Alertes
- Transactions près du timeout (>10)
- Fonds en attente setup (>10k€)
- Échecs de cron jobs
- Erreurs Stripe critiques

---

# Original Lovable Project Documentation

## Project info

**URL**: https://lovable.dev/projects/9ca0c91a-0d19-470f-ab55-f656a46ff9d6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9ca0c91a-0d19-470f-ab55-f656a46ff9d6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9ca0c91a-0d19-470f-ab55-f656a46ff9d6) and click on Share → Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)