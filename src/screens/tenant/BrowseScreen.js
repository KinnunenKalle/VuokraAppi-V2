import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

const API_BASE = 'http://localhost:8080';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const SwipeCard = ({ apartment, isTop, depth, onSwiped }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const likeOpacity = useRef(
    translateX.interpolate({
      inputRange: [0, SCREEN_WIDTH / 4],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    })
  ).current;

  const nopeOpacity = useRef(
    translateX.interpolate({
      inputRange: [-SCREEN_WIDTH / 4, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  ).current;

  const rotate = useRef(
    translateX.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-15deg', '0deg', '15deg'],
    })
  ).current;

  const onGestureEvent = useRef(
    Animated.event(
      [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
      { useNativeDriver: false }
    )
  ).current;

  const swipeOff = useCallback((direction) => {
    const toValue = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(translateX, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      onSwiped();
    });
  }, [onSwiped]);

  const onHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      if (translationX > SWIPE_THRESHOLD) {
        swipeOff('right');
      } else if (translationX < -SWIPE_THRESHOLD) {
        swipeOff('left');
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
      }
    }
  }, [swipeOff]);

  return (
    <PanGestureHandler
      enabled={isTop}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.card,
          {
            zIndex: 10 - depth,
            transform: [{ translateX }, { translateY }, { rotate }],
          },
        ]}
      >
        {apartment.imageUrl ? (
          <Image
            source={{ uri: apartment.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}>
            <Feather name="home" size={48} color="#555" />
          </View>
        )}
        <View style={styles.gradientOverlay} />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {isTop && (
            <>
              <Animated.View
                style={[styles.swipeOverlay, { opacity: nopeOpacity, transform: [{ rotate: '-30deg' }] }]}
              >
                <View style={[styles.swipeBadge, styles.nopeBadge]}>
                  <Text style={styles.swipeText}>NOPE</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[styles.swipeOverlay, { opacity: likeOpacity, transform: [{ rotate: '30deg' }] }]}
              >
                <View style={[styles.swipeBadge, styles.likeBadge]}>
                  <Text style={styles.swipeText}>LIKE</Text>
                </View>
              </Animated.View>
            </>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.title}>{apartment.streetAddress}</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color="#ffffff" />
              <Text style={styles.locationText}>{apartment.city}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={18} color="#ffffff" />
              <Text style={styles.priceText}>{apartment.rent}€/kk</Text>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.detailBadge}>
                <Feather name="maximize" size={14} color="#ffffff" />
                <Text style={styles.detailText}>{apartment.size}m²</Text>
              </View>
              {apartment.zipcode ? (
                <View style={styles.detailBadge}>
                  <Feather name="map" size={14} color="#ffffff" />
                  <Text style={styles.detailText}>{apartment.zipcode}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const BrowseScreen = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/apartments`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const withImages = await Promise.all(
          data.map(async (apt) => {
            try {
              const imgRes = await fetch(`${API_BASE}/v1/apartments/${apt.id}/images`);
              const images = imgRes.ok ? await imgRes.json() : [];
              const primary = images.find((i) => i.isPrimary) || images[0];
              return { ...apt, imageUrl: primary?.url ?? null };
            } catch {
              return { ...apt, imageUrl: null };
            }
          })
        );

        setApartments(withImages);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApartments();
  }, []);

  const handleSwiped = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
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

  if (currentIndex >= apartments.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Feather name="home" size={64} color={Colors.text.muted} />
          <Text style={styles.emptyTitle}>Ei enempää asuntoja!</Text>
          <Text style={styles.emptyText}>Olet selannut kaikki asunnot läpi.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.cardContainer}>
          {apartments.map((apt, index) => {
            const depth = index - currentIndex;
            if (depth < 0 || depth > 1) return null;
            return (
              <SwipeCard
                key={apt.id}
                apartment={apt}
                isTop={depth === 0}
                depth={depth}
                onSwiped={handleSwiped}
              />
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button variant="outline" onPress={handleSwiped} icon="x" style={styles.actionButton}>
            Ohita
          </Button>
          <Button onPress={handleSwiped} icon="heart" style={styles.actionButton}>
            Kiinnostaa
          </Button>
        </View>

        <Text style={styles.counter}>
          {currentIndex + 1} / {apartments.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  cardContainer: {
    flex: 1,
    position: 'relative',
  },

  card: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: '#222',
    overflow: 'hidden',
  },

  cardImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  noImage: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
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

  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  priceText: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    marginLeft: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

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

  likeBadge: {
    borderColor: '#10b981',
  },

  nopeBadge: {
    borderColor: '#ef4444',
  },

  swipeText: {
    fontSize: 48,
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

  actionButton: {
    flex: 1,
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

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },

  emptyTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  emptyText: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    textAlign: 'center',
  },
});

export default BrowseScreen;
