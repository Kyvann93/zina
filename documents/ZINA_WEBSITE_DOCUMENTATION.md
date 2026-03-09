# ZINA - Cantine BAD | Site Web Professionnel

## 🎉 Vue d'Ensemble

**ZINA** est le sous-traitant officiel de la cantine de la **Banque Africaine de Développement (BAD)** à Abidjan, Côte d'Ivoire. Ce site web one-page professionnel présente les services de restauration de ZINA avec un design moderne et élégant.

---

## 🌟 Fonctionnalités Principales

### Sections du Site

1. **Accueil (Hero)**
   - Bannière immersive avec effet parallaxe
   - Badge "Sous-traitant Officiel BAD"
   - Statistiques clés (500+ collaborateurs, 50+ plats, etc.)
   - Boutons d'appel à l'action

2. **À Propos**
   - Présentation de ZINA et son partenariat avec la BAD
   - Galerie d'images avec effet de superposition
   - Liste des avantages (ingrédients frais, hygiène certifiée, etc.)

3. **Services**
   - Petit-Déjeuner
   - Déjeuner Complet
   - Collations
   - Menu Gastronomique
   - Livraison Express
   - Événements & Catering

4. **Galerie Photo**
   - Grille d'images responsive
   - Filtres par catégorie (Plats, Cuisine, Équipe, Locaux)
   - Lightbox pour visionnage en grand format

5. **Menu du Jour**
   - Système d'onglets interactif
   - Affichage dynamique des plats par catégorie
   - Intégration avec l'API backend
   - Boutons d'ajout au panier

6. **Équipe**
   - Présentation des membres clés
   - Photos professionnelles
   - Rôles et descriptions

7. **Témoignages**
   - Avis des collaborateurs de la BAD
   - Système de notation en étoiles

8. **Contact**
   - Formulaire de contact fonctionnel
   - Coordonnées complètes
   - Horaires d'ouverture
   - Liens vers les réseaux sociaux

---

## 🎨 Charte Graphique

### Couleurs de la Marque ZINA

```css
--primary-color: #581b1f;      /* Bordeaux - Couleur principale */
--primary-dark: #3d1215;       /* Bordeaux foncé */
--primary-light: #a0656b;      /* Bordeaux clair */
--accent-color: #d4af37;       /* Or - Pour le prestige */
```

### Typographie

- **Titres**: `Playfair Display` (Serif, élégant)
- **Navigation/Boutons**: `Poppins` (Sans-serif, moderne)
- **Corps de texte**: `Open Sans` (Sans-serif, lisible)

---

## 🛠️ Stack Technique

### Backend
- **Flask** 2.3.3 - Framework web Python
- **Supabase** 1.0.4 - Base de données et backend
- **python-dotenv** 1.0.0 - Gestion des variables d'environnement

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Styles modernes avec variables CSS
- **JavaScript (ES6+)** - Interactions et animations
- **Font Awesome 6.4.0** - Icônes professionnelles
- **Google Fonts** - Typographie premium

---

## 📁 Structure du Projet

```
windsurf-project/
├── app.py                      # Application Flask principale
├── models.py                   # Modèles de données Python
├── database_service.py         # Service de base de données
├── requirements.txt            # Dépendances Python
├── .env                        # Variables d'environnement
├── templates/
│   └── index.html             # Template HTML principal
├── static/
│   ├── css/
│   │   └── style.css          # Feuilles de style complètes
│   └── js/
│       └── app.js             # JavaScript interactif
└── README.md                   # Documentation
```

---

## 🚀 Installation et Démarrage

### Prérequis
- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)
- Compte Supabase configuré

### Étapes d'Installation

1. **Cloner le projet**
   ```bash
   cd c:\Users\Green Pay\CascadeProjects\windsurf-project
   ```

2. **Activer l'environnement virtuel**
   ```bash
   .\zinaenv\Scripts\activate
   ```

3. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurer les variables d'environnement**
   
   Modifier le fichier `.env` avec vos credentials Supabase:
   ```env
   SUPABASE_URL=votre_url_supabase
   SUPABASE_KEY=votre_cle_supabase
   ```

5. **Lancer l'application**
   ```bash
   python app.py
   ```

6. **Accéder au site**
   ```
   http://localhost:5000
   ```

---

## 🔌 API Endpoints

### Menu & Produits
```
GET  /api/menu              - Récupérer le menu complet
GET  /api/menu/today        - Menu du jour
GET  /api/categories        - Toutes les catégories
GET  /api/products/<id>     - Détails d'un produit
```

