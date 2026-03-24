# 🏠 VuokraAppi v2.0

Moderni React Native -sovellus vuokra-asuntojen hallintaan ja etsimiseen.

## ✨ Uusi Arkkitehtuuri

Täysin uudelleen rakennettu puhtaalla, modulaarisella arkkitehtuurilla.

### 📂 Projektirakenne

```
VuokraAppi/
├── src/
│   ├── components/          # Uudelleenkäytettävät komponentit
│   │   └── common/         # Button, Input, Card...
│   ├── screens/            # Näyttöruudut
│   │   ├── auth/          # Kirjautuminen, rekisteröinti
│   │   ├── tenant/        # Vuokralaisen näkymät
│   │   └── landlord/      # Vuokranantajan näkymät
│   ├── navigation/         # React Navigation
│   ├── services/          # API-kutsut
│   │   ├── apiClient.js   # HTTP client
│   │   ├── authService.js # Entra ID auth
│   │   └── userService.js # User API
│   ├── context/           # React Context (AuthContext)
│   ├── theme/             # Tyylit, värit, fontit
│   └── constants/         # Vakiot (API URLs jne.)
├── App.js                 # Pääkomponentti
└── package.json
```

## 🚀 Rekisteröintiflow

### 1️⃣ Kirjautuminen (WelcomeScreen)
- Käyttäjä painaa "Kirjaudu sisään / Rekisteröidy"
- Avataan Entra ID OAuth flow
- Käyttäjä kirjautuu Microsoft-tilillä
- Saadaan **access token**, **ID token** ja **refresh token**
- Tokenit tallennetaan **SecureStore**:een

### 2️⃣ Roolinvalinta (RoleSelectionScreen)
- Käyttäjä valitsee roolin: **Vuokralainen** tai **Vuokranantaja**
- Lähetetään `POST /users` backendiin:
  ```json
  {
    "id": "user-uuid-from-entra",
    "role": "tenant" // tai "landlord"
  }
  ```
- Backend luo käyttäjän ja tenant/landlord profiilin

### 3️⃣ Profiilin täyttö (CompleteProfileScreen)
- Käyttäjä täyttää henkilötiedot:
  - Etunimi
  - Sukunimi
  - Puhelinnumero
  - Sähköposti (valinnainen)
- Lähetetään `PATCH /users/{userId}` backendiin
- Siirrytään sovellukseen (TenantHome / LandlordHome)

## 🔐 Autentikointi

### Tokenit
- **Access Token** - API-kutsuihin
- **ID Token** - Käyttäjätiedot
- **Refresh Token** - Uuden access tokenin hakemiseen

### Storage
Kaikki tokenit tallennetaan turvallisesti **Expo SecureStore**:en:
- iOS: Keychain
- Android: EncryptedSharedPreferences

### AuthContext
Globaali auth-tila koko sovellukselle:
```javascript
const { 
  isAuthenticated,
  user,          // { id, role }
  profile,       // Käyttäjän kaikki tiedot
  signIn,
  register,
  updateProfile,
  signOut
} = useAuth();
```

## 🎨 UI/UX Parannukset

### Moderni Teema
- **Värit**: Rauhallinen sininen + harmaa paletti
- **Typografia**: Selkeät font-koot ja -painot
- **Spacing**: Yhtenäinen spacing-systeemi
- **Varjot**: Pehmeät, hienovaraiset varjostukset

### Komponentit
- ✅ **Button** - 4 varianttia (primary, secondary, outline, ghost)
- ✅ **Input** - Fokus-efektit, virheenkäsittely, ikonit
- ✅ **Card** - Painettava/ei-painettava, 3 varianttia

### Animaatiot
- Pehmeät siirtymät
- Loading states
- Interaktiiviset painikkeet

## 📱 Käyttöönotto

### 1. Asenna riippuvuudet
```bash
npm install
```

### 2. Päivitä Entra ID konfiguraatio
Muokkaa `src/constants/index.js`:
```javascript
export const ENTRA_CONFIG = {
  TENANT_ID: 'your-tenant-id',
  CLIENT_ID: 'your-client-id',
  // ...
};
```

### 3. Päivitä API URL
Muokkaa `src/constants/index.js`:
```javascript
export const API_BASE_URL = 'https://your-api.com';
```

### 4. Käynnistä
```bash
npm start
```

## 🔧 API Integraatio

### User Service
```javascript
import userService from './services/userService';

// Rekisteröinti
await userService.register(userId, 'tenant');

// Profiilin päivitys
await userService.updateProfile(userId, {
  firstName: 'Matti',
  lastName: 'Meikäläinen',
  phoneNumber: '+358401234567'
});

// Profiilin haku
const profile = await userService.getProfile(userId);
```

### API Client
Automaattinen error handling, token management:
```javascript
import apiClient from './services/apiClient';

// GET
const data = await apiClient.get('/apartments');

// POST
await apiClient.post('/apartments', apartmentData);

// PATCH
await apiClient.patch(`/users/${id}`, updates);
```

## 🎯 Seuraavat Vaiheet

Nyt kun rekisteröinti on valmis, voit lisätä:

1. **Asuntojen hallinta** (Landlord)
   - Lisää asunto
   - Muokkaa asuntoa
   - Poista asunto

2. **Asuntojen haku** (Tenant)
   - Selaa asuntoja
   - Swipe-toiminto
   - Suosikit

3. **Kartta**
   - Näytä asunnot kartalla
   - Filtteröinti

4. **Viestit**
   - Chat vuokranantajan kanssa

5. **Profiili**
   - Muokkaa tietoja
   - Asetukset

## 💡 Parhaita Käytäntöjä

### Error Handling
```javascript
try {
  const result = await someAsyncFunction();
  if (result.success) {
    // Success
  } else {
    Alert.alert('Virhe', result.error);
  }
} catch (error) {
  Alert.alert('Virhe', error.userMessage || error.message);
}
```

### Loading States
```javascript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await someAction();
  } finally {
    setLoading(false);
  }
};
```

### Validation
```javascript
const validateForm = () => {
  const errors = {};
  if (!value) errors.field = 'Required';
  setErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## 📝 Lisenssi

MIT

---

**Tehty ❤️:llä modernilla React Native arkkitehtuurilla**
