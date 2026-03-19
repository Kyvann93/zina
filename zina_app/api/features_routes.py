"""
ZINA Cantine BAD - Features Routes
Flash deals, leaderboard, recommendations, emoji reactions, live stats, order tracking
"""

import random
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request

features_bp = Blueprint('features', __name__)

# ── In-memory emoji reaction counters (reset on restart, OK for demo) ──
_emoji_reactions: dict[str, dict] = {}

# ── Mock leaderboard data ──
LEADERBOARD_DATA = [
    {"rank": 1, "name": "Kofi A.", "points": 4200, "level": 8, "avatar": "K", "color": "#C4002B", "total_orders": 84, "favorite_item": "Attiéké Poulet"},
    {"rank": 2, "name": "Marie D.", "points": 3800, "level": 7, "avatar": "M", "color": "#F5A623", "total_orders": 76, "favorite_item": "Jus Bissap"},
    {"rank": 3, "name": "Aminata S.", "points": 3100, "level": 7, "avatar": "A", "color": "#00A651", "total_orders": 62, "favorite_item": "Riz Sauce Graine"},
    {"rank": 4, "name": "Ibrahim K.", "points": 2800, "level": 6, "avatar": "I", "color": "#7C3AED", "total_orders": 56, "favorite_item": "Menu Complet"},
    {"rank": 5, "name": "Fatou N.", "points": 2400, "level": 6, "avatar": "F", "color": "#DB2777", "total_orders": 48, "favorite_item": "Placali Poisson"},
    {"rank": 6, "name": "Jean P.", "points": 2100, "level": 6, "avatar": "J", "color": "#0891B2", "total_orders": 42, "favorite_item": "Foutou Banane"},
    {"rank": 7, "name": "Akosua M.", "points": 1800, "level": 5, "avatar": "A", "color": "#059669", "total_orders": 36, "favorite_item": "Salade Fraîche"},
    {"rank": 8, "name": "Kwame B.", "points": 1500, "level": 5, "avatar": "K", "color": "#D97706", "total_orders": 30, "favorite_item": "Attiéké Thon"},
    {"rank": 9, "name": "Nadia O.", "points": 1200, "level": 4, "avatar": "N", "color": "#DC2626", "total_orders": 24, "favorite_item": "Jus Gingembre"},
    {"rank": 10, "name": "Cheikh T.", "points": 900, "level": 4, "avatar": "C", "color": "#7C3AED", "total_orders": 18, "favorite_item": "Menu Complet"},
]

# ── Flash Deals ──
def _build_flash_deals():
    now = datetime.utcnow()
    return [
        {
            "id": "deal_1",
            "name": "Attiéké Poulet",
            "discount": 20,
            "original_price": 2500,
            "discounted_price": 2000,
            "expires_at": (now + timedelta(hours=2)).isoformat() + "Z",
            "emoji": "🍗",
            "product_match": "attiéké poulet",
            "description": "Le classique de la cantine à prix réduit !"
        },
        {
            "id": "deal_2",
            "name": "Jus Bissap",
            "discount": 15,
            "original_price": 800,
            "discounted_price": 680,
            "expires_at": (now + timedelta(minutes=45)).isoformat() + "Z",
            "emoji": "🍹",
            "product_match": "bissap",
            "description": "Fraîcheur garantie, offre limitée !"
        },
        {
            "id": "deal_3",
            "name": "Menu Complet",
            "discount": 25,
            "original_price": 3500,
            "discounted_price": 2625,
            "expires_at": (now + timedelta(hours=3)).isoformat() + "Z",
            "emoji": "🍽️",
            "product_match": "menu complet",
            "description": "Plat + boisson + dessert, économisez 25% !"
        }
    ]


# ── Mock order tracking stages ──
ORDER_STAGES = ["confirmed", "preparing", "ready", "delivered"]

_order_tracking: dict[str, dict] = {}


