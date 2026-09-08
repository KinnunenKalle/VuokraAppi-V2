import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
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
import apartmentService from '../../services/apartmentService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const SwipeCard = ({ apartment, isTop, depth, onSwiped }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [imageIndex, setImageIndex] = useState(0);
  const images = apartment.images?.length ? apartment.images : null;
  const currentImageUrl = images ? images[imageIndex]?.url : apartment.imageUrl;

  const showPrevImage = useCallback(() => {
    if (!images) return;
    setImageIndex((i) => (i > 0 ? i - 1 : i));
  }, [images]);

  const showNextImage = useCallback(() => {
    if (!images) return;
    setImageIndex((i) => (i < images.length - 1 ? i + 1 : i));
  }, [images]);

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
        {images ? (
          <View style={styles.cardImage}>
            {images.map((img, i) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={[
                  styles.cardImage,
                  { position: 'absolute', top: 0, left: 0, opacity: i === imageIndex ? 1 : 0 },
                ]}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
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
          {isTop && images && images.length > 1 && (
            <>
              <View style={styles.imageDots}>
                {images.map((img, i) => (
                  <View key={img.id} style={styles.imageDotTrack}>
                    <View style={[styles.imageDotFill, i === imageIndex && styles.imageDotFillActive]} />
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.tapZoneLeft}
                activeOpacity={1}
                onPress={showPrevImage}
              />
              <TouchableOpacity
                style={styles.tapZoneRight}
                activeOpacity={1}
                onPress={showNextImage}
              />
            </>
          )}

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

const ApartmentDetailModal = ({ apartment, onClose }) => {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const images = apartment?.images ?? [];

  if (!apartment) return null;

  const onGalleryScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setGalleryIndex(idx);
  };

  return (
    <Modal visible={!!apartment} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.detailContainer} bounces={false}>
        <View style={styles.gallery}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onGalleryScroll}
              scrollEventThrottle={16}
            >
              {images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.url }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.galleryImage, styles.noImage]}>
              <Feather name="home" size={48} color="#555" />
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.galleryDots}>
              {images.map((img, i) => (
                <View
                  key={img.id}
                  style={[styles.galleryDot, i === galleryIndex && styles.galleryDotActive]}
                />
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailBody}>
          <Text style={styles.detailTitle}>{apartment.streetAddress}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={Colors.text.muted} />
            <Text style={styles.detailLocation}>
              {apartment.zipcode} {apartment.city}
              {apartment.region ? `, ${apartment.region}` : ''}
            </Text>
          </View>

          <Text style={styles.detailRent}>{apartment.rent} €/kk</Text>

          <View style={styles.detailStatsRow}>
            <View style={styles.detailStat}>
              <Feather name="maximize" size={16} color={Colors.text.muted} />
              <Text style={styles.detailStatText}>{apartment.size} m²</Text>
            </View>
            {apartment.ownerIdentityVerified && (
              <View style={styles.detailStat}>
                <Feather name="check-circle" size={16} color={Colors.success ?? '#22C55E'} />
                <Text style={[styles.detailStatText, { color: Colors.success ?? '#22C55E' }]}>
                  Vuokranantaja vahvistettu
                </Text>
              </View>
            )}
          </View>

          {apartment.ownerName && (
            <View style={styles.ownerBox}>
              <Feather name="user" size={16} color={Colors.text.muted} />
              <Text style={styles.detailStatText}>{apartment.ownerName}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};

const BrowseScreen = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailApartment, setDetailApartment] = useState(null);

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const data = await apartmentService.getAllApartments();

        const withImages = await Promise.all(
          data.map(async (apt) => {
            try {
              const images = await apartmentService.getImages(apt.id);
              const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
              const primary = sorted.find((i) => i.isPrimary) || sorted[0];
              return { ...apt, images: sorted, imageUrl: primary?.url ?? null };
            } catch {
              return { ...apt, images: [], imageUrl: null };
            }
          })
        );

        withImages.forEach((apt) => {
          (apt.images ?? []).forEach((img) => {
            if (img.url) Image.prefetch(img.url).catch(() => {});
          });
        });

        setApartments(withImages);
      } catch (e) {
        setError(e.userMessage ?? e.message);
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
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => setDetailApartment(apartments[currentIndex])}
            disabled={currentIndex >= apartments.length}
          >
            <Feather name="info" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Button onPress={handleSwiped} icon="heart" style={styles.actionButton}>
            Kiinnostaa
          </Button>
        </View>

        <Text style={styles.counter}>
          {currentIndex + 1} / {apartments.length}
        </Text>
      </View>

      <ApartmentDetailModal apartment={detailApartment} onClose={() => setDetailApartment(null)} />
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

  tapZoneLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '35%',
    zIndex: 15,
  },
  tapZoneRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '35%',
    zIndex: 15,
  },
  imageDots: {
    position: 'absolute',
    top: Spacing.xl + 28,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 4,
    zIndex: 16,
  },
  imageDotTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  imageDotFill: {
    height: '100%',
    width: 0,
    backgroundColor: '#ffffff',
  },
  imageDotFillActive: {
    width: '100%',
  },

  // Detail modal
  detailContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gallery: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: '#222',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
  },
  galleryDots: {
    position: 'absolute',
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  galleryDotActive: {
    backgroundColor: '#ffffff',
    width: 18,
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
  detailBody: {
    padding: Spacing.xl,
  },
  detailTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  detailLocation: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    marginLeft: Spacing.xs,
  },
  detailRent: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.primary.main,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStatText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  ownerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border ?? '#E5E7EB',
  },
});

export default BrowseScreen;
