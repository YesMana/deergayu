import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'expo-router';

// Fake cart items for display purposes
const cartItems = [
  { id: '1', name: 'Ashwagandha Powder', price: 1500, qty: 1 },
  { id: '3', name: 'Brahmi Oil', price: 850, qty: 2 },
];

export default function CartScreen() {
  const { lang } = useLanguage();
  const router = useRouter();

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const total = subtotal + 350; // Add delivery fee

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cartItems.map((item) => (
          <BlurView key={item.id} intensity={20} tint="dark" style={styles.cartItem}>
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="local-pharmacy" size={24} color="#5d4037" />
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>Rs. {item.price}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyText}>x{item.qty}</Text>
            </View>
          </BlurView>
        ))}

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>Rs. 350</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.checkoutBtn} activeOpacity={0.8}>
          <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.gradientBtn}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c1e16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(44, 30, 22, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#d4af37',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginBottom: 16,
    alignItems: 'center',
    gap: 16,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fdfbf7',
    marginBottom: 4,
  },
  itemPrice: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 14,
  },
  qtyBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qtyText: {
    color: '#d4af37',
    fontWeight: '800',
  },
  summaryBox: {
    padding: 20,
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginTop: 20,
    marginBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#d7ccc8',
    fontSize: 15,
  },
  summaryValue: {
    color: '#fdfbf7',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginVertical: 12,
  },
  totalLabel: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    color: '#4caf50',
    fontSize: 20,
    fontWeight: '800',
  },
  checkoutBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
