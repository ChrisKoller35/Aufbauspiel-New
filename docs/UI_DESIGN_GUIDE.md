# UI-Design-Rezept für moderne Game-Fenster

> **Stil: Dark Glassmorphism Gaming**
> Alles basiert auf den Patterns aus dem Cashfish2-Projekt.

---

## 1. Farbpalette: Dunkles Glasmorph-Design

```css
/* Basis */
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
color: #fff;
font-family: 'Segoe UI', Arial, sans-serif;
```

Jedes Gebäude/Fenster bekommt einen **eigenen Gradient + Akzentfarbe**:

| Feature | Gradient | Akzentfarbe |
|---------|----------|-------------|
| Upgrade-System | `#1a1a2e → #16213e` | `#e94560` (Rot) |
| Gärtnerei | `#1a2e1a → #162e16` | `#22c55e` (Grün) |
| Akademie | `#1a102e → #1e1040` | `#a855f7` (Lila) |
| Helfer | `#2e1a0f → #3e2510` | `#f59e0b` (Orange) |
| Inventar | `#1a1a2e → #16213e` | `#4ade80` (Hellgrün) |
| Händler | `#1a1a2e → #16213e` | `#ffd700` (Gold) |
| Missionen | `#1a1a2e → #16213e` | `#60a5fa` (Blau) |

---

## 2. Panel-Container (das "Fenster")

```css
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
border: 3px solid <AKZENTFARBE>;
border-radius: 16px;
padding: 24px;
min-width: 500px;
max-width: 660px;
max-height: 85vh;
overflow-y: auto;
z-index: 10001;
font-family: 'Segoe UI', Arial, sans-serif;
color: #fff;
box-shadow: 0 0 40px rgba(<AKZENT>, 0.4);  /* ← DER Glow-Effekt! */
```

> Der **farbige Glow-Schatten** (`box-shadow: 0 0 40px`) ist das Geheimnis — er lässt das Fenster "leuchten" wie ein Neon-Rahmen.

---

## 3. Tabs mit State-Styling

```css
/* Inaktiv */
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.15);
color: #aaa;
padding: 8px 14px;
border-radius: 8px;
font-size: 13px;
font-weight: normal;
cursor: pointer;
transition: all 0.2s;

/* Aktiv */
background: <AKZENTFARBE>;
border: 1px solid <AKZENTFARBE>;
color: #fff;
font-weight: bold;
```

---

## 4. Karten / Items / Slots

```css
/* Leerer Slot */
border: 2px dashed rgba(255,255,255,0.15);
background: rgba(255,255,255,0.04);
border-radius: 10px;
padding: 12px;
text-align: center;

/* Gefüllter Slot */
border: 2px solid <AKZENT>;
background: rgba(<AKZENT>, 0.1);   /* z.B. rgba(34,197,94,0.1) */
box-shadow: 0 0 8px rgba(<AKZENT>, 0.4);
border-radius: 10px;

/* Hover auf Karten */
transition: all 0.2s ease;
/* :hover */
transform: translateY(-2px);
box-shadow: 0 0 18px rgba(<AKZENT>, 0.25);
border-color: <AKZENT>;
```

---

## 5. Buttons

### Primary Action Button
```css
background: linear-gradient(135deg, <AKZENT> 0%, <AKZENT_DUNKEL> 100%);
border: none;
color: white;
padding: 8px 18px;
border-radius: 6px;
font-weight: bold;
font-size: 13px;
cursor: pointer;
transition: all 0.2s;
```

### Danger / Remove Button
```css
background: rgba(233,69,96,0.2);
border: 1px solid #e94560;
color: #e94560;
padding: 5px 10px;
border-radius: 6px;
cursor: pointer;
font-size: 11px;
```

### Allgemeine Button-Klassen
```css
/* Standard */
.btn {
    backdrop-filter: blur(6px);
    background: #0b1320cc;
    border: 1px solid rgba(255,255,255,.12);
    color: #e8ecff;
    padding: 8px 12px;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
    transition: all .2s ease;
}
.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(0,0,0,.45);
}

/* Primary */
.btn.primary {
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    border-color: #60a5fa;
    color: #fff;
}

/* Success */
.btn.success {
    background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
    border-color: #4ade80;
    color: #fff;
}

/* Gold */
.btn.gold {
    background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%);
    border-color: #fcd34d;
    color: #1a1a2e;
}
```

