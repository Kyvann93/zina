"""
ZINA Cantine BAD - Shared API Constants
Centralised data used across multiple route modules.
"""

# Emoji icons mapped to lower-cased category names (or common slugs)
CATEGORY_EMOJIS = {
    # Petit-déjeuner / breakfast
    'petit_déjeuner':  '🌅',
    'petit-déjeuner':  '🌅',
    'petit déjeuner':  '🌅',
    'breakfast':       '🌅',
    # Déjeuner / lunch
    'déjeuner':        '🥘',
    'dejeuner':        '🥘',
    'lunch':           '🥘',
    # Dîner / dinner
    'dîner':           '🍲',
    'diner':           '🍲',
    'dinner':          '🍲',
    # Plats / main courses
    'plats':           '🥘',
    'plat':            '🥘',
    'plats_complets':  '🥘',
    'plats complets':  '🥘',
    'plat_du_jour':    '🍛',
    'plats_du_jour':   '🍛',
    # Snacks
    'snacks':          '🥪',
    'snack':           '🥪',
    # Salades / entrées
    'salades':         '🥗',
    'salade':          '🥗',
    'entrées':         '🥗',
    'entrees':         '🥗',
    'entree':          '🥗',
    'entrée':          '🥗',
    'appetizers':      '🥗',
    # Soupes
    'soupes':          '🍜',
    'soupe':           '🍜',
    'soups':           '🍜',
    # Boissons / drinks
    'boissons':        '🥤',
    'boisson':         '🥤',
    'drinks':          '🥤',
    'jus':             '🧃',
    'cafés':           '☕',
    'cafe':            '☕',
    'café':            '☕',
    'thé':             '🍵',
    'the':             '🍵',
    # Desserts
    'desserts':        '🍰',
    'dessert':         '🍰',
    'pâtisseries':     '🧁',
    'patisseries':     '🧁',
    'gâteaux':         '🎂',
    'gateaux':         '🎂',
    # Spécialités / formules
    'spécialités':     '🌟',
    'specialites':     '🌟',
    'specials':        '🌟',
    'formules':        '⭐',
    'formule':         '⭐',
    'menus':           '📋',
    # Viandes / poissons
    'viandes':         '🥩',
    'viande':          '🥩',
    'grillades':       '🍖',
    'poissons':        '🐟',
    'poisson':         '🐟',
    'poulet':          '🍗',
    # Végétarien
    'végétarien':      '🥦',
    'vegetarien':      '🥦',
    'vegan':           '🌱',
    # Africain / local
    'africain':        '🌍',
    'ivoirien':        '🌍',
    'local':           '🌍',
}

# Default fallback images per category key (used when product/category has no image)
CATEGORY_DEFAULT_IMAGES = {
    'petit_déjeuner':  'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
    'petit-déjeuner':  'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
    'déjeuner':        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'dejeuner':        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'snacks':          'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=300&fit=crop',
    'salades':         'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'salade':          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'boissons':        'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
    'desserts':        'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
    'dessert':         'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
    'dîner':           'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'diner':           'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'entrées':         'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
    'entrees':         'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
    'soupes':          'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
    'soupe':           'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
    'spécialités':     'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    'specialites':     'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    'breakfast':       'https://images.unsplash.com/photo-1533089862017-5614ec45e25a?w=400&h=300&fit=crop',
    'lunch':           'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'dinner':          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'appetizers':      'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&h=300&fit=crop',
    'soups':           'https://images.unsplash.com/photo-1547592166-23acbe346499?w=400&h=300&fit=crop',
    'specials':        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
}

CATEGORY_DEFAULT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1544025162-d76690b67f14?w=400&h=300&fit=crop'
