import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { jwtDecode } from 'jwt-decode';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '../../theme';
import { STORAGE_KEYS } from '../../constants';

/**
 * Profiilin täyttö - Tinder-tyylinen
 * Vain etunimi näkyy muille
 */
const CompleteProfileScreen = ({ route, navigation }) => {
  const role = route.params?.role;
  const { user, setUserRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  
  const [formData, setFormData] = useState({
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    gender: '',
    hasPet: null, // true/false/null
    bio: '', // Vapaa kuvaus
  });
  
  const [errors, setErrors] = useState({});
  
  // Ref:it automaattiseen siirtymiseen
  const monthInputRef = React.useRef(null);
  const yearInputRef = React.useRef(null);

  /**
   * Lataa käyttäjän tiedot tokenista
   */
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { idToken } = await authService.getTokens();
        if (idToken) {
          const decoded = jwtDecode(idToken);
          setUserInfo({
            firstName: decoded.given_name || '',
            lastName: decoded.family_name || '',
            email: decoded.email || decoded.preferred_username || '',
          });
        }
      } catch (error) {
        console.error('Error loading user info from token:', error);
      }
    };
    
    loadUserInfo();
  }, []);

  /**
   * Päivitä form-kenttä
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  /**
   * Valitse sukupuoli
   */
  const selectGender = (gender) => {
    updateField('gender', gender);
  };

  /**
   * Valitse lemmikki
   */
  const selectPet = (hasPet) => {
    updateField('hasPet', hasPet);
  };

  /**
   * Validoi lomake
   */
  const validateForm = () => {
    const newErrors = {};

    // Syntymäaika - tarkista että kaikki kentät täytetty
    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear) {
      newErrors.dateOfBirth = 'Täytä syntymäaika kokonaan';
    } else {
      const day = parseInt(formData.birthDay);
      const month = parseInt(formData.birthMonth);
      const year = parseInt(formData.birthYear);
      
      // Tarkista että numerot ovat järkeviä
      if (day < 1 || day > 31) {
        newErrors.dateOfBirth = 'Päivä on 1-31 välillä';
      } else if (month < 1 || month > 12) {
        newErrors.dateOfBirth = 'Kuukausi on 1-12 välillä';
      } else if (year < 1900 || year > new Date().getFullYear()) {
        newErrors.dateOfBirth = 'Tarkista vuosi';
      } else {
        // Tarkista että päivämäärä on validi
        const birthDate = new Date(year, month - 1, day);
        
        if (birthDate.getDate() !== day || birthDate.getMonth() + 1 !== month) {
          newErrors.dateOfBirth = 'Virheellinen päivämäärä';
        } else if (birthDate > new Date()) {
          newErrors.dateOfBirth = 'Syntymäaika ei voi olla tulevaisuudessa';
        } else {
          // Tarkista ikä
          const age = (new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
          if (age < 18) {
            newErrors.dateOfBirth = 'Sinun täytyy olla vähintään 18-vuotias';
          } else if (age > 120) {
            newErrors.dateOfBirth = 'Tarkista syntymäaika';
          }
        }
      }
    }

    // Sukupuoli
    if (!formData.gender) {
      newErrors.gender = 'Valitse sukupuoli';
    }

    // Lemmikki
    if (formData.hasPet === null) {
      newErrors.hasPet = 'Valitse onko lemmikkiä';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Lähetä profiilitiedot
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Tarkista kentät', 'Täytä pakolliset kentät oikein');
      return;
    }

    if (!user?.id || !role) {
      Alert.alert('Virhe', 'Käyttäjätietoja puuttuu. Kirjaudu sisään uudelleen.');
      return;
    }

    setLoading(true);

    try {
      // Muunna päivämäärä ISO muotoon backendille
      const isoDate = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`; // YYYY-MM-DD

      const profileData = {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        dateOfBirth: isoDate,
        gender: formData.gender,
        hasPet: formData.hasPet,
        bio: formData.bio.trim() || null,
      };

      console.log('📝 Saving profile data locally...');
      console.log('Profile data:', profileData);
      
      // Tallenna profiilidata SecureStoreen (API Gateway ongelma)
      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER_PROFILE, 
        JSON.stringify(profileData)
      );

      // Tallenna rooli AuthContextiin (päivittää user.role, joka käynnistää navigoinnin)
      const roleResult = await setUserRole(user.id, role);
      if (!roleResult.success) {
        throw new Error(roleResult.error || 'Roolin tallennus epäonnistui');
      }

      console.log('✅ Profile saved locally, role set to:', role);

      // AuthContext päivittyy jo setUserRole-kutsusta, joten AppNavigator on
      // vaihtanut näkymän taustalla ennen kuin tämä Alert edes ehtii näkyä.
      // Alert vaatii käyttäjän oman "OK"-painalluksen sulkeutuakseen.
      Alert.alert(
        'Tervetuloa!',
        `Hei ${userInfo.firstName}! 🎉`
      );
    } catch (error) {
      console.error('❌ Profile submit error:', error);
      Alert.alert('Virhe', 'Profiilin tallennus epäonnistui: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={CommonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Hei {userInfo.firstName}! 👋</Text>
            <Text style={styles.subtitle}>
              Kerro meille vielä hieman itsestäsi
            </Text>
          </View>

          {/* Lomake */}
          <View style={styles.form}>
            {/* Syntymäaika - 3 kenttää */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Syntymäaika <Text style={styles.required}>*</Text>
              </Text>
              
              <View style={styles.dateInputContainer}>
                <View style={styles.dateInputWrapper}>
                  <Input
                    placeholder="PP"
                    value={formData.birthDay}
                    onChangeText={(value) => {
                      // Salli vain numerot, max 2 merkkiä
                      if (value.length <= 2 && /^\d*$/.test(value)) {
                        updateField('birthDay', value);
                        // Siirry kuukausi-kenttään kun 2 numeroa täytetty
                        if (value.length === 2) {
                          monthInputRef.current?.focus();
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.dateInput}
                  />
                </View>
                
                <Text style={styles.dateSeparator}>/</Text>
                
                <View style={styles.dateInputWrapper}>
                  <Input
                    ref={monthInputRef}
                    placeholder="KK"
                    value={formData.birthMonth}
                    onChangeText={(value) => {
                      // Salli vain numerot, max 2 merkkiä
                      if (value.length <= 2 && /^\d*$/.test(value)) {
                        updateField('birthMonth', value);
                        // Siirry vuosi-kenttään kun 2 numeroa täytetty
                        if (value.length === 2) {
                          yearInputRef.current?.focus();
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.dateInput}
                  />
                </View>
                
                <Text style={styles.dateSeparator}>/</Text>
                
                <View style={[styles.dateInputWrapper, { flex: 1.5 }]}>
                  <Input
                    ref={yearInputRef}
                    placeholder="VVVV"
                    value={formData.birthYear}
                    onChangeText={(value) => {
                      // Salli vain numerot, max 4 merkkiä
                      if (value.length <= 4 && /^\d*$/.test(value)) {
                        updateField('birthYear', value);
                        // Sulje näppäimistö kun 4 numeroa täytetty
                        if (value.length === 4) {
                          Keyboard.dismiss();
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.dateInput}
                  />
                </View>
              </View>
              
              {errors.dateOfBirth && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                </View>
              )}
            </View>

            {/* Sukupuoli */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Sukupuoli <Text style={styles.required}>*</Text>
              </Text>
              
              <View style={styles.optionButtons}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    formData.gender === 'male' && styles.optionButtonSelected,
                  ]}
                  onPress={() => selectGender('male')}
                >
                  <Feather
                    name="user"
                    size={24}
                    color={formData.gender === 'male' ? Colors.primary.main : Colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.gender === 'male' && styles.optionButtonTextSelected,
                    ]}
                  >
                    Mies
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    formData.gender === 'female' && styles.optionButtonSelected,
                  ]}
                  onPress={() => selectGender('female')}
                >
                  <Feather
                    name="user"
                    size={24}
                    color={formData.gender === 'female' ? Colors.primary.main : Colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.gender === 'female' && styles.optionButtonTextSelected,
                    ]}
                  >
                    Nainen
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    formData.gender === 'other' && styles.optionButtonSelected,
                  ]}
                  onPress={() => selectGender('other')}
                >
                  <Feather
                    name="users"
                    size={24}
                    color={formData.gender === 'other' ? Colors.primary.main : Colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.gender === 'other' && styles.optionButtonTextSelected,
                    ]}
                  >
                    Muu
                  </Text>
                </TouchableOpacity>
              </View>

              {errors.gender && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.gender}</Text>
                </View>
              )}
            </View>

            {/* Lemmikki */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Onko sinulla lemmikkiä? <Text style={styles.required}>*</Text>
              </Text>
              
              <View style={styles.optionButtons}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { flex: 1 },
                    formData.hasPet === true && styles.optionButtonSelected,
                  ]}
                  onPress={() => selectPet(true)}
                >
                  <Feather
                    name="check-circle"
                    size={24}
                    color={formData.hasPet === true ? Colors.primary.main : Colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.hasPet === true && styles.optionButtonTextSelected,
                    ]}
                  >
                    Kyllä
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { flex: 1 },
                    formData.hasPet === false && styles.optionButtonSelected,
                  ]}
                  onPress={() => selectPet(false)}
                >
                  <Feather
                    name="x-circle"
                    size={24}
                    color={formData.hasPet === false ? Colors.primary.main : Colors.text.muted}
                  />
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.hasPet === false && styles.optionButtonTextSelected,
                    ]}
                  >
                    Ei
                  </Text>
                </TouchableOpacity>
              </View>

              {errors.hasPet && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.hasPet}</Text>
                </View>
              )}
            </View>

            {/* Vapaa kuvaus */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Kerro itsestäsi (valinnainen)
              </Text>
              <Input
                placeholder="Esim. tykkään ulkoilusta, rakastan koiria..."
                value={formData.bio}
                onChangeText={(value) => updateField('bio', value)}
                multiline
                numberOfLines={4}
                style={styles.bioInput}
                inputStyle={styles.bioInputText}
                maxLength={500}
              />
              <Text style={styles.charCount}>
                {formData.bio.length}/500
              </Text>
            </View>
          </View>

          {/* Painike */}
          <Button
            fullWidth
            onPress={handleSubmit}
            loading={loading}
            icon="check"
          >
            Valmis
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  
  header: {
    marginBottom: Spacing.xl,
  },
  
  title: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
  },
  
  form: {
    marginBottom: Spacing.lg,
  },
  
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  
  required: {
    color: Colors.error,
  },
  
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  
  dateInputWrapper: {
    flex: 1,
  },
  
  dateInput: {
    marginBottom: 0,
  },
  
  dateSeparator: {
    fontSize: Typography.size.xl,
    color: Colors.text.muted,
    fontWeight: Typography.weight.bold,
    marginTop: -Spacing.base,
  },
  
  optionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  
  optionButton: {
    flex: 1,
    backgroundColor: Colors.input.background,
    borderWidth: 2,
    borderColor: Colors.input.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  optionButtonSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.main + '10',
  },
  
  optionButtonText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
  
  optionButtonTextSelected: {
    color: Colors.primary.main,
    fontWeight: Typography.weight.semibold,
  },
  
  bioInput: {
    marginBottom: 0,
  },
  
  bioInputText: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  
  charCount: {
    fontSize: Typography.size.xs,
    color: Colors.text.light,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.error,
    marginLeft: Spacing.xs,
  },
});

export default CompleteProfileScreen;