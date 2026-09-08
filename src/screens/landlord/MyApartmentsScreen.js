import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, CommonStyles } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import apartmentService from '../../services/apartmentService';

const ApartmentCard = ({ apartment, onEdit, onDelete }) => (
  <View style={styles.card}>
    <View style={styles.cardThumb}>
      {apartment.thumbnailUrl ? (
        <Image source={{ uri: apartment.thumbnailUrl }} style={styles.cardThumbImg} />
      ) : (
        <Feather name="image" size={20} color={Colors.text.muted} />
      )}
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardAddress}>{apartment.streetAddress}</Text>
      <Text style={styles.cardCity}>
        {apartment.zipcode} {apartment.city}
        {apartment.region ? `, ${apartment.region}` : ''}
      </Text>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="maximize" size={14} color={Colors.text.muted} />
          <Text style={styles.metaText}>{apartment.size} m²</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="credit-card" size={14} color={Colors.text.muted} />
          <Text style={styles.metaText}>{apartment.rent} €/kk</Text>
        </View>
      </View>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(apartment)}>
        <Feather name="edit-2" size={18} color={Colors.primary.main} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(apartment)}>
        <Feather name="trash-2" size={18} color={Colors.error ?? '#EF4444'} />
      </TouchableOpacity>
    </View>
  </View>
);

const MyApartmentsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const data = await apartmentService.getUserApartments(user.id);
      const withThumbnails = await Promise.all(
        (data ?? []).map(async (apartment) => {
          try {
            const images = await apartmentService.getImages(apartment.id);
            const primary = images.find((img) => img.isPrimary) ?? images[0];
            return { ...apartment, thumbnailUrl: primary?.url ?? null };
          } catch {
            return { ...apartment, thumbnailUrl: null };
          }
        })
      );
      setApartments(withThumbnails);
    } catch (e) {
      Alert.alert('Virhe', e.userMessage ?? 'Kohteiden lataus epäonnistui.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleEdit = (apartment) => {
    navigation.navigate('AddApartment', { apartment });
  };

  const handleDelete = (apartment) => {
    Alert.alert(
      'Poista kohde',
      `Haluatko varmasti poistaa kohteen ${apartment.streetAddress}?`,
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Poista',
          style: 'destructive',
          onPress: async () => {
            try {
              await apartmentService.deleteApartment(apartment.id);
              setApartments((prev) => prev.filter((a) => a.id !== apartment.id));
            } catch (e) {
              Alert.alert('Virhe', e.userMessage ?? 'Poisto epäonnistui.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[CommonStyles.container, CommonStyles.center]}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Omat kohteet</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddApartment')}
        >
          <Feather name="plus" size={22} color={Colors.primary.main} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={apartments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={apartments.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.main]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="home" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>Ei kohteita</Text>
            <Text style={styles.emptyText}>
              Lisää ensimmäinen vuokrakohteesi painamalla + nappia.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ApartmentCard
            apartment={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  empty: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.card ?? '#fff',
    borderRadius: 12,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.base,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.border ?? '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: Spacing.base,
  },
  cardThumbImg: {
    width: 56,
    height: 56,
  },
  cardBody: {
    flex: 1,
  },
  cardAddress: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  cardCity: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    padding: Spacing.sm,
  },
});

export default MyApartmentsScreen;
