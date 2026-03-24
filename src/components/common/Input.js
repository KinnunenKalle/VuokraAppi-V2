import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

/**
 * Moderni input-kenttä komponentti
 * 
 * @param {string} label - Kentän otsikko
 * @param {string} placeholder - Placeholder teksti
 * @param {string} error - Virheilmoitus
 * @param {string} icon - Feather icon name
 * @param {boolean} required - Onko pakollinen kenttä
 */
const Input = forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  icon,
  required = false,
  style,
  inputStyle,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={error ? Colors.error : isFocused ? Colors.primary.main : Colors.text.muted}
            style={styles.icon}
          />
        )}
        
        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.light}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  
  required: {
    color: Colors.error,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input.background,
    borderWidth: 1,
    borderColor: Colors.input.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  
  inputFocused: {
    borderColor: Colors.input.focus,
    borderWidth: 2,
    backgroundColor: Colors.surface,
  },
  
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.input.error,
  },
  
  icon: {
    marginRight: Spacing.sm,
  },
  
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
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

export default Input;
