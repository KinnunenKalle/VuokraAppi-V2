import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

/**
 * Moderni painike-komponentti
 * 
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Näytä latausanimaatio
 * @param {boolean} disabled - Disabloi painike
 * @param {string} icon - Feather icon name
 * @param {boolean} fullWidth - Levitä koko leveys
 */
const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles.button,
        sizeStyles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Feather
              name={icon}
              size={sizeStyles.iconSize}
              color={variantStyles.text.color}
              style={children && styles.iconMargin}
            />
          )}
          {children && (
            <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
              {children}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Variant-tyylit
const getVariantStyles = (variant) => {
  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: Colors.primary.main,
          ...Shadows.md,
        },
        text: {
          color: Colors.text.inverse,
        },
      };
    
    case 'secondary':
      return {
        button: {
          backgroundColor: Colors.text.muted,
        },
        text: {
          color: Colors.text.inverse,
        },
      };
    
    case 'outline':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: Colors.primary.main,
        },
        text: {
          color: Colors.primary.main,
        },
      };
    
    case 'ghost':
      return {
        button: {
          backgroundColor: 'transparent',
        },
        text: {
          color: Colors.primary.main,
        },
      };
    
    default:
      return getVariantStyles('primary');
  }
};

// Koko-tyylit
const getSizeStyles = (size) => {
  switch (size) {
    case 'sm':
      return {
        button: {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.base,
        },
        text: {
          fontSize: Typography.size.sm,
        },
        iconSize: 16,
      };
    
    case 'md':
      return {
        button: {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
        },
        text: {
          fontSize: Typography.size.base,
        },
        iconSize: 18,
      };
    
    case 'lg':
      return {
        button: {
          paddingVertical: Spacing.base,
          paddingHorizontal: Spacing.xl,
        },
        text: {
          fontSize: Typography.size.lg,
        },
        iconSize: 20,
      };
    
    default:
      return getSizeStyles('md');
  }
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  text: {
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
  },
  
  iconMargin: {
    marginRight: Spacing.sm,
  },
});

export default Button;