---

## 6. Close-Button (✕)

```css
background: #e94560;
border: none;
color: white;
width: 32px;
height: 32px;
border-radius: 50%;
cursor: pointer;
font-size: 18px;
font-weight: bold;
display: flex;
align-items: center;
justify-content: center;
```

Inhalt: `✕`

---

## 7. Info-Balken (Gold/Status-Anzeige)

```css
background: rgba(255,255,255,0.08);
padding: 10px 16px;
border-radius: 8px;
margin-bottom: 14px;
display: flex;
justify-content: space-between;
align-items: center;
```

```html
<div style="...info-balken...">
    <span style="color:#aaa;font-size:13px;">Beschreibungstext</span>
    <span style="font-weight:bold;color:#ffd700;">💰 1250 Gold</span>
</div>
```

---

## 8. Titel-Zeile (Header)

```css
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 16px;
```

```html
<div style="...header...">
    <div style="font-weight:800; font-size:22px; color:<AKZENT>;">
        🌱 Fenster-Titel
    </div>
    <button style="...close-button...">✕</button>
</div>
```

---

## 9. Feedback-Nachrichten

```css
/* Erfolg */
background: rgba(34,197,94,0.15);
border: 1px solid #22c55e;
color: #22c55e;
padding: 8px 12px;
border-radius: 8px;
font-size: 13px;
font-weight: bold;
text-align: center;
transition: opacity 0.3s;

/* Fehler */
background: rgba(233,69,96,0.15);
border: 1px solid #e94560;
color: #e94560;
```

---

## 10. Overlay / Backdrop

```css
/* Hinter dem Panel */
position: fixed;
inset: 0;
z-index: 12000;
display: flex;
align-items: center;
justify-content: center;
background: rgba(2,14,26,0.93);
backdrop-filter: blur(6px);
```

---

## 11. Grid-Layouts

### Karten-Grid (z.B. Hub-Menü)
```css
display: grid;
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 10px;
```

### Slot-Grid (z.B. Inventar)
```css
display: grid;
grid-template-columns: repeat(6, 1fr);
gap: 8px;
```

### Pflanz-Grid (z.B. Gärtnerei)
```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 8px;
```

---

## 12. Scrollbar-Styling

```css
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.2);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb {
    background: rgba(<AKZENT>, 0.4);
    border-radius: 3px;
}
```

---

## 13. Text-Hierarchie

| Zweck | Farbe | Größe | Gewicht |
|-------|-------|-------|---------|
| Titel | `<AKZENT>` oder `#fff` | 22px | 800 |
| Sub-Titel | `#fff` | 16px | bold |
| Normal-Text | `#cfe4ff` | 13-14px | normal |
| Sekundär | `#aaa` | 12-13px | normal |
| Deaktiviert | `#666` | 11px | normal |
| Preise (Gold) | `#ffd700` | 13px | bold |
| Fehler | `#e94560` | 12px | bold |
| Erfolg | `#22c55e` | 12px | bold |

---

## Die 7 goldenen Regeln

| # | Regel | Warum |
|---|-------|-------|
| 1 | **Dunkle Basis** (`#1a1a2e`) statt Weiss | Kontrast, Gaming-Feel |
| 2 | **Farbiger Glow** auf Panels | `box-shadow: 0 0 40px` → Neon-Effekt |
| 3 | **`rgba()` überall** statt harter Farben | Transparenz = Tiefe |
| 4 | **`border-radius: 10-16px`** | Alles ist abgerundet |
| 5 | **`transition: all 0.2s`** | Alles animiert smooth |
| 6 | **`linear-gradient(135deg, ...)`** | Diagonal-Gradient statt flat |
| 7 | **Pro Fenster eine Akzentfarbe** | Visuelle Identität pro Feature |

---

## Prompt für den anderen Agent

Kopiere diesen Prompt und gib ihn dem Agent:

