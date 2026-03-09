# 🎛️ ZINA Cantine BAD - Admin Dashboard Documentation

## 🎉 Vue d'Ensemble

Interface d'administration complète pour gérer le site web ZINA Cantine BAD, incluant les menus, catégories, commandes, utilisateurs et paramètres.

---

## 🔐 Authentification

### Identifiants par Défaut
```
Identifiant: admin
Mot de passe: admin123
```

⚠️ **Important**: Changez ces identifiants en production !

### Page de Connexion
- URL: `http://localhost:5000/admin`
- Interface sécurisée avec session
- Déconnexion avec confirmation

---

## 📊 Tableau de Bord

### Statistiques en Temps Réel
- 📦 **Menus Totaux**: Nombre total de plats dans le menu
- 🛒 **Commandes du Jour**: Commandes reçues aujourd'hui
- 👥 **Utilisateurs**: Nombre d'utilisateurs inscrits
- 💰 **Revenu du Jour**: Total des ventes (FCFA)

### Widgets
1. **Commandes Récentes**
   - Liste des 10 dernières commandes
   - Statut avec code couleur
   - Lien vers la gestion des commandes

2. **Plats Populaires**
   - Top 5 des plats les plus commandés
   - Nombre de commandes par plat
   - Accès rapide pour modifier

---

## 🍔 Gestion des Menus

### Fonctionnalités
- ✅ **Ajouter** un nouveau plat
- ✅ **Modifier** un plat existant
- ✅ **Supprimer** un plat
- ✅ **Filtrer** par catégorie
- ✅ **Rechercher** un plat
- ✅ **Changer** la disponibilité

### Formulaire d'Ajout/Modification

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| Nom du Plat | Texte | ✓ | Nom du plat |
| Catégorie | Select | ✓ | Catégorie du plat |
| Prix (FCFA) | Nombre | ✓ | Prix en Francs CFA |
| Temps de Préparation | Nombre | | Durée en minutes |
| Description | Texte | | Description détaillée |
| Emoji / Image | Texte | | Emoji ou URL image |
| Statut | Select | | Disponible/Indisponible |
| Plat Populaire | Checkbox | | Mettre en avant |

### Catégories Disponibles
1. ☕ **Petit-Déjeuner**
2. 🍔 **Plats Complets**
3. 🍪 **Snacks**
4. 🥗 **Salades**
5. 🥤 **Boissons**
6. 🍨 **Desserts**
7. ⭐ **Spécialités**

### Actions par Plat
- ✏️ **Modifier** (bouton bleu)
- 🗑️ **Supprimer** (bouton rouge)

---

## 🏷️ Gestion des Catégories

### Fonctionnalités
- ✅ **Ajouter** une catégorie
- ✅ **Modifier** une catégorie
- ✅ **Supprimer** une catégorie
- ✅ **Voir** le nombre de plats par catégorie

### Formulaire de Catégorie

| Champ | Type | Description |
|-------|------|-------------|
| Nom | Texte | Nom de la catégorie |
| Description | Texte | Description optionnelle |
| Icône (Emoji) | Texte | Emoji représentatif |
| Couleur | Color Picker | Couleur associée |

---

## 📋 Gestion des Commandes

### Statuts de Commande
- 🔵 **En attente** (pending) - Commande reçue, non traitée
- 🟡 **En cours** (processing) - En préparation
- 🟢 **Complété** (completed) - Commande terminée
- 🔴 **Annulé** (cancelled) - Commande annulée

### Filtres Disponibles
- Toutes les commandes
- En attente
- En cours
- Complétées
- Annulées

### Détails d'une Commande
- Numéro de commande
- Nom du client
- Nombre d'articles
- Total (FCFA)
- Mode de paiement
- Statut actuel
- Heure de commande

### Actions
- 👁️ **Voir les détails**
- ✏️ **Mettre à jour le statut**

---

## 👥 Gestion des Utilisateurs

### Informations Affichées
- Matricule employé
- Nom complet
- Département
- Nombre de commandes
- Date d'inscription

### Filtres
- Recherche par nom
- Recherche par matricule
- Filtrage par département

### Actions
- 👁️ **Voir le profil**
- 📊 **Voir l'historique des commandes**

---

## ⚙️ Paramètres du Site

### 1. Informations Générales
- Nom de l'entreprise
- Email de contact
- Téléphone
- Adresse complète

### 2. Horaires d'Ouverture
- Lundi - Vendredi
- Samedi
- Dimanche

### 3. Frais de Service
- Frais de service (FCFA)
- TVA (%)

### 4. Modes de Paiement
Activer/Désactiver:
- ✅ Espèces
- ✅ Carte Bancaire
- ✅ Orange Money
- ✅ MTN Mobile Money

---

## 🎨 Interface Utilisateur

### Sidebar (Gauche)
```
┌─────────────────────┐
│   🍴 ZINA Admin    │
├─────────────────────┤
│ 📊 Tableau de Bord │
│ 🍔 Menu / Plats    │
│ 🏷️ Catégories      │
│ 📋 Commandes       │
│ 👥 Utilisateurs    │
│ ⚙️ Paramètres      │
├─────────────────────┤
│ [Déconnexion]      │
└─────────────────────┘
```

### Header (Haut)
- Titre de la section
- Notifications (cloche avec compteur)
- Profil administrateur
- Bouton déconnexion

### Responsive
- **Desktop**: Sidebar fixe, contenu à droite
- **Tablette**: Sidebar rétractable
- **Mobile**: Menu hamburger

---

## 🔌 API Endpoints

