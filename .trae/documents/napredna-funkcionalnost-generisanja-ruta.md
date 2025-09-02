# Napredna Funkcionalnost Generisanja Ruta na Mapi

## 1. Pregled Projekta

Napredna funkcionalnost za generisanje ruta na mapi koja omogućava korisnicima da kreiraju prilagođene rute različitih oblika i dužina sa centrom u sredini prikazane mape. Sistem koristi inteligentne algoritme za mapiranje željenih oblika na stvarne puteve uz minimalno odstupanje od originalnog dizajna.

## 2. Ključne Funkcionalnosti

### 2.1 Korisnički Interfejs

**Glavne komponente:**

1. **Kontrolni Panel za Rutu** - centralizovani div element sa svim opcijama
2. **Selektor Dužine** - input polje sa slider kontrolom
3. **Selektor Oblika** - kombinacija predefinisanih dugmića i custom input polja
4. **Inteligentni Dropdown** - dinamički prijedlozi na osnovu unosa
5. **Dugme za Generisanje** - pokretanje algoritma
6. **Pregled Rute** - vizuelni prikaz generirane rute

### 2.2 Funkcionalnosti Modula

#### Modul za Dužinu Rute

* **Slider kontrola**: 1km - 50km sa korakom od 0.5km

* **Direktan unos**: numeričko polje sa validacijom

* **Predefinirane opcije**: 5km, 10km, 15km, 21km (polumaraton), 42km (maraton)

* **Jedinice**: automatska konverzija između km/milja

#### Modul za Oblik Rute

**Predefinisani oblici:**

* **Srce (❤️)**: romantična ruta za posebne prilike

* **Krug (⭕)**: klasična kružna ruta

* **Kvadrat (⬜)**: geometrijska ruta sa oštrim uglovima

* **Osmica (∞)**: ruta u obliku znaka beskonačnosti

* **Zvezda (⭐)**: petokraka ili šestokraka zvezda

**Custom oblici:**

* **Tekstualni opis**: "slovo A", "broj 8", "dijamant"

* **Emoji input**: direktan unos emoji simbola

* **Geometrijski opis**: "trougao", "šestougao", "spirala"

#### Inteligentni Dropdown Sistem

**Algoritam prepoznavanja:**

* **Fuzzy matching**: prepoznavanje sličnih termina

* **Sinonimi**: "krug" = "okrug" = "circle"

* **Kategorije**: geometrijski oblici, slova, brojevi, simboli

* **Popularnost**: rangiranje na osnovu čestine korišćenja

## 3. Tehnička Arhitektura

### 3.1 Komponente Sistema

```typescript
interface RouteGeneratorConfig {
  length: number; // u metrima
  shape: ShapeDefinition;
  center: LatLng;
  complexity: 'simple' | 'moderate' | 'complex';
  roadPreference: 'any' | 'paved' | 'trails';
}

interface ShapeDefinition {
  type: 'predefined' | 'custom';
  name: string;
  points: Point[];
  boundingBox: BoundingBox;
}
```

### 3.2 Algoritam Generisanja Oblika

**Korak 1: Kreiranje Osnovnog Oblika**

```typescript
class ShapeGenerator {
  generateHeartShape(radius: number): Point[] {
    // Parametrijska jednačina srca
    // x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
  }
  
  generateCircleShape(radius: number): Point[] {
    // Kružna parametrijska jednačina
    // x = r*cos(t), y = r*sin(t)
  }
  
  generateCustomShape(description: string): Point[] {
    // AI-powered shape recognition i generisanje
  }
}
```

**Korak 2: Skaliranje na Željenu Dužinu**

```typescript
class RouteScaler {
  scaleToDistance(points: Point[], targetDistance: number): Point[] {
    const currentPerimeter = this.calculatePerimeter(points);
    const scaleFactor = targetDistance / currentPerimeter;
    return points.map(p => p.scale(scaleFactor));
  }
}
```

**Korak 3: Mapiranje na Stvarne Puteve**

```typescript
class RoadMapper {
  async mapToRoads(points: Point[], center: LatLng): Promise<Route> {
    const roadNetwork = await this.getRoadNetwork(center, radius);
    const mappedPoints = [];
    
    for (const point of points) {
      const nearestRoad = this.findNearestRoad(point, roadNetwork);
      mappedPoints.push(nearestRoad.snapToRoad(point));
    }
    
    return this.optimizeRoute(mappedPoints);
  }
}
```

### 3.3 Optimizacija Algoritma

**Minimizacija Odstupanja:**

* **Weighted Distance**: balansiranje između oblika i puteva

* **Iterativno Poboljšanje**: postupno prilagođavanje rute

* **Constraint Satisfaction**: poštovanje ograničenja puteva

**Formula Optimizacije:**

```
Score = α * ShapeAccuracy + β * RoadQuality + γ * RouteNaturalness
```

Gde su:

* α = 0.4 (važnost oblika)

