import React from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const mockProducts = [
  { id: '1', name: 'Ashwagandha Powder', price: 1500, category: 'Herbal Powder', rating: 4.8 },
  { id: '2', name: 'Triphala Churna', price: 1200, category: 'Digestive Health', rating: 4.5 },
  { id: '3', name: 'Brahmi Oil', price: 850, category: 'Hair Care', rating: 4.7 },
  { id: '4', name: 'Kumkumadi Tailam', price: 2500, category: 'Skin Care', rating: 4.9 },
  { id: '5', name: 'Chyawanprash', price: 1800, category: 'Immunity', rating: 4.6 },
];

export default function ShopScreen() {
  const { t } = useLanguage();

  const renderProduct = ({ item }: { item: typeof mockProducts[0] }) => (
    <BlurView intensity={20} tint="dark" style={styles.card}>
      <View style={styles.imagePlaceholder}>
        <MaterialIcons name="image" size={40} color="rgba(212, 175, 55, 0.4)" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.row}>
          <Text style={styles.productPrice}>Rs. {item.price}</Text>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={16} color="#d4af37" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <MaterialIcons name="add-shopping-cart" size={18} color="#2c1e16" />
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{t('srv_shop_title')}</Text>
        <Text style={styles.subtitle}>{t('srv_shop_desc')}</Text>
      </View>

      <FlatList
        data={mockProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c1e16',
  },
  headerArea: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4caf50',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#d7ccc8',
    marginBottom: 10,
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginBottom: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
  },
  imagePlaceholder: {
    width: 120,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  productCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fdfbf7',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4caf50',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#d4af37',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#2c1e16',
    fontWeight: '700',
    fontSize: 15,
  },
});