### Commandes
```
POST /api/order             - Créer une nouvelle commande
GET  /api/orders/<id>       - Détails d'une commande
```

### Contact & Newsletter
```
POST /api/contact           - Soumettre le formulaire de contact
POST /api/newsletter        - S'inscrire à la newsletter
GET  /api/info              - Informations sur l'entreprise
```

---

## 🎯 Fonctionnalités Avancées

### 1. Navigation Intelligente
- Menu fixe avec effet de scroll
- Survol avec ombres portées
- Indicateur de section active
- Menu mobile responsive

### 2. Animations Fluides
- Fade-in au défilement
- Effets de survol sur les cartes
- Transitions douces
- Lightbox pour la galerie

### 3. Système de Menu Dynamique
- Chargement asynchrone des données
- Filtrage par catégorie
- Affichage des prix en FCFA (XOF)
- Indicateurs de temps de préparation

### 4. Formulaire de Contact
- Validation côté client
- Envoi AJAX sans rechargement
- Notifications toast
- Gestion des erreurs

### 5. Responsive Design
- Mobile-first approach
- Breakpoints optimisés
- Menu hamburger pour mobile
- Grilles adaptatives

---

## 📱 Responsive Design

Le site est entièrement responsive et s'adapte à tous les appareils:

- **Desktop**: > 1024px (grille 3-4 colonnes)
- **Tablette**: 768px - 1024px (grille 2 colonnes)
- **Mobile**: < 768px (grille 1 colonne, menu hamburger)

---

## 🎨 Éléments de Design

### Cartes de Service
- Effet de survol avec élévation
- Badge "Populaire" pour les services phares
- Icônes Font Awesome
- Listes à puces personnalisées

### Galerie Photo
- Grille Masonry
- Overlay au survol
- Effet de zoom sur les images
- Filtres interactifs

### Témoignages
- Design en verre dépoli (glassmorphism)
- Notation en étoiles dorées
- Photos des auteurs
- Citations en italique

---

## 🔧 Personnalisation

### Modifier les Couleurs
Dans `static/css/style.css`, modifiez les variables CSS:

```css
:root {
    --primary-color: #581b1f;  /* Votre couleur */
    --accent-color: #d4af37;   /* Votre accent */
}
```

### Modifier le Menu
Les éléments du menu sont chargés depuis la base de données Supabase. Ajoutez/modifiez les produits dans votre table `products`.

### Ajouter des Images
Les images utilisent actuellement Unsplash. Remplacez les URLs par vos propres images:

```html
<img src="/static/images/votre-image.jpg" alt="Description">
```

---

## 📊 Performances

### Optimisations Incluses
- Chargement différé des images (Lazy Loading)
- Minification CSS/JS (à faire en production)
- Mise en cache des données API
- Animations CSS optimisées

### Bonnes Pratiques
- HTML sémantique
- Contraste des couleurs accessible (WCAG AA)
- Navigation au clavier supportée
- Balises ARIA pour l'accessibilité

---

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier que l'environnement virtuel est activé
# Vérifier les dépendances
pip install -r requirements.txt

# Vérifier le fichier .env
cat .env
```

### Erreur de connexion à Supabase
- Vérifiez vos credentials dans `.env`
- Assurez-vous que votre projet Supabase est actif
- Vérifiez les règles RLS (Row Level Security)

### Le menu ne s'affiche pas
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs JavaScript
- Assurez-vous que l'API `/api/menu` répond correctement

---

## 📞 Support

Pour toute question ou assistance technique:

- **Email**: contact@zina-cantine.ci
- **Téléphone**: +225 27 20 00 00 00
- **Adresse**: Cantine BAD, Avenue Joseph Anoma, Abidjan, Côte d'Ivoire

---

## 📝 Licence

Ce projet est la propriété exclusive de **ZINA** et de la **Banque Africaine de Développement (BAD)**.

---

## 🙏 Remerciements

- **Équipe ZINA** - Pour leur engagement envers l'excellence culinaire
- **BAD** - Pour leur confiance et leur partenariat
- **Développeurs** - Pour leur travail sur ce projet professionnel

---

## 🎯 Prochaines Améliorations

- [ ] Système de réservation en ligne
- [ ] Menu QR code pour commande sur place
- [ ] Application mobile native
- [ ] Intégration WhatsApp Business
- [ ] Système de fidélité
- [ ] Paiement mobile (Orange Money, MTN Mobile Money)
- [ ] Analytics et tableau de bord admin

---

**Développé avec ❤️ pour ZINA - Cantine BAD**
*Excellence Culinaire au Service de la Banque Africaine de Développement*