> **Erstelle alle UI-Fenster im "Dark Glassmorphism Gaming"-Stil:**
>
> - Dunkler Hintergrund mit `linear-gradient(135deg, #1a1a2e, #16213e)`
> - Jedes Fenster bekommt eine eigene Akzentfarbe (z.B. Grün für Natur, Rot für Kampf, Lila für Magie, Gold für Handel)
> - Panel: `border: 3px solid <Akzent>` + `box-shadow: 0 0 40px rgba(<Akzent>, 0.4)` für den Glow
> - `border-radius: 16px` am Container, `8-10px` an inneren Elementen
> - Halbtransparente Hintergründe mit `rgba(255,255,255,0.08)` für Infoboxen
> - Alles hat `transition: all 0.2s` für smooth Hover-Effekte
> - Hover-Effekt: `translateY(-2px)` + verstärkter Glow-Schatten
> - Buttons mit `linear-gradient(135deg, ...)` statt flacher Farbe
> - System-Font: `'Segoe UI', Arial, sans-serif`
> - Farb-Hierarchie: Weiss für Titel, `#aaa` für Sekundärtext, `#666` für Deaktiviertes
> - Close-Button: Runder roter Kreis mit ✕ (`background: #e94560; border-radius: 50%; width: 32px`)
> - Tabs: Inaktiv = halbtransparent, Aktiv = Akzentfarbe als Hintergrund
> - Scrollbars: Dünn (6px), dunkel, mit Akzentfarbe als Thumb
> - Overlay hinter Panels: `background: rgba(2,14,26,0.93); backdrop-filter: blur(6px)`
> - Slots: Leer = `border: 2px dashed`, Gefüllt = `border: 2px solid` mit innerem Glow
> - Grid-Layouts für Karten/Items mit `gap: 8-12px`
> - Emoji-Icons (🌱⚔️✨💰) als visuelle Marker in Titeln

---

## Vollständiges Beispiel: Ein Panel von Grund auf

```javascript
function createMyPanel() {
    const ACCENT = '#e94560';

    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 3px solid ${ACCENT};
        border-radius: 16px;
        padding: 24px;
        min-width: 500px;
        max-width: 600px;
        max-height: 85vh;
        overflow-y: auto;
        z-index: 10001;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #fff;
        box-shadow: 0 0 40px rgba(233, 69, 96, 0.4);
    `;

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="font-weight:800;font-size:22px;color:${ACCENT};">
                ⚔️ Mein Fenster
            </div>
            <button onclick="this.closest('div[style]').remove()" style="
                background:${ACCENT};border:none;color:white;
                width:32px;height:32px;border-radius:50%;
                cursor:pointer;font-size:18px;font-weight:bold;
            ">✕</button>
        </div>

        <!-- Info-Balken -->
        <div style="
            background:rgba(255,255,255,0.08);
            padding:10px 16px;border-radius:8px;
            margin-bottom:14px;display:flex;
            justify-content:space-between;align-items:center;
        ">
            <span style="color:#aaa;font-size:13px;">Beschreibung</span>
            <span style="font-weight:bold;color:#ffd700;">💰 500 Gold</span>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button style="
                background:${ACCENT};border:1px solid ${ACCENT};
                color:#fff;padding:8px 14px;border-radius:8px;
                font-size:13px;font-weight:bold;cursor:pointer;
            ">Tab 1</button>
            <button style="
                background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,255,255,0.15);
                color:#aaa;padding:8px 14px;border-radius:8px;
                font-size:13px;cursor:pointer;
            ">Tab 2</button>
        </div>

        <!-- Grid mit Karten -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            <div style="
                background:rgba(233,69,96,0.1);
                border:2px solid ${ACCENT};
                border-radius:10px;padding:12px;
                text-align:center;
                box-shadow:0 0 8px rgba(233,69,96,0.4);
                cursor:pointer;transition:all 0.2s;
            ">
                <div style="font-size:22px;margin-bottom:4px;">⚔️</div>
                <div style="font-size:13px;font-weight:bold;">Item Name</div>
                <div style="font-size:11px;color:#aaa;">Beschreibung</div>
            </div>
            <div style="
                background:rgba(255,255,255,0.04);
                border:2px dashed rgba(255,255,255,0.15);
                border-radius:10px;padding:12px;
                text-align:center;color:#666;
            ">
                <div style="font-size:22px;margin-bottom:4px;">+</div>
                <div style="font-size:11px;">Leerer Slot</div>
            </div>
        </div>

        <!-- Action Button -->
        <button style="
            background:linear-gradient(135deg, ${ACCENT} 0%, #c0392b 100%);
            border:none;color:white;padding:10px 24px;
            border-radius:8px;font-weight:bold;font-size:14px;
            cursor:pointer;width:100%;margin-top:16px;
            transition:all 0.2s;
        ">Aktion ausführen</button>
    `;

    document.body.appendChild(container);
}
```
