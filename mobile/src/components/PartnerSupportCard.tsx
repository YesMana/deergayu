import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/** Partner / staff only — not for normal shoppers */
export const PARTNER_WA_PRIMARY = {
  label: '071 990 9299',
  display: '0719909299',
  e164: '94719909299',
};
export const PARTNER_PHONE_SECONDARY = {
  label: '076 220 9299',
  display: '0762209299',
  e164: '94762209299',
};

const PRESET =
  'Hi Deergayu Support — I need help with my partner account on the platform.';

export function isPartnerRole(role?: string | null, isAdmin?: boolean) {
  if (isAdmin) return true;
  return ['doctor', 'clinic', 'organization', 'vendor', 'admin'].includes(
    (role || '').toLowerCase()
  );
}

export default function PartnerSupportCard({ context = 'partner' }: { context?: string }) {
  const openWa = (e164: string) => {
    const url = `https://wa.me/${e164}?text=${encodeURIComponent(`${PRESET} (${context})`)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Partner support</Text>
      <Text style={styles.sub}>Issues? Chat us on WhatsApp (doctors, vendors & partners).</Text>
      <TouchableOpacity style={styles.waBtn} onPress={() => openWa(PARTNER_WA_PRIMARY.e164)}>
        <MaterialIcons name="chat" size={18} color="#06280f" />
        <Text style={styles.waText}>WhatsApp {PARTNER_WA_PRIMARY.label}</Text>
      </TouchableOpacity>
      <View style={styles.altRow}>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${PARTNER_PHONE_SECONDARY.display}`)}>
          <Text style={styles.link}>{PARTNER_PHONE_SECONDARY.label}</Text>
        </TouchableOpacity>
        <Text style={styles.sep}>·</Text>
        <TouchableOpacity onPress={() => openWa(PARTNER_PHONE_SECONDARY.e164)}>
          <Text style={styles.link}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(124,179,66,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
  },
  title: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sub: { color: '#9aaa9a', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25d366',
    borderRadius: 10,
    paddingVertical: 12,
  },
  waText: { color: '#06280f', fontWeight: '800', fontSize: 14 },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  link: { color: '#7cb342', fontWeight: '700', fontSize: 13 },
  sep: { color: '#6a7a6a' },
});