* β = 0.3 (kvalitet puteva)

* γ = 0.3 (prirodnost rute)

## 4. Dizajn Korisničkog Interfejsa

### 4.1 Layout Struktura

```html
<div class="route-generator-panel">
  <!-- Header -->
  <div class="panel-header">
    <h3>🗺️ Generator Ruta</h3>
    <button class="minimize-btn">−</button>
  </div>
  
  <!-- Dužina Rute -->
  <div class="length-section">
    <label>📏 Dužina Rute</label>
    <div class="length-controls">
      <input type="range" min="1" max="50" step="0.5" />
      <input type="number" placeholder="km" />
    </div>
    <div class="preset-distances">
      <button>5km</button>
      <button>10km</button>
      <button>21km</button>
    </div>
  </div>
  
  <!-- Oblik Rute -->
  <div class="shape-section">
    <label>🎨 Oblik Rute</label>
    <div class="predefined-shapes">
      <button class="shape-btn active">❤️</button>
      <button class="shape-btn">⭕</button>
      <button class="shape-btn">⬜</button>
      <button class="shape-btn">⭐</button>
    </div>
    <div class="custom-shape">
      <input type="text" placeholder="Opišite željeni oblik..." />
      <div class="suggestions-dropdown"></div>
    </div>
  </div>
  
  <!-- Napredne Opcije -->
  <div class="advanced-options">
    <details>
      <summary>⚙️ Napredne Opcije</summary>
      <div class="option-group">
        <label>Tip Puteva:</label>
        <select>
          <option>Svi putevi</option>
          <option>Asfaltni putevi</option>
          <option>Staze i trails</option>
        </select>
      </div>
    </details>
  </div>
  
  <!-- Akcije -->
  <div class="action-buttons">
    <button class="generate-btn">🚀 Generiši Rutu</button>
    <button class="preview-btn">👁️ Pregled</button>
  </div>
</div>
```

### 4.2 Stilizovanje

**Boje i Tema:**

* Primarna: #3B82F6 (plava)

* Sekundarna: #10B981 (zelena)

* Akcent: #F59E0B (narandžasta)

* Pozadina: #F8FAFC (svetlo siva)

**Animacije:**

* Smooth transitions (300ms ease-in-out)

* Hover efekti na dugmićima

* Loading spinner tokom generisanja

* Progress bar za kompleksne kalkulacije

## 5. Implementacijski Plan

### 5.1 Faza 1: Osnovna Infrastruktura (1-2 nedelje)

* Kreiranje osnovnih komponenti

* Implementacija UI layout-a

* Osnovna validacija input-a

* Integracija sa mapom

### 5.2 Faza 2: Algoritmi za Oblike (2-3 nedelje)

* Implementacija predefinisanih oblika

* Algoritam za skaliranje

* Osnovno mapiranje na puteve

* Unit testovi za algoritme

### 5.3 Faza 3: Inteligentni Sistem (2-3 nedelje)

* Custom shape recognition

* Inteligentni dropdown

* Optimizacija algoritma

* Performance tuning

### 5.4 Faza 4: Poliranje i Testiranje (1-2 nedelje)

* UI/UX poboljšanja

* Comprehensive testing

* Bug fixing

* Dokumentacija

## 6. Tehnički Zahtevi

### 6.1 Spoljašnje API-ji

* **Mapbox Directions API**: za routing između tačaka

* **Overpass API**: za podatke o putevima

* **Google Roads API**: za snap-to-road funkcionalnost

### 6.2 Performance Optimizacije

* **Web Workers**: za kompleksne kalkulacije

* **Caching**: čuvanje rezultata za popularne oblike

* **Lazy Loading**: učitavanje komponenti po potrebi

* **Debouncing**: za real-time pretragu

### 6.3 Kompatibilnost

* **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+

* **Mobile Responsive**: optimizovano za touch interfejs

* **Accessibility**: WCAG 2.1 AA compliance

## 7. Testiranje i Validacija

### 7.1 Unit Testovi

* Algoritmi za generisanje oblika

* Funkcije skaliranja i optimizacije

* Validacija input podataka

### 7.2 Integration Testovi

* API pozivi i response handling

* Mapiranje oblika na puteve

* End-to-end workflow

### 7.3 User Testing

* Usability testiranje sa realnim korisnicima

* Performance testiranje na različitim uređajima

* Accessibility testiranje

## 8. Buduća Proširenja

### 8.1 AI-Powered Features

* Machine learning za prepoznavanje oblika iz crteža

* Personalizovani prijedlozi na osnovu istorije

* Automatska optimizacija na osnovu feedback-a

### 8.2 Socijalne Funkcionalnosti

* Dijeljenje kreiraih ruta

* Community galerija oblika

* Rating i review sistem

### 8.3 Napredne Opcije

* 3D vizualizacija ruta

* Elevation profil integration

* Weather-aware routing

* Multi-activity support (trčanje, biciklizam, pešačenje)

