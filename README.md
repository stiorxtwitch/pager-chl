# 📟 SAMU — Système Pager Ambulance

Interface web de déclenchement de pager ambulance, déployable sur GitHub Pages (aucun serveur requis).

---

## Structure des fichiers

```
/
├── index.html         → Page d'accueil
├── dispatch.html      → Interface Dispatch (chef de salle)
├── pager.html         → Interface Pager (agents)
├── style.css          → Styles partagés
├── pager-widget.js    → Widget pager flottant
└── page.mp3           → ⚠️ À placer ici manuellement !
```

---

## Déploiement sur GitHub Pages

1. Créez un dépôt GitHub (public ou privé avec Pages activées)
2. Copiez tous les fichiers à la racine du dépôt
3. Ajoutez votre fichier `page.mp3` dans le même dossier
4. Activez GitHub Pages : `Settings → Pages → Source: main branch / root`
5. Votre site sera disponible sur : `https://VOTRE-USERNAME.github.io/NOM-REPO/`

---

## Utilisation

### Configuration du canal

Les deux pages (Dispatch et Pager) doivent utiliser le **même identifiant de canal**.

1. Sur le Dispatch : cliquez sur **⚙ Canal** et notez l'identifiant généré
2. Sur chaque Pager : cliquez sur **⚙ Canal** et entrez le même identifiant
3. La communication est instantanée via [ntfy.sh](https://ntfy.sh)

> ⚠️ **Sécurité** : Choisissez un identifiant difficile à deviner (ex: `ambu-samu-nancy-x7k2`). Ne partagez pas d'informations médicales sensibles dans les messages pager.

### Interface Dispatch

- Sélectionnez le type d'incident (preset ou saisi manuellement)
- Choisissez le grade d'urgence (T1, T2, T3, SMUR)
- Cochez les ressources demandées
- Saisissez le numéro de rappel
- Cliquez **DÉCLENCHER LE PAGER**

### Interface Pager

- Le pager s'ouvre automatiquement à la réception d'une alerte
- Il peut être déplacé par glisser-déposer
- Cliquez **▲** pour acquitter l'alerte
- Cliquez **📟 Ouvrir le Pager** pour l'afficher manuellement

---

## Son

Le système essaie de jouer `page.mp3` en priorité.  
Si le fichier est absent, un son de pager est synthétisé automatiquement via Web Audio API.

---

## Technologies

- HTML / CSS / JavaScript vanilla — aucune dépendance
- [ntfy.sh](https://ntfy.sh) pour la communication temps réel (SSE)
- Web Audio API pour la synthèse sonore de secours
- Vibration API pour les appareils mobiles

---

## Pour aller plus loin

Pour un usage en production médicale réelle, envisagez :
- Auto-héberger [ntfy](https://github.com/binwiederhier/ntfy) sur votre infrastructure
- Ajouter une authentification sur les canaux ntfy
- Activer HTTPS (obligatoire pour l'API Vibration et l'Audio autoplay)
