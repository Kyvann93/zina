# 🍽️ ZINA Cantine BAD - Employee Food Ordering Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen.svg)](https://codecov.io/)

> **Plateforme de commande de nourriture moderne pour les employés de la Banque Africaine de Développement (BAD) à Abidjan, Côte d'Ivoire**

ZINA est une **solution digitale révolutionnaire** qui permet aux employés de la BAD de commander leur nourriture en ligne et de la retirer directement à la cantine pour un paiement sur place.

---

## 🎯 Concept Clé

**Commande en ligne → Retrait à la cantine → Paiement sur place**

Les employés BAD peuvent :
- **Parcourir les menus quotidiens** depuis leur bureau
- **Commander des repas** via une interface intuitive
- **Retirer et payer** directement à la cantine (pas de paiement en ligne)
- **Gagner du temps** avec des commandes rapides et favoris
- **Suivre la nutrition** et les préférences alimentaires

---

## 🌟 Fonctionnalités

### 📱 **Interface Employé**
- **Navigation intuitive** avec design 3-clics
- **Menu interactif** avec filtres avancés
- **Panier intelligent** avec calcul automatique
- **Commande rapide** avec favoris et historique
- **Suivi en temps réel** du statut de commande

### 🎨 **Expérience Utilisateur**
- **Design mobile-first** responsive
- **Personnalisation** selon préférences alimentaires
- **Notifications push** pour statuts de commande
- **Code QR** pour retrait sans contact
- **Mode hors ligne** pour navigation menu

### 👨‍💼 **Tableau de Bord Admin**
- **Gestion des menus** en temps réel
- **Suivi des commandes** et préparation
- **Analytics avancées** sur les tendances
- **Gestion des stocks** et alertes
- **Rapports exportables** (PDF/Excel)

### 🔧 **Excellence Technique**
- **API RESTful** complète et documentée
- **Architecture scalable** avec microservices
- **Sécurité JWT** et validation robuste
- **Performance optimisée** avec cache
- **Monitoring 24/7** avec alertes

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/zina-cantine/zina-bad.git
cd zina-bad

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 5. Initialize database
python scripts/init_db.py

# 6. Run the application
python app.py
```

### Docker Setup

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: Flask 2.3.3
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens
- **API**: RESTful with OpenAPI docs
- **Validation**: Marshmallow schemas
- **Testing**: pytest + coverage

### Frontend Stack
- **Languages**: HTML5, CSS3, JavaScript ES6+
- **Styling**: CSS Grid + Flexbox
- **Fonts**: Google Fonts (Poppins, Playfair Display)
- **Icons**: Font Awesome 6
- **Animations**: CSS3 + JavaScript
- **Responsive**: Mobile-first design

### Infrastructure
- **Hosting**: AWS/Google Cloud
- **CDN**: CloudFlare
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack
- **Backup**: Automated daily backups

---

## � Project Structure
## 📋 API Endpoints

```
GET  /api/menu              - Menu complet
POST /api/order             - Créer commande
POST /api/contact           - Formulaire contact
POST /api/newsletter        - Inscription newsletter
GET  /api/info              - Infos entreprise
```

---

## 🌟 Fonctionnalités Clés

✅ Navigation fluide avec scroll smooth  
✅ Menu de navigation sticky avec ombre  
✅ Hero section avec effet parallaxe  
✅ Galerie photo avec lightbox  
✅ Système de panier fonctionnel  
✅ Formulaires avec validation  
✅ Notifications toast  
✅ Animations au scroll  
✅ Responsive design complet  
✅ API REST complète  

---

## 📖 Documentation Complète

Consultez `ZINA_WEBSITE_DOCUMENTATION.md` pour une documentation détaillée incluant:
- Guide d'installation pas à pas
- Personnalisation du design
- API endpoints détaillés
- Dépannage
- Bonnes pratiques

---

## 💼 À Propos de ZINA

ZINA est spécialisé dans la restauration collective d'entreprise. Notre engagement: offrir une expérience gastronomique exceptionnelle aux collaborateurs de la BAD, alliant saveurs locales ivoiriennes et cuisine internationale.

**Nos Valeurs:**
- 🏆 Excellence culinaire
- 🥗 Ingrédients frais et locaux
- 🧼 Hygiène certifiée
- 👨‍🍳 Équipe professionnelle
- 🌍 Diversité culturelle

---

## 🔧 Développement

### Modifier le Design
Éditez `static/css/style.css` - les variables CSS sont en haut du fichier.

### Modifier le Contenu
Éditez `templates/index.html` - tout le contenu textuel y est.

### Modifier le Menu
Les plats sont gérés dans la base de données Supabase (tables: `products`, `categories`).

---

## 📱 Mobile

Le site est entièrement responsive:
- Menu hamburger sur mobile
- Grilles adaptatives
- Tactile-friendly
- Optimisé pour tous les écrans

---

## 🔒 Sécurité

- Validation des formulaires côté serveur
- Protection CSRF (à implémenter en production)
- HTTPS requis en production
- Variables d'environnement sécurisées

---

## 📄 Licence

Propriété exclusive de **ZINA** et **BAD**. Tous droits réservés.

---

## 🙏 Crédits

- **Design & Développement**: Équipe technique ZINA
- **Images**: Unsplash (placeholders)
- **Icônes**: Font Awesome
- **Polices**: Google Fonts

---

**ZINA - L'Excellence Culinaire au Service de la BAD**  
*Développé avec passion à Abidjan, Côte d'Ivoire* 🇨🇮
