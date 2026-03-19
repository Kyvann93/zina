/* ============================================================
   ZINA Voice Ordering — Web Speech API
   ============================================================ */

(function () {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let menuItems = [];

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
  }

  function fuzzyMatch(query, items) {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return items.find(item => {
      const name = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q) || q.includes(name.split(' ')[0]);
    });
  }

  function parseCommand(transcript) {
    const lower = transcript.toLowerCase().trim();

    // "ajouter [item]"
    const addPatterns = [/ajouter\s+(.+)/, /je veux\s+(.+)/, /donne.?moi\s+(.+)/, /commander\s+(.+)/, /un\s+(.+)/];
    for (const pat of addPatterns) {
      const match = lower.match(pat);
      if (match) return { action: 'add', query: match[1].trim() };
    }

    // "retirer [item]"
    const removePatterns = [/retirer\s+(.+)/, /enlever\s+(.+)/, /supprimer\s+(.+)/];
    for (const pat of removePatterns) {
      const match = lower.match(pat);
      if (match) return { action: 'remove', query: match[1].trim() };
    }

    // "commander" / "valider"
    if (/commander|valider|confirmer|passer la commande/.test(lower)) {
      return { action: 'order' };
    }

    // "vider le panier"
    if (/vider|vide le panier|annuler/.test(lower)) {
      return { action: 'clear' };
    }

    return null;
  }

  function setListeningUI(listening) {
    const btn = document.getElementById('voice-btn');
    if (!btn) return;
    if (listening) {
      btn.classList.add('listening');
      btn.innerHTML = '<i class="fas fa-stop"></i>';
      btn.title = 'Arrêter l\'écoute';
    } else {
      btn.classList.remove('listening');
      btn.innerHTML = '<i class="fas fa-microphone"></i>';
      btn.title = 'Commander par la voix';
    }
  }

  function handleResult(event) {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join(' ');

    if (window.showToast) {
      window.showToast(`Reconnu: "${transcript}"`, 'info');
    }

    const command = parseCommand(transcript);
    if (!command) {
      if (window.showToast) window.showToast('Commande non reconnue. Essayez "Ajouter Attiéké Poulet"', 'error');
      return;
    }

    switch (command.action) {
      case 'add': {
        const item = fuzzyMatch(command.query, menuItems);
        if (item) {
          if (window.zinaApp && typeof window.zinaApp.addToCart === 'function') {
            window.zinaApp.addToCart(item.id, item.name, item.price, []);
          }
          if (window.showToast) window.showToast(`Ajout de ${item.name} au panier ✓`, 'success');
        } else {
          if (window.showToast) window.showToast(`Produit non trouvé: "${command.query}"`, 'error');
        }
        break;
      }
      case 'remove': {
        const item = fuzzyMatch(command.query, menuItems);
        if (item) {
          if (window.zinaApp && typeof window.zinaApp.removeFromCart === 'function') {
            window.zinaApp.removeFromCart(item.id);
          }
          if (window.showToast) window.showToast(`${item.name} retiré du panier`, 'info');
        } else {
          if (window.showToast) window.showToast(`Produit non trouvé: "${command.query}"`, 'error');
        }
        break;
      }
      case 'order': {
        if (window.zinaApp && typeof window.zinaApp.placeOrder === 'function') {
          window.zinaApp.placeOrder();
        }
        if (window.showToast) window.showToast('Passage de la commande... ✓', 'success');
        break;
      }
      case 'clear': {
        if (window.zinaApp && typeof window.zinaApp.clearCart === 'function') {
          window.zinaApp.clearCart();
        }
        if (window.showToast) window.showToast('Panier vidé', 'info');
        break;
      }
    }
  }

  if (recognition) {
    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('end', () => {
      isListening = false;
      setListeningUI(false);
    });
    recognition.addEventListener('error', (e) => {
      isListening = false;
      setListeningUI(false);
      let msg = 'Erreur microphone';
      if (e.error === 'no-speech') msg = 'Aucune parole détectée';
      if (e.error === 'not-allowed') msg = 'Accès au microphone refusé';
      if (window.showToast) window.showToast(msg, 'error');
    });
  }

  /**
   * Public: startVoiceOrdering()
   */
  window.startVoiceOrdering = function () {
    if (!recognition) {
      if (window.showToast) {
        window.showToast('La reconnaissance vocale n\'est pas disponible sur ce navigateur', 'error');
      }
      return;
    }

    if (isListening) {
      recognition.stop();
      isListening = false;
      setListeningUI(false);
      return;
    }

    try {
      recognition.start();
      isListening = true;
      setListeningUI(true);
      if (window.showToast) window.showToast('🎤 Écoute... Dites "Ajouter [plat]"', 'info');
    } catch (e) {
      if (window.showToast) window.showToast('Erreur: microphone déjà en cours d\'utilisation', 'error');
    }
  };

  /**
   * Public: setVoiceMenuItems(items)
   * Called by ZinaApp once menu is loaded
   */
  window.setVoiceMenuItems = function (items) {
    menuItems = items || [];
  };

  // Graceful fallback message if no API
  if (!SpeechRecognition) {
    console.info('[ZINA Voice] Web Speech API non disponible. La commande vocale sera désactivée.');
  }

})();
