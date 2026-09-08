import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Colors, Typography, Spacing, CommonStyles } from '../../theme';
import apartmentService from '../../services/apartmentService';

// AI-agentti palauttaa joskus JSON:in markdown-koodilohkossa (```json ... ```)
const stripCodeFence = (str) =>
  str.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

const INITIAL_FORM = {
  streetAddress: '',
  zipcode: '',
  city: '',
  region: '',
  size: '',
  rent: '',
  latitude: '',
  longitude: '',
  rooms: '',
  floor: '',
  buildYear: '',
  additionalInfo: '',
};

// ---------------------------------------------------------------------------
// Kuvakomponentti yksittäiselle kuvalle
// ---------------------------------------------------------------------------
const ImageTile = ({ image, onDelete, onSetPrimary, uploading }) => (
  <View style={styles.imageTile}>
    <Image source={{ uri: image.uri ?? image.url }} style={styles.tileImg} />
    {image.isPrimary && (
      <View style={styles.primaryBadge}>
        <Feather name="star" size={10} color="#fff" />
      </View>
    )}
    {uploading ? (
      <View style={styles.tileOverlay}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    ) : (
      <View style={styles.tileActions}>
        {!image.isPrimary && image.id && (
          <TouchableOpacity style={styles.tileBtn} onPress={() => onSetPrimary(image)}>
            <Feather name="star" size={14} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.tileBtn, styles.tileBtnDelete]} onPress={() => onDelete(image)}>
          <Feather name="x" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Pääkomponentti
// ---------------------------------------------------------------------------
const AddApartmentScreen = ({ navigation, route }) => {
  const existing = route?.params?.apartment ?? null;

  const [form, setForm] = useState(
    existing
      ? {
          streetAddress: existing.streetAddress ?? '',
          zipcode: existing.zipcode ?? '',
          city: existing.city ?? '',
          region: existing.region ?? '',
          size: existing.size?.toString() ?? '',
          rent: existing.rent?.toString() ?? '',
          latitude: existing.latitude?.toString() ?? '',
          longitude: existing.longitude?.toString() ?? '',
          rooms: '',
          floor: '',
          buildYear: '',
          additionalInfo: '',
        }
      : INITIAL_FORM
  );

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Kuvat: { id?, uri, url?, isPrimary?, uploading? }
  const [images, setImages] = useState([]);
  const [savedApartmentId, setSavedApartmentId] = useState(existing?.id ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(!!existing?.latitude);
  const geocodeTimer = useRef(null);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    // Käynnistä geokoodaus kun osoitetietoja muutetaan
    if (['streetAddress', 'zipcode', 'city'].includes(key)) {
      setGeocoded(false);
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeTimer.current = setTimeout(() => triggerGeocode({ ...form, [key]: val }), 1200);
    }
  };

  const triggerGeocode = useCallback(async (currentForm) => {
    const { streetAddress, zipcode, city } = currentForm;
    if (!streetAddress.trim() || !city.trim()) return;

    setGeocoding(true);
    try {
      const query = encodeURIComponent(`${streetAddress.trim()}, ${zipcode.trim()} ${city.trim()}, Finland`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'fi', 'User-Agent': 'VuokraAppi/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const region = data[0].address?.state ?? data[0].address?.county ?? '';
        setForm((f) => ({ ...f, latitude: data[0].lat, longitude: data[0].lon, region }));
        setGeocoded(true);
      } else {
        setGeocoded(false);
      }
    } catch {
      setGeocoded(false);
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Lataa olemassaolevat kuvat muokkaustilassa
  useEffect(() => {
    if (existing?.id) {
      apartmentService.getImages(existing.id).then((imgs) => {
        setImages(imgs.map((img) => ({ ...img, uri: img.url })));
      }).catch(() => {
        // Blob Storage ei ole konfiguroitu backendissä vielä
      });
    }
  }, [existing?.id]);

  // ---------------------------------------------------------------------------
  // Validointi & tallennus
  // ---------------------------------------------------------------------------
  const validate = () => {
    const required = ['streetAddress', 'zipcode', 'city', 'size', 'rent'];
    for (const k of required) {
      if (!form[k].trim()) {
        Alert.alert('Puuttuvia tietoja', 'Täytä osoite, postinumero, kaupunki, koko ja vuokra.');
        return false;
      }
    }
    if (!/^\d{5}$/.test(form.zipcode)) {
      Alert.alert('Virheellinen postinumero', 'Postinumeron tulee olla 5 numeroa.');
      return false;
    }
    if (!form.latitude || !form.longitude || !form.region) {
      Alert.alert('Sijainti puuttuu', 'Odota että sijainti haetaan osoitteen perusteella, tai tarkista osoitetiedot.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        streetAddress: form.streetAddress.trim(),
        zipcode: form.zipcode.trim(),
        city: form.city.trim(),
        region: form.region,
        size: parseFloat(form.size),
        rent: parseFloat(form.rent),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };

      console.log('📦 Apartment payload:', JSON.stringify(payload));
      let apartmentId = savedApartmentId;
      if (existing) {
        await apartmentService.updateApartment(existing.id, payload);
        Alert.alert('Tallennettu', 'Kohde päivitetty.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const created = await apartmentService.createApartment(payload);
        apartmentId = created.id;
        setSavedApartmentId(apartmentId);
        Alert.alert('Lisätty', 'Kohde luotu. Voit nyt lisätä kuvia.', [{ text: 'OK' }]);
      }
    } catch (e) {
      Alert.alert('Virhe', e.userMessage ?? 'Tallennus epäonnistui.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Kuvat
  // ---------------------------------------------------------------------------
  const pickImages = useCallback(async () => {
    console.log('📸 pickImages, savedApartmentId:', savedApartmentId);

    if (!savedApartmentId) {
      Alert.alert('Tallenna ensin', 'Tallenna kohde ennen kuvien lisäämistä.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('📸 Permission status:', status);
    if (status !== 'granted') {
      Alert.alert('Lupa puuttuu', 'Salli kuvagallerian käyttö asetuksista.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    console.log('📸 Picker result canceled:', result.canceled);
    if (result.canceled) return;

    for (const asset of result.assets) {
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      setImages((prev) => [...prev, { tempId, uri: asset.uri, uploading: true }]);
      try {
        const uploaded = await apartmentService.uploadImage(savedApartmentId, asset);
        setImages((prev) =>
          prev.map((img) =>
            img.tempId === tempId ? { ...uploaded, uri: uploaded.url } : img
          )
        );
      } catch (e) {
        setImages((prev) => prev.filter((img) => img.tempId !== tempId));
        const msg = e.status === 500
          ? 'Kuvien tallennus ei ole vielä käytössä (Azure Blob Storage ei ole konfiguroitu).'
          : e.userMessage ?? 'Kuvan lataus epäonnistui.';
        Alert.alert('Kuvat ei saatavilla', msg);
      }
    }
  }, [savedApartmentId]);

  const handleDeleteImage = useCallback((image) => {
    if (!image.id) {
      setImages((prev) => prev.filter((img) => img !== image));
      return;
    }
    Alert.alert('Poista kuva', 'Haluatko varmasti poistaa tämän kuvan?', [
      { text: 'Peruuta', style: 'cancel' },
      {
        text: 'Poista',
        style: 'destructive',
        onPress: async () => {
          try {
            await apartmentService.deleteImage(savedApartmentId, image.id);
            setImages((prev) => prev.filter((img) => img.id !== image.id));
          } catch (e) {
            Alert.alert('Virhe', e.userMessage ?? 'Poisto epäonnistui.');
          }
        },
      },
    ]);
  }, [savedApartmentId]);

  const handleSetPrimary = useCallback(async (image) => {
    try {
      await apartmentService.setPrimaryImage(savedApartmentId, image.id);
      setImages((prev) =>
        prev.map((img) => ({ ...img, isPrimary: img.id === image.id }))
      );
    } catch (e) {
      Alert.alert('Virhe', e.userMessage ?? 'Asetus epäonnistui.');
    }
  }, [savedApartmentId]);

  // ---------------------------------------------------------------------------
  // AI-generointi
  // ---------------------------------------------------------------------------
  const handleGenerateListing = async () => {
    const aiRequired = ['zipcode', 'city', 'streetAddress', 'size', 'rooms', 'floor', 'buildYear'];
    for (const k of aiRequired) {
      if (!form[k]?.trim()) {
        Alert.alert(
          'Puuttuvia tietoja',
          'Täytä postinumero, kaupunki, osoite, koko, huoneluku, kerros ja rakennusvuosi.'
        );
        return;
      }
    }
    setGenerating(true);
    setAiResult(null);
    try {
      console.log('🤖 Generating listing...');
      const result = await apartmentService.generateListing({
        zipcode: form.zipcode.trim(),
        city: form.city.trim(),
        street_address: form.streetAddress.trim(),
        rooms: parseInt(form.rooms),
        size: parseFloat(form.size),
        floor: parseInt(form.floor),
        build_year: parseInt(form.buildYear),
        additional_info: form.additionalInfo.trim() || undefined,
      });
      const parsed = typeof result === 'string' ? JSON.parse(stripCodeFence(result)) : result;
      console.log('🤖 Result parsed:', parsed?.listingText?.substring(0, 50));
      setAiResult(parsed);
      if (parsed.rentSuggestion?.recommended) {
        setForm((f) => ({ ...f, rent: parsed.rentSuggestion.recommended.toString() }));
      }
    } catch (e) {
      console.error('🤖🔥 AI generation raw error:', e, 'name:', e?.name, 'message:', e?.message, 'status:', e?.status);
      Alert.alert('Virhe', e.userMessage ?? 'AI-generointi epäonnistui.');
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={CommonStyles.container}>
      <KeyboardAvoidingView
        style={CommonStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{existing ? 'Muokkaa kohdetta' : 'Lisää kohde'}</Text>
        </View>

        {/* Sijaintitiedot */}
        <Text style={styles.section}>Sijaintitiedot</Text>
        <Input
          label="Katuosoite"
          value={form.streetAddress}
          onChangeText={set('streetAddress')}
          placeholder="Fleminginkatu 12"
          icon="map-pin"
        />
        <Input
          label="Postinumero"
          value={form.zipcode}
          onChangeText={set('zipcode')}
          placeholder="00530"
          keyboardType="numeric"
          maxLength={5}
          icon="hash"
        />
        <Input
          label="Kaupunki"
          value={form.city}
          onChangeText={set('city')}
          placeholder="Helsinki"
          icon="navigation"
        />
        <Input
          label="Maakunta"
          value={form.region}
          onChangeText={set('region')}
          placeholder="Uusimaa (valinnainen)"
          icon="map"
        />

        {/* Kohteen tiedot */}
        {/* Koordinaatti-indikaattori */}
        <View style={styles.geoRow}>
          {geocoding ? (
            <>
              <ActivityIndicator size="small" color={Colors.primary.main} />
              <Text style={styles.geoText}>Haetaan sijaintia...</Text>
            </>
          ) : geocoded ? (
            <>
              <Feather name="check-circle" size={14} color={Colors.success ?? '#22C55E'} />
              <Text style={[styles.geoText, { color: Colors.success ?? '#22C55E' }]}>Sijainti löydetty</Text>
            </>
          ) : (
            <>
              <Feather name="map-pin" size={14} color={Colors.text.muted} />
              <Text style={styles.geoText}>Täytä osoite hakemaan sijainti</Text>
            </>
          )}
        </View>

        <Text style={styles.section}>Kohteen tiedot</Text>
        <Input
          label="Koko (m²)"
          value={form.size}
          onChangeText={set('size')}
          placeholder="42.5"
          keyboardType="decimal-pad"
          icon="maximize"
        />
        <Input
          label="Vuokra (€/kk)"
          value={form.rent}
          onChangeText={set('rent')}
          placeholder="1050"
          keyboardType="decimal-pad"
          icon="credit-card"
        />

        {/* Tallenna-nappi */}
        <Button onPress={handleSave} disabled={saving} icon="save" style={styles.saveBtn}>
          {saving ? 'Tallennetaan...' : existing ? 'Tallenna muutokset' : 'Luo kohde'}
        </Button>

        {/* Kuvat — näkyy kun kohde on tallennettu */}
        {savedApartmentId && (
          <>
            <Text style={styles.section}>Kuvat</Text>
            <View style={styles.imageGrid}>
              {images.map((img, idx) => (
                <ImageTile
                  key={img.id ?? img.tempId ?? idx}
                  image={img}
                  uploading={img.uploading}
                  onDelete={handleDeleteImage}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
              <TouchableOpacity style={styles.addImageTile} onPress={pickImages}>
                <Feather name="plus" size={28} color={Colors.primary.main} />
                <Text style={styles.addImageText}>Lisää kuvia</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHint}>
              Paina ★ asettaaksesi kansikuvan. Max 10 MB per kuva (JPEG, PNG, WebP).
            </Text>
          </>
        )}

        {/* AI-osio */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Feather name="zap" size={18} color={Colors.primary.main} />
            <Text style={styles.aiTitle}>AI-vuokrailmoitus</Text>
          </View>
          <Text style={styles.aiSubtitle}>
            Täytä lisätiedot niin AI generoi ilmoitustekstin ja vuokraehdotuksen.
          </Text>

          <Input
            label="Huoneluku"
            value={form.rooms}
            onChangeText={set('rooms')}
            placeholder="2"
            keyboardType="numeric"
            icon="grid"
          />
          <Input
            label="Kerros"
            value={form.floor}
            onChangeText={set('floor')}
            placeholder="3"
            keyboardType="numeric"
            icon="layers"
          />
          <Input
            label="Rakennusvuosi"
            value={form.buildYear}
            onChangeText={set('buildYear')}
            placeholder="1965"
            keyboardType="numeric"
            icon="calendar"
          />
          <Input
            label="Lisätiedot (valinnainen)"
            value={form.additionalInfo}
            onChangeText={set('additionalInfo')}
            placeholder="sauna, parveke, hissi"
            icon="info"
            multiline
          />

          <Button
            variant="outline"
            onPress={handleGenerateListing}
            icon="zap"
            disabled={generating}
            style={styles.aiBtn}
          >
            {generating ? 'Generoidaan...' : 'Generoi AI-ilmoitus'}
          </Button>

          {generating && (
            <ActivityIndicator size="small" color={Colors.primary.main} style={styles.spinner} />
          )}

          {aiResult && (
            <View style={styles.aiResult}>
              {aiResult.rentSuggestion && (
                <View style={styles.rentBox}>
                  <Text style={styles.rentLabel}>Vuokraehdotus</Text>
                  <Text style={styles.rentValue}>
                    {aiResult.rentSuggestion.min}–{aiResult.rentSuggestion.max} €/kk
                  </Text>
                  <Text style={styles.rentRecommended}>
                    Suositus: {aiResult.rentSuggestion.recommended} €/kk
                  </Text>
                  {aiResult.rentSuggestion.reasoning && (
                    <Text style={styles.rentReasoning}>{aiResult.rentSuggestion.reasoning}</Text>
                  )}
                </View>
              )}
              {aiResult.listingText && (
                <View style={styles.listingBox}>
                  <Text style={styles.rentLabel}>Ilmoitusteksti — muokkaa vapaasti</Text>
                  <Input
                    value={aiResult.listingText}
                    onChangeText={(val) => setAiResult((r) => ({ ...r, listingText: val }))}
                    multiline
                    inputStyle={styles.listingTextInput}
                  />
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const TILE_SIZE = 100;

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    marginRight: Spacing.base,
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  section: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    marginTop: Spacing.xl,
  },
  geoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  geoText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginLeft: 4,
  },

  // Kuvat
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  imageTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.border ?? '#E5E7EB',
  },
  tileImg: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.primary.main,
    borderRadius: 10,
    padding: 3,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  tileBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 4,
  },
  tileBtnDelete: {
    backgroundColor: 'rgba(220,38,38,0.75)',
  },
  addImageTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary.main + '50',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    fontSize: Typography.size.xs,
    color: Colors.primary.main,
    fontWeight: Typography.weight.semibold,
  },
  imageHint: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: Spacing.sm,
  },

  // AI
  aiSection: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface ?? '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.main + '30',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  aiTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.primary.main,
    marginLeft: Spacing.xs,
  },
  aiSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginBottom: Spacing.base,
  },
  aiBtn: {
    marginTop: Spacing.sm,
  },
  spinner: {
    marginTop: Spacing.base,
  },
  aiResult: {
    marginTop: Spacing.lg,
    gap: Spacing.base,
  },
  rentBox: {
    backgroundColor: Colors.primary.main + '10',
    padding: Spacing.base,
    borderRadius: 8,
  },
  listingBox: {
    backgroundColor: Colors.background ?? '#fff',
    padding: Spacing.base,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border ?? '#E5E7EB',
  },
  rentLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  rentValue: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.primary.main,
  },
  rentRecommended: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary ?? Colors.text.muted,
    marginTop: Spacing.xs,
  },
  rentReasoning: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  listingText: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  listingTextInput: {
    fontSize: Typography.size.sm,
    lineHeight: 22,
    minHeight: 160,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
});

export default AddApartmentScreen;