### Menus
```javascript
// Récupérer tous les menus
GET /api/admin/menus

// Créer un menu
POST /api/admin/menus
Body: {
    "name": "Nouveau Plat",
    "category": "lunch",
    "price": 5000,
    "description": "Description",
    "available": true,
    "popular": true
}

// Modifier un menu
PUT /api/admin/menus/:id
Body: { /* champs à modifier */ }

// Supprimer un menu
DELETE /api/admin/menus/:id
```

### Catégories
```javascript
// Récupérer les catégories
GET /api/admin/categories

// Créer une catégorie
POST /api/admin/categories

// Modifier une catégorie
PUT /api/admin/categories/:id

// Supprimer une catégorie
DELETE /api/admin/categories/:id
```

### Commandes
```javascript
// Récupérer les commandes
GET /api/admin/orders

// Mettre à jour le statut
PUT /api/admin/orders/:id/status
Body: { "status": "completed" }
```

### Paramètres
```javascript
// Récupérer les paramètres
GET /api/admin/settings

// Mettre à jour les paramètres
POST /api/admin/settings
Body: {
    "company_name": "ZINA Cantine BAD",
    "email": "contact@zina-cantine.ci",
    "service_fee": 200,
    "tax_rate": 18
}
```

---

## 🚀 Comment Utiliser

### 1. Accéder à l'Admin
```
http://localhost:5000/admin
```

### 2. Se Connecter
- Entrer l'identifiant: `admin`
- Entrer le mot de passe: `admin123`
- Cliquer sur "Se Connecter"

### 3. Gérer les Menus
1. Cliquer sur "Menu / Plats" dans la sidebar
2. Cliquer sur "Ajouter un Plat"
3. Remplir le formulaire
4. Cliquer sur "Enregistrer"

### 4. Gérer les Commandes
1. Cliquer sur "Commandes" dans la sidebar
2. Filtrer par statut si nécessaire
3. Cliquer sur 👁️ pour voir les détails
4. Mettre à jour le statut
5. Cliquer sur "Mettre à Jour"

### 5. Modifier les Paramètres
1. Cliquer sur "Paramètres" dans la sidebar
2. Modifier les informations
3. Cliquer sur "Enregistrer"

---

## 📊 Statistiques et Rapports

### Données Disponibles
- Nombre total de menus
- Commandes par jour/semaine/mois
- Revenu total
- Utilisateurs actifs
- Plats les plus populaires
- Catégories les plus vendues

### Export (à implémenter)
- Export CSV des commandes
- Export PDF des rapports
- Export Excel des utilisateurs

---

## 🔒 Sécurité

### Bonnes Pratiques
1. **Changer les identifiants par défaut**
2. **Utiliser HTTPS en production**
3. **Implémenter le rate limiting**
4. **Hasher les mots de passe**
5. **Utiliser des tokens JWT**
6. **Limiter les tentatives de connexion**

### Rôles Utilisateurs (à implémenter)
- **Super Admin**: Accès complet
- **Manager**: Gestion menus et commandes
- **Staff**: Visualisation uniquement

---

## 🎯 Fonctionnalités Avancées (À Venir)

### Court Terme
- [ ] Historique des modifications
- [ ] Export des données
- [ ] Notifications email
- [ ] Impression des commandes
- [ ] Gestion des stocks

### Moyen Terme
- [ ] Analytics avancés
- [ ] Graphiques de ventes
- [ ] Gestion multi-utilisateurs
- [ ] API webhooks
- [ ] Intégration WhatsApp

### Long Terme
- [ ] Application mobile admin
- [ ] Intelligence artificielle (prévisions)
- [ ] Dashboard personnalisé
- [ ] Intégration comptabilité
- [ ] Système de fidélité

---

## 🐛 Dépannage

### L'admin ne se charge pas
```javascript
// Vérifier la console du navigateur
// Vérifier que la session est active
sessionStorage.getItem('zina_admin');
```

### Les modifications ne sont pas sauvegardées
```javascript
// Vérifier la connexion API
// Vérifier les logs serveur
```

### Problème de connexion
- Vider le cache du navigateur
- Vérifier les identifiants
- Redémarrer le serveur Flask

---

## 📞 Support

Pour toute question ou assistance:

**Email**: support@zina-cantine.ci  
**Téléphone**: +225 27 20 00 00 00  
**Horaires**: Lundi - Vendredi, 7h00 - 18h00

---

## 📄 Fichiers du Projet Admin

```
windsurf-project/
├── templates/
│   └── admin.html          # Interface admin (650+ lignes)
├── static/
│   ├── css/
│   │   └── admin.css       # Styles admin (900+ lignes)
│   └── js/
│       └── admin.js        # Logiciel admin (800+ lignes)
├── app.py                  # Routes admin ajoutées
└── ADMIN_GUIDE.md          # Ce document
```

---

## ✅ Checklist de Démarrage

- [ ] Changer le mot de passe admin
- [ ] Configurer les paramètres du site
- [ ] Ajouter les menus initiaux
- [ ] Vérifier les catégories
- [ ] Tester le système de commande
- [ ] Configurer les modes de paiement
- [ ] Définir les horaires d'ouverture
- [ ] Sauvegarder les paramètres

---

**Développé avec ❤️ pour ZINA - Cantine BAD**  
*Abidjan, Côte d'Ivoire* 🇨🇮

---

## 🎉 Prêt à l'Emploi !

L'interface d'administration est **100% fonctionnelle** et prête pour:
- ✅ La gestion des menus (CRUD complet)
- ✅ La gestion des catégories
- ✅ Le suivi des commandes
- ✅ La gestion des utilisateurs
- ✅ La configuration du site

**Statut:** ✅ **TERMINÉ ET OPÉRATIONNEL**
