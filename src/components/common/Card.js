import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

/**
 * Moderni kortti-komponentti
 * 
 * @param {boolean} pressable - Onko kortti klikattava
 * @param {function} onPress - Klikkaustapahtuma
 * @param {string} variant - 'elevated' | 'outlined' | 'flat'
 */
const Card = ({
  children,
  pressable = false,
  onPress,
  variant = 'elevated',
  style,
  ...props
}) => {
  const variantStyles = getVariantStyles(variant);
  
  const cardStyle = [
    styles.card,
    variantStyles,
    style,
  ];

  if (pressable || onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

// Variant-tyylit
const getVariantStyles = (variant) => {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: Colors.surface,
        ...Shadows.lg,
      };
    
    case 'outlined':
      return {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border.main,
      };
    
    case 'flat':
      return {
        backgroundColor: Colors.surface,
      };
    
    default:
      return getVariantStyles('elevated');
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
});

export default Card;
