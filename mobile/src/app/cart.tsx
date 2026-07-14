import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';
import { mediaUrl } from '../constants/api';

const DELIVERY_FEE = 350;

export default function CartScreen() {
  const router = useRouter();
  const { items, subtotal, updateQty, removeFromCart, clearCart } = useCart();
  const total = items.length ? subtotal + DELIVERY_FEE : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={clearCart}>
            <MaterialIcons name="delete-outline" size={22} color="#ef5350" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="shopping-cart" size={48} color="#3a4a3a" />
            <Text style={styles.emptyText}>Cart is empty</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.navigate('/shop')}>
              <Text style={styles.shopBtnText}>Browse Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => {
            const img = mediaUrl(item.image);
            return (
              <BlurView key={item.productId} intensity={20} tint="dark" style={styles.cartItem}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="local-pharmacy" size={24} color="#5d4037" />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>Rs. {item.price.toLocaleString()}</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQty(item.productId, item.qty - 1)}
                    >
                      <MaterialIcons name="remove" size={18} color="#f5f7f4" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQty(item.productId, item.qty + 1)}
                    >
                      <MaterialIcons name="add" size={18} color="#f5f7f4" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeFromCart(item.productId)}
                    >
                      <MaterialIcons name="close" size={18} color="#ef5350" />
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            );
          })
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>Rs. {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Delivery</Text>
            <Text style={styles.value}>Rs. {DELIVERY_FEE.toLocaleString()}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => {
              // Checkout via web / login comes next sprint
              alert('Checkout coming soon — open deergayu.com to place order for now.');
            }}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,179,66,0.15)',
  },
  backBtn: { width: 40 },
  headerTitle: { color: '#f5f7f4', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#9aaa9a', fontSize: 16 },
  shopBtn: {
    marginTop: 8,
    backgroundColor: '#7cb342',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopBtnText: { color: '#0a140f', fontWeight: '700' },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  image: { width: 88, height: 100 },
  imagePlaceholder: {
    width: 88,
    height: 100,
    backgroundColor: 'rgba(124,179,66,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: { flex: 1, padding: 12 },
  itemName: { color: '#f5f7f4', fontWeight: '700', fontSize: 15 },
  itemPrice: { color: '#7cb342', fontWeight: '800', marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(124,179,66,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: '#f5f7f4', fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#142018',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,179,66,0.2)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#9aaa9a' },
  value: { color: '#f5f7f4', fontWeight: '600' },
  totalRow: { marginTop: 6, marginBottom: 14 },
  totalLabel: { color: '#f5f7f4', fontWeight: '800', fontSize: 17 },
  totalValue: { color: '#7cb342', fontWeight: '800', fontSize: 17 },
  checkoutBtn: {
    backgroundColor: '#7cb342',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutText: { color: '#0a140f', fontWeight: '800', fontSize: 16 },
});
