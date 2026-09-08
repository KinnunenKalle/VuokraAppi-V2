import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const avatarColorFor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const TenantCard = ({ tenant, isTop, depth, onSwiped }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const likeOpacity = useRef(
    translateX.interpolate({ inputRange: [0, SCREEN_WIDTH / 4], outputRange: [0, 1], extrapolate: 'clamp' })
  ).current;
  const nopeOpacity = useRef(
    translateX.interpolate({ inputRange: [-SCREEN_WIDTH / 4, 0], outputRange: [1, 0], extrapolate: 'clamp' })
  ).current;
  const rotate = useRef(
    translateX.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-15deg', '0deg', '15deg'] })
  ).current;

  const onGestureEvent = useRef(
    Animated.event([{ nativeEvent: { translationX: translateX, translationY: translateY } }], { useNativeDriver: false })
  ).current;

  const swipeOff = useCallback((direction) => {
    const toValue = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(translateX, { toValue, duration: 200, useNativeDriver: false }).start(() => onSwiped());
  }, [onSwiped]);

  const onHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      if (translationX > SWIPE_THRESHOLD) swipeOff('right');
      else if (translationX < -SWIPE_THRESHOLD) swipeOff('left');
      else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
      }
    }
  }, [swipeOff]);

  return (
    <PanGestureHandler enabled={isTop} onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <Animated.View
        style={[styles.card, { zIndex: 10 - depth, transform: [{ translateX }, { translateY }, { rotate }] }]}
      >
        <View style={[styles.avatarBg, { backgroundColor: avatarColorFor(tenant.id) }]}>
          <Text style={styles.avatarInitial}>{tenant.firstName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.gradientOverlay} />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {isTop && (
            <>
              <Animated.View style={[styles.swipeOverlay, { opacity: nopeOpacity, transform: [{ rotate: '-30deg' }] }]}>
                <View style={[styles.swipeBadge, styles.nopeBadge]}>
                  <Text style={styles.swipeText}>OHITA</Text>
                </View>
              </Animated.View>
              <Animated.View style={[styles.swipeOverlay, { opacity: likeOpacity, transform: [{ rotate: '30deg' }] }]}>
                <View style={[styles.swipeBadge, styles.likeBadge]}>
                  <Text style={styles.swipeText}>LIKE</Text>
                </View>
              </Animated.View>
            </>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.title}>{tenant.firstName ?? 'Vuokralainen'}</Text>
              {tenant.age != null && <Text style={styles.ageText}>{tenant.age}</Text>}
              {tenant.identityVerified && (
                <Feather name="check-circle" size={18} color="#22C55E" style={{ marginLeft: 6 }} />
              )}
            </View>
            {tenant.occupation ? (
              <View style={styles.locationRow}>
                <Feather name="briefcase" size={14} color="#ffffff" />
                <Text style={styles.locationText}>{tenant.occupation}</Text>
              </View>
            ) : null}
            {tenant.introduction ? (
              <Text style={styles.introText} numberOfLines={3}>{tenant.introduction}</Text>
            ) : null}
            <View style={styles.detailsRow}>
              {tenant.monthlyIncome != null && (
                <View style={styles.detailBadge}>
                  <Feather name="dollar-sign" size={12} color="#ffffff" />
                  <Text style={styles.detailText}>{tenant.monthlyIncome} €/kk</Text>
                </View>
              )}
              <View style={styles.detailBadge}>
                <Feather name="heart" size={12} color="#ffffff" />
                <Text style={styles.detailText}>{tenant.pet ? tenant.pet : 'Ei lemmikkiä'}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const TenantDetailModal = ({ tenant, onClose }) => {
  if (!tenant) return null;
  return (
    <Modal visible={!!tenant} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.detailContainer} bounces={false}>
        <View style={[styles.gallery, { backgroundColor: avatarColorFor(tenant.id) }]}>
          <Text style={styles.avatarInitialLarge}>{tenant.firstName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailBody}>
          <View style={styles.nameRow}>
            <Text style={styles.detailTitle}>{tenant.firstName ?? 'Vuokralainen'}</Text>
            {tenant.age != null && <Text style={styles.detailAge}>{tenant.age}</Text>}
          </View>

          {tenant.identityVerified && (
            <View style={styles.detailStat}>
              <Feather name="check-circle" size={16} color={Colors.success ?? '#22C55E'} />
              <Text style={[styles.detailStatText, { color: Colors.success ?? '#22C55E' }]}>Vahvistettu henkilöllisyys</Text>
            </View>
          )}

          <View style={styles.detailStatsRow}>
            {tenant.occupation && (
              <View style={styles.detailStat}>
                <Feather name="briefcase" size={16} color={Colors.text.muted} />
                <Text style={styles.detailStatText}>{tenant.occupation}</Text>
              </View>
            )}
            {tenant.monthlyIncome != null && (
              <View style={styles.detailStat}>
                <Feather name="dollar-sign" size={16} color={Colors.text.muted} />
                <Text style={styles.detailStatText}>{tenant.monthlyIncome} €/kk</Text>
              </View>
            )}
          </View>

          <View style={styles.detailStatsRow}>
            <View style={styles.detailStat}>
              <Feather name="heart" size={16} color={Colors.text.muted} />
              <Text style={styles.detailStatText}>{tenant.pet ? `Lemmikki: ${tenant.pet}` : 'Ei lemmikkiä'}</Text>
            </View>
            {tenant.currentAddress && (
              <View style={styles.detailStat}>
                <Feather name="map-pin" size={16} color={Colors.text.muted} />
                <Text style={styles.detailStatText}>{tenant.currentAddress}</Text>
              </View>
            )}
          </View>

          {tenant.introduction && (
            <View style={styles.listingBox}>
              <Text style={styles.listingText}>{tenant.introduction}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};

const BrowseTenantsScreen = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailTenant, setDetailTenant] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const data = await userService.searchTenants(user.id, {});
        setTenants(data ?? []);
      } catch (e) {
        setError(e.userMessage ?? e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleSwiped = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="wifi-off" size={48} color={Colors.text.muted} />
        <Text style={styles.emptyTitle}>Yhteysvirhe</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  if (currentIndex >= tenants.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Feather name="users" size={64} color={Colors.text.muted} />
          <Text style={styles.emptyTitle}>
            {tenants.length === 0 ? 'Ei vuokralaisia' : 'Ei enempää vuokralaisia!'}
          </Text>
          <Text style={styles.emptyText}>
            {tenants.length === 0
              ? 'Vuokralaisia ei löytynyt vielä.'
              : 'Olet selannut kaikki vuokralaiset läpi.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.cardContainer}>
          {tenants.map((t, index) => {
            const depth = index - currentIndex;
            if (depth < 0 || depth > 1) return null;
            return (
              <TenantCard key={t.id} tenant={t} isTop={depth === 0} depth={depth} onSwiped={handleSwiped} />
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button variant="outline" onPress={handleSwiped} icon="x" style={styles.actionButton}>
            Ohita
          </Button>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => setDetailTenant(tenants[currentIndex])}
            disabled={currentIndex >= tenants.length}
          >
            <Feather name="info" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Button onPress={handleSwiped} icon="heart" style={styles.actionButton}>
            Kiinnostaa
          </Button>
        </View>

        <Text style={styles.counter}>{currentIndex + 1} / {tenants.length}</Text>
      </View>

      <TenantDetailModal tenant={detailTenant} onClose={() => setDetailTenant(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  cardContainer: { flex: 1, position: 'relative' },

  card: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  avatarBg: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 140,
    fontWeight: Typography.weight.bold,
    color: 'rgba(255,255,255,0.35)',
  },
  avatarInitialLarge: {
    fontSize: 100,
    fontWeight: Typography.weight.bold,
    color: 'rgba(255,255,255,0.5)',
  },

  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 110,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center' },

  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ageText: {
    fontSize: Typography.size.lg,
    color: '#ffffff',
    marginLeft: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.size.sm,
    color: '#ffffff',
    marginLeft: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  introText: {
    fontSize: Typography.size.sm,
    color: '#ffffff',
    marginBottom: Spacing.sm,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  detailsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },

  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#ffffff',
  },

  swipeOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  swipeBadge: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 5,
  },
  likeBadge: { borderColor: '#10b981' },
  nopeBadge: { borderColor: '#ef4444' },
  swipeText: {
    fontSize: 40,
    fontWeight: Typography.weight.black,
    letterSpacing: 2,
    color: '#fff',
  },

  actions: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    zIndex: 20,
  },
  actionButton: { flex: 1 },
  detailButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  counter: {
    position: 'absolute',
    bottom: 85,
    alignSelf: 'center',
    fontSize: Typography.size.sm,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 20,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: { fontSize: Typography.size.base, color: Colors.text.muted, textAlign: 'center' },

  // Detail modal
  detailContainer: { flex: 1, backgroundColor: Colors.background },
  gallery: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.xl + 28,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: { padding: Spacing.xl },
  detailTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  detailAge: {
    fontSize: Typography.size.xl,
    color: Colors.text.muted,
    marginLeft: Spacing.sm,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  detailStat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  detailStatText: { fontSize: Typography.size.sm, color: Colors.text.muted },
  listingBox: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border ?? '#E5E7EB',
  },
  listingText: { fontSize: Typography.size.sm, color: Colors.text.primary, lineHeight: 22 },
});

export default BrowseTenantsScreen;
