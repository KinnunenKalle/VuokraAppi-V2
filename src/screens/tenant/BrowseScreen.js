import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, Dimensions, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
 
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
 
/**
 * Browse Screen - Tinder-style card stack
 */
const BrowseScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
 
  // Dummy data
  const apartments = [
    {
      id: '1',
      title: 'Valoisa yksiö Kalliossa',
      price: 850,
      location: 'Kallio, Helsinki',
      size: 35,
      rooms: '1h+k',
      petsAllowed: true,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
      distance: 2.3,
    },
    {
      id: '2',
      title: 'Moderni kaksio Töölössä',
      price: 1200,
      location: 'Töölö, Helsinki',
      size: 55,
      rooms: '2h+k',
      petsAllowed: false,
      images: ['https://images.unsplash.com/photo-1502672260066-6bc0d0a39951'],
      distance: 3.5,
    },
    {
      id: '3',
      title: 'Tilava kolmio Pasilassa',
      price: 1450,
      location: 'Pasila, Helsinki',
      size: 75,
      rooms: '3h+k',
      petsAllowed: true,
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
      distance: 4.1,
    },
  ];
 
  // Opacity for overlays
  const likeOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
 
  const nopeOpacity = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
 
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );
 
  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
 
      if (translationX > SWIPE_THRESHOLD) {
        handleSwipeRight();
      } else if (translationX < -SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else {
        returnToCenter();
      }
    }
  };
 
  const returnToCenter = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };
 
  const resetPosition = () => {
    translateX.setValue(0);
    translateY.setValue(0);
  };
 
  const handleSwipeLeft = () => {
    console.log('❌ Ohitettu');
    
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH * 1.5,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1);
      resetPosition();
    });
  };
 
  const handleSwipeRight = () => {
    console.log('✅ Kiinnostaa');
    
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH * 1.5,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1);
      resetPosition();
    });
  };
 
  // Render card stack (show current + next 2 cards)
  const renderCards = () => {
    return apartments
      .slice(currentIndex, currentIndex + 3)
      .reverse()
      .map((apartment, index, arr) => {
        const reversedIndex = arr.length - 1 - index;
        const isTop = reversedIndex === 0;
 
        // Scale for cards underneath
        const scale = 1 - reversedIndex * 0.05;
        const translateYOffset = reversedIndex * 10;
 
        const cardKey = `card-${apartment.id}-${currentIndex}`; // Stable key
 
        if (isTop) {
          // Top card - swipeable
          return (
            <PanGestureHandler
              key={cardKey}
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View
                style={[
                  styles.card,
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      {
                        rotate: translateX.interpolate({
                          inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                          outputRange: ['-15deg', '0deg', '15deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* NOPE overlay */}
                <Animated.View
                  style={[styles.swipeOverlay, { opacity: nopeOpacity, transform: [{ rotate: '-30deg' }] }]}
                >
                  <View style={[styles.swipeBadge, styles.nopeBadge]}>
                    <Text style={styles.swipeText}>NOPE</Text>
                  </View>
                </Animated.View>
 
                {/* LIKE overlay */}
                <Animated.View
                  style={[styles.swipeOverlay, { opacity: likeOpacity, transform: [{ rotate: '30deg' }] }]}
                >
                  <View style={[styles.swipeBadge, styles.likeBadge]}>
                    <Text style={styles.swipeText}>LIKE</Text>
                  </View>
                </Animated.View>
 
                {renderCardContent(apartment)}
              </Animated.View>
            </PanGestureHandler>
          );
        } else {
          // Cards underneath - static
          return (
            <View
              key={cardKey}
              style={[
                styles.card,
                {
                  position: 'absolute',
                  transform: [{ scale }, { translateY: translateYOffset }],
                },
              ]}
            >
              {renderCardContent(apartment)}
            </View>
          );
        }
      });
  };
 
  const renderCardContent = useCallback((apartment) => (
    <>
      <Image 
        source={{ uri: apartment.images[0] }} 
        style={styles.cardImage} 
        resizeMode="cover"
        key={apartment.id} // Stable key per apartment
      />
      
      {/* Gradient overlay for text readability */}
      <View style={styles.gradientOverlay} />
      
      <View style={styles.cardInfo}>
        <Text style={styles.title}>{apartment.title}</Text>
        
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={14} color="#ffffff" />
          <Text style={styles.locationText}>
            {apartment.location} • {apartment.distance} km
          </Text>
        </View>
 
        <View style={styles.infoRow}>
          <Feather name="dollar-sign" size={18} color="#ffffff" />
          <Text style={styles.priceText}>{apartment.price}€/kk</Text>
        </View>
 
        <View style={styles.detailsRow}>
          <View style={styles.detailBadge}>
            <Feather name="maximize" size={14} color="#ffffff" />
            <Text style={styles.detailText}>{apartment.size}m²</Text>
          </View>
 
          <View style={styles.detailBadge}>
            <Feather name="grid" size={14} color="#ffffff" />
            <Text style={styles.detailText}>{apartment.rooms}</Text>
          </View>
 
          {apartment.petsAllowed && (
            <View style={styles.petBadge}>
              <Text style={styles.petIcon}>🐕</Text>
              <Text style={styles.detailText}>Lemmikit OK</Text>
            </View>
          )}
        </View>
      </View>
    </>
  ), []);
 
  if (currentIndex >= apartments.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Selaa asuntoja</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="home" size={64} color={Colors.text.muted} />
          <Text style={styles.emptyTitle}>Ei enempää asuntoja!</Text>
          <Text style={styles.emptyText}>Olet selannut kaikki asunnot läpi.</Text>
        </View>
      </SafeAreaView>
    );
  }
 
  return (
    <SafeAreaView style={styles.container}>
      {/* Ei headeria - Tinder style */}
      
      <View style={styles.content}>
        <View style={styles.cardContainer}>{renderCards()}</View>
 
        {/* Action buttons - KORTIN PÄÄLLÄ */}
        <View style={styles.actions}>
          <Button variant="outline" onPress={handleSwipeLeft} icon="x" style={styles.actionButton}>
            Ohita
          </Button>
          <Button onPress={handleSwipeRight} icon="heart" style={styles.actionButton}>
            Kiinnostaa
          </Button>
        </View>
 
        <Text style={styles.counter}>
          {currentIndex + 1} / {apartments.length}
        </Text>
      </View>
    </SafeAreaView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
 
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.input.border,
  },
 
  headerTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
 
  content: {
    flex: 1,
    paddingTop: 0, // Ei tilaa ylhäällä
    paddingBottom: 0, // Ei tilaa alhaalla
  },
 
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: -Spacing.lg, // Vie ylöspäin
  },
 
  card: {
    width: SCREEN_WIDTH, // Täysi leveys
    height: SCREEN_HEIGHT * 0.88, // Täyttää lähes koko näytön (paitsi status bar)
    backgroundColor: Colors.surface,
    borderRadius: 0, // Ei pyöristettyjä kulmia = full screen
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
 
  cardImage: {
    width: '100%',
    height: '100%', // Kuva täyttää koko kortin
    position: 'absolute',
  },
 
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%', // Pienempi alue (oli 45%)
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Vähemmän tumma (oli 0.6)
  },
 
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md, // Pienempi (oli lg)
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
 
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: '#ffffff',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Läpinäkyvä valkoinen
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
 
  petBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.8)', // Läpinäkyvä vihreä
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
 
  petIcon: {
    fontSize: 14,
  },
 
  detailText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#ffffff', // Valkoinen
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
    position: 'absolute', // Kortin päällä
    bottom: 100, // Bottom tabsin yläpuolella
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
 
  actionButton: {
    flex: 1,
  },
 
  counter: {
    position: 'absolute', // Kortin päällä
    bottom: 70, // Actions yläpuolella
    alignSelf: 'center',
    fontSize: Typography.size.sm,
    color: '#ffffff', // Valkoinen
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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