def _get_or_init_tracking(order_id: str) -> dict:
    if order_id not in _order_tracking:
        _order_tracking[order_id] = {
            "order_id": order_id,
            "stage_index": 0,
            "stage": ORDER_STAGES[0],
            "started_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
    return _order_tracking[order_id]


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@features_bp.route('/flash-deals')
def get_flash_deals():
    """Return today's flash deals"""
    return jsonify({
        "status": "success",
        "deals": _build_flash_deals()
    })


@features_bp.route('/leaderboard')
def get_leaderboard():
    """Return top-10 leaderboard"""
    period = request.args.get('period', 'all')  # week | month | all
    multiplier = {"week": 0.1, "month": 0.4, "all": 1.0}.get(period, 1.0)

    data = []
    for entry in LEADERBOARD_DATA:
        points = int(entry["points"] * multiplier)
        data.append({**entry, "points": points})

    data.sort(key=lambda x: x["points"], reverse=True)
    for i, e in enumerate(data):
        e["rank"] = i + 1

    return jsonify({
        "status": "success",
        "period": period,
        "leaderboard": data
    })


@features_bp.route('/recommendations')
async def get_recommendations():
    """Return 3 random available products as recommendations"""
    try:
        from flask import current_app
        from supabase import create_client
        supabase = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        response = supabase.table('products').select('*').eq('is_available', True).execute()
        products = response.data or []

        if len(products) >= 3:
            picks = random.sample(products, 3)
        else:
            picks = products

        recommendations = []
        for p in picks:
            recommendations.append({
                "id": p.get("product_id"),
                "name": p.get("product_name"),
                "price": float(p.get("price", 0)),
                "description": p.get("description", ""),
                "image": p.get("image_url"),
                "reason": random.choice([
                    "Très populaire aujourd'hui",
                    "Recommandé pour vous",
                    "Coup de cœur de la semaine",
                    "Plat du jour",
                    "Nouveauté"
                ])
            })

        return jsonify({
            "status": "success",
            "recommendations": recommendations
        })
    except Exception as e:
        # Return fallback recommendations if DB fails
        return jsonify({
            "status": "success",
            "recommendations": [
                {"id": 1, "name": "Attiéké Poulet", "price": 2500, "description": "Le classique ivoirien", "image": None, "reason": "Populaire"},
                {"id": 2, "name": "Riz Sauce Graine", "price": 2200, "description": "Saveurs d'Abidjan", "image": None, "reason": "Coup de coeur"},
                {"id": 3, "name": "Jus Bissap", "price": 800, "description": "Fraîcheur naturelle", "image": None, "reason": "Rafraîchissant"},
            ]
        })


@features_bp.route('/emoji-reaction', methods=['POST'])
def post_emoji_reaction():
    """Record an emoji reaction for a product"""
    try:
        data = request.get_json() or {}
        product_id = str(data.get('product_id', ''))
        emoji = data.get('emoji', '❤️')
        user_id = data.get('user_id')

        if not product_id:
            return jsonify({"error": "product_id is required"}), 400

        if product_id not in _emoji_reactions:
            _emoji_reactions[product_id] = {}

        _emoji_reactions[product_id][emoji] = _emoji_reactions[product_id].get(emoji, 0) + 1
        count = _emoji_reactions[product_id][emoji]

        return jsonify({
            "status": "success",
            "product_id": product_id,
            "emoji": emoji,
            "count": count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@features_bp.route('/emoji-reactions/<product_id>')
def get_emoji_reactions(product_id):
    """Get all emoji reaction counts for a product"""
    reactions = _emoji_reactions.get(str(product_id), {})
    return jsonify({
        "status": "success",
        "product_id": product_id,
        "reactions": reactions
    })


@features_bp.route('/live-stats')
def get_live_stats():
    """Return live app statistics"""
    # Randomize slightly to feel alive
    base_orders = 47
    variance = random.randint(-3, 8)
    active_users = random.randint(12, 35)

    popular_items = [
        "Attiéké Poulet",
        "Riz Sauce Graine",
        "Menu Complet",
        "Jus Bissap",
        "Placali Poisson"
    ]

    return jsonify({
        "status": "success",
        "orders_today": base_orders + variance,
        "active_users": active_users,
        "popular_item": random.choice(popular_items),
        "total_revenue_today": (base_orders + variance) * random.randint(2200, 3500),
        "avg_prep_time_minutes": random.randint(12, 20),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })


@features_bp.route('/order-tracking/<order_id>')
def get_order_tracking(order_id):
    """
    Return mocked order status with simulated progression.
    Each call advances the stage by 1 (for demo purposes).
    """
    tracking = _get_or_init_tracking(order_id)

    # Auto-advance stage on each poll (simulate progress)
    current_idx = tracking["stage_index"]
    if current_idx < len(ORDER_STAGES) - 1:
        # Advance with ~40% probability per poll (feels dynamic)
        if random.random() < 0.4:
            current_idx += 1
            tracking["stage_index"] = current_idx
            tracking["stage"] = ORDER_STAGES[current_idx]
            tracking["updated_at"] = datetime.utcnow().isoformat() + "Z"
            _order_tracking[order_id] = tracking

    stage_labels = {
        "confirmed": "Commande confirmée",
        "preparing": "En préparation",
        "ready": "Prêt à récupérer",
        "delivered": "Récupéré"
    }

    stages_list = []
    for i, s in enumerate(ORDER_STAGES):
        stages_list.append({
            "id": s,
            "label": stage_labels.get(s, s),
            "completed": i < current_idx,
            "active": i == current_idx,
        })

    return jsonify({
        "status": "success",
        "order_id": order_id,
        "current_stage": tracking["stage"],
        "current_stage_label": stage_labels.get(tracking["stage"], tracking["stage"]),
        "stages": stages_list,
        "started_at": tracking["started_at"],
        "updated_at": tracking["updated_at"],
        "estimated_ready_in_minutes": max(0, (len(ORDER_STAGES) - 1 - current_idx) * 7)
    })


@features_bp.route('/pickup.html')
def pickup_redirect():
    """Redirect legacy pickup URL"""
    from flask import redirect
    return redirect('/commander', code=302)
