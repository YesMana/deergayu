import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../constants/api';
import {
  createPayHereHash,
  fetchStorefrontSettings,
  type ShippingZone,
} from '../lib/api';

const DEFAULT_BANK = {
  bank: "People's Bank",
  branch: 'Colombo 03',
  accountName: 'Deergayu (Pvt) Ltd',
  accountNo: '123-4567-8901-00',
};

const BASE_PAYMENT_OPTIONS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery', desc: 'Pay when order arrives' },
  { value: 'qr_pay', label: 'QR Pay', desc: 'Scan & pay via banking app' },
  { value: 'bank_transfer', label: 'Bank Transfer', desc: 'Transfer to our account' },
];

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, updateQty, removeFromCart, clearCart, checkout } = useCart();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingZoneId, setShippingZoneId] = useState('');
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK);
  const [payhereEnabled, setPayhereEnabled] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    orderIds: string[];
    total: number;
    method: string;
    shippingFee: number;
    payhereMsg?: string;
  } | null>(null);

  useEffect(() => {
    fetchStorefrontSettings()
      .then((data) => {
        const zones = data.shippingZones || [];
        setShippingZones(zones);
        if (zones.length) setShippingZoneId(zones[0].id);
        if (data.bankDetails) setBankDetails({ ...DEFAULT_BANK, ...data.bankDetails });
        setPayhereEnabled(Boolean(data.payhereEnabled));
      })
      .catch(() => {});
  }, []);

  const selectedZone = shippingZones.find((z) => z.id === shippingZoneId);
  const shippingFee = Number(selectedZone?.fee) || (shippingZones.length ? 0 : 350);
  const total = items.length ? subtotal + shippingFee : 0;

  const paymentOptions = useMemo(
    () =>
      payhereEnabled
        ? [
            ...BASE_PAYMENT_OPTIONS,
            { value: 'payhere', label: 'Card (PayHere)', desc: 'Visa / Mastercard' },
          ]
        : BASE_PAYMENT_OPTIONS,
    [payhereEnabled]
  );

  const tryPayHere = async (orderIds: string[], amount: number) => {
    const orderId = orderIds[0];
    if (!orderId) return 'Order saved. Complete card payment on deergayu.com if needed.';
    try {
      const hashData = await createPayHereHash(orderId, amount);
      if (hashData.launchUrl) {
        await WebBrowser.openBrowserAsync(hashData.launchUrl);
        return 'PayHere opened. Complete payment in the browser, then check My Orders.';
      }
      await Linking.openURL('https://deergayu.com/cart');
      return 'Order saved. Finish card payment on deergayu.com if needed.';
    } catch (e: any) {
      return (
        e?.message ||
        'Card pay needs merchant config. Order is saved — use bank transfer or contact support.'
      );
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to place an order.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Missing info', 'Please enter a delivery address.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Missing info', 'Please enter a phone number.');
      return;
    }
    if (shippingZones.length && !shippingZoneId) {
      Alert.alert('Missing info', 'Please select a shipping zone.');
      return;
    }

    setCheckingOut(true);
    try {
      const data = await checkout(
        paymentMethod,
        deliveryAddress.trim(),
        phone.trim(),
        notes.trim(),
        shippingZoneId || undefined
      );
      const paidTotal =
        data?.shippingFee != null ? subtotal + Number(data.shippingFee) : total;
      let payhereMsg: string | undefined;
      if (data?.payhereReady) {
        payhereMsg = await tryPayHere(data.orderIds || [], paidTotal);
      }
      setOrderResult({
        orderIds: data?.orderIds || [],
        total: paidTotal,
        method: paymentMethod,
        shippingFee: data?.shippingFee ?? shippingFee,
        payhereMsg,
      });
    } catch (e: any) {
      Alert.alert('Checkout failed', e?.message || 'Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (orderResult) {
    const ref = orderResult.orderIds?.[0]?.slice(-8).toUpperCase() || 'DEERGAYU';
    const needsBank =
      orderResult.method === 'bank_transfer' || orderResult.method === 'qr_pay';

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/shop')} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Placed</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.successPad}>
          <MaterialIcons name="check-circle" size={64} color="#7cb342" />
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successSub}>
            Order <Text style={{ color: '#7cb342', fontWeight: '800' }}>#{ref}</Text> placed.
          </Text>
          <Text style={styles.successMeta}>
            Total Rs. {orderResult.total.toLocaleString()} · {orderResult.method.replace(/_/g, ' ')}
          </Text>

          {needsBank ? (
            <View style={styles.bankBox}>
              <Text style={styles.bankTitle}>Payment details</Text>
              <Text style={styles.bankLine}>Bank: {bankDetails.bank}</Text>
              <Text style={styles.bankLine}>Branch: {bankDetails.branch}</Text>
              <Text style={styles.bankLine}>Name: {bankDetails.accountName}</Text>
              <Text style={styles.bankLine}>Acc: {bankDetails.accountNo}</Text>
              <Text style={styles.bankLine}>Ref: {ref}</Text>
            </View>
          ) : null}

          {orderResult.payhereMsg ? (
            <Text style={styles.payhereHint}>{orderResult.payhereMsg}</Text>
          ) : null}

          <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/orders')}>
            <Text style={styles.checkoutText}>View My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/shop')}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="shopping-cart" size={48} color="#3a4a3a" />
            <Text style={styles.emptyText}>Cart is empty</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.navigate('/shop')}>
              <Text style={styles.shopBtnText}>Browse Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {items.map((item) => {
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
            })}

            <Text style={styles.sectionTitle}>Checkout</Text>
            {!user ? (
              <TouchableOpacity style={styles.loginBanner} onPress={() => router.push('/login')}>
                <MaterialIcons name="login" size={20} color="#d4af37" />
                <Text style={styles.loginBannerText}>Sign in to place your order</Text>
              </TouchableOpacity>
            ) : null}

            {shippingZones.length > 0 ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Shipping zone</Text>
                {shippingZones.map((z) => (
                  <TouchableOpacity
                    key={z.id}
                    style={[styles.option, shippingZoneId === z.id && styles.optionOn]}
                    onPress={() => setShippingZoneId(z.id)}
                  >
                    <Text style={styles.optionLabel}>
                      {z.name} — Rs. {Number(z.fee).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Delivery address"
              placeholderTextColor="#6a7a6a"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#6a7a6a"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              placeholderTextColor="#6a7a6a"
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.label}>Payment</Text>
            {paymentOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, paymentMethod === opt.value && styles.optionOn]}
                onPress={() => setPaymentMethod(opt.value)}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}

            {(paymentMethod === 'bank_transfer' || paymentMethod === 'qr_pay') && (
              <View style={styles.bankBox}>
                <Text style={styles.bankTitle}>Bank details</Text>
                <Text style={styles.bankLine}>{bankDetails.bank} · {bankDetails.branch}</Text>
                <Text style={styles.bankLine}>{bankDetails.accountName}</Text>
                <Text style={styles.bankLine}>{bankDetails.accountNo}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={styles.footerLabel}>Subtotal</Text>
            <Text style={styles.footerValue}>Rs. {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.footerLabel}>Delivery</Text>
            <Text style={styles.footerValue}>Rs. {shippingFee.toLocaleString()}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]}
            onPress={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <ActivityIndicator color="#0a140f" />
            ) : (
              <Text style={styles.checkoutText}>Place Order</Text>
            )}
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
  scrollContent: { padding: 16, paddingBottom: 200 },
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
  sectionTitle: {
    color: '#f5f7f4',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 12,
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    marginBottom: 12,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  loginBannerText: { color: '#d4af37', fontWeight: '700' },
  fieldBlock: { marginBottom: 12 },
  label: { color: '#9aaa9a', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f5f7f4',
    marginBottom: 10,
  },
  option: {
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  optionOn: {
    borderColor: '#7cb342',
    backgroundColor: 'rgba(124,179,66,0.12)',
  },
  optionLabel: { color: '#f5f7f4', fontWeight: '700' },
  optionDesc: { color: '#9aaa9a', fontSize: 12, marginTop: 2 },
  bankBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  bankTitle: { color: '#d4af37', fontWeight: '800', marginBottom: 6 },
  bankLine: { color: '#f5f7f4', marginBottom: 2, fontSize: 13 },
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
  footerLabel: { color: '#9aaa9a' },
  footerValue: { color: '#f5f7f4', fontWeight: '600' },
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
  successPad: { padding: 24, alignItems: 'center', paddingBottom: 60 },
  successTitle: { color: '#f5f7f4', fontSize: 24, fontWeight: '800', marginTop: 12 },
  successSub: { color: '#9aaa9a', marginTop: 8, textAlign: 'center' },
  successMeta: { color: '#7cb342', marginTop: 8, marginBottom: 16, fontWeight: '600' },
  payhereHint: {
    color: '#d4af37',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  secondaryBtn: { marginTop: 12, paddingVertical: 12 },
  secondaryBtnText: { color: '#d4af37', fontWeight: '700' },
});
