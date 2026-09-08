import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
 
/**
 * Matches Screen - Kiinnostukset ja matchit
 */
const MatchesScreen = () => {
  // Dummy data (myöhemmin API:sta)
  const matches = [
    {
      id: '1',
      title: 'Valoisa yksiö Kalliossa',
      price: 850,
      location: 'Kallio, Helsinki',
      image: 'https://via.placeholder.com/100x100/3b82f6/ffffff?text=1',
      status: 'pending', // pending, matched, chatting
      timestamp: new Date(),
    },
    {
      id: '2',
      title: 'Moderni kaksio Töölössä',
      price: 1250,
      location: 'Töölö, Helsinki',
      image: 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=2',
      status: 'matched',
      timestamp: new Date(Date.now() - 86400000), // 1 päivä sitten
    },
  ];
 
  const renderMatch = ({ item }) => {
    const getStatusInfo = () => {
      switch (item.status) {
        case 'pending':
          return {
            icon: 'clock',
            text: 'Odotetaan vastausta',
            color: Colors.warning,
          };
        case 'matched':
          return {
            icon: 'heart',
            text: 'Match! Aloita chat',
            color: Colors.success,
          };
        case 'chatting':
          return {
            icon: 'message-circle',
            text: 'Chat aktiivinen',
            color: Colors.primary.main,
          };
        default:
          return {
            icon: 'help-circle',
            text: 'Tuntematon',
            color: Colors.text.muted,
          };
      }
    };
 
    const statusInfo = getStatusInfo();
 
    return (
      <TouchableOpacity style={styles.matchCard}>
        <Image source={{ uri: item.image }} style={styles.matchImage} />
        
        <View style={styles.matchInfo}>
          <Text style={styles.matchTitle}>{item.title}</Text>
          <Text style={styles.matchLocation}>
            {item.location} • {item.price}€/kk
          </Text>
          
          <View style={styles.statusRow}>
            <Feather name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
 
        <Feather name="chevron-right" size={20} color={Colors.text.light} />
      </TouchableOpacity>
    );
  };
 
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Feather name="heart" size={24} color={Colors.primary.main} />
          <Text style={styles.headerTitle}>Kiinnostukset</Text>
          <View style={{ width: 24 }} />
        </View>
 
        {/* List */}
        {matches.length > 0 ? (
          <FlatList
            data={matches}
            renderItem={renderMatch}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="heart" size={64} color={Colors.text.light} />
            <Text style={styles.emptyTitle}>Ei kiinnostuksia</Text>
            <Text style={styles.emptyText}>
              Swipettuja asuntoja ei vielä ole.{'\n'}
              Aloita selailemalla asuntoja!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
 
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
 
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
 
  headerTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
 
  listContent: {
    gap: Spacing.md,
  },
 
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
 
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.input.background,
  },
 
  matchInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
 
  matchTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
 
  matchLocation: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginBottom: Spacing.sm,
  },
 
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
 
  statusText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
  },
 
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
 
  emptyTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
 
  emptyText: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
 
export default MatchesScreen;