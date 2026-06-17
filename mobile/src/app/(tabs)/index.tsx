import React from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const router = useRouter();

  const renderHeroText = () => {
    if (t('hero_title').includes('Deergayu')) {
      return (
        <Text style={styles.heroTitle}>
          Discover Ancient Healing with <Text style={styles.gradientText}>Deergayu</Text>
        </Text>
      );
    }
    return (
      <Text style={styles.heroTitle}>
        <Text style={styles.gradientText}>දීර්ඝායු</Text> සමගින් පෞරාණික ආයුර්වේද සුවය අත්විඳින්න
      </Text>
    );
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* Premium Hero Section */}
      <ImageBackground 
        source={require('../../../assets/images/react-logo.png')} // Replace with a nice hero image later
        style={styles.heroContainer}
      >
        <LinearGradient
          colors={['rgba(44, 30, 22, 0.4)', 'rgba(44, 30, 22, 0.95)']}
          style={styles.overlay}
        />
        
        <View style={styles.heroContent}>
          {renderHeroText()}
          <Text style={styles.heroSubtitle}>{t('hero_subtitle')}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.navigate('/shop')} activeOpacity={0.8}>
              <MaterialIcons name="local-pharmacy" size={20} color="#2c1e16" />
              <Text style={styles.primaryButtonText}>{t('btn_shop')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.navigate('/channeling')} activeOpacity={0.8}>
              <MaterialIcons name="event" size={20} color="#d4af37" />
              <Text style={styles.secondaryButtonText}>{t('btn_book')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Services Section */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>{t('services_title')}</Text>
        <View style={styles.titleUnderline} />
        
        <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="shopping-bag" size={32} color="#d4af37" />
          </View>
          <Text style={styles.cardTitle}>{t('srv_shop_title')}</Text>
          <Text style={styles.cardDesc}>{t('srv_shop_desc')}</Text>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="person" size={32} color="#d4af37" />
          </View>
          <Text style={styles.cardTitle}>{t('srv_doc_title')}</Text>
          <Text style={styles.cardDesc}>{t('srv_doc_desc')}</Text>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="auto-fix-high" size={32} color="#d4af37" />
          </View>
          <Text style={styles.cardTitle}>{t('srv_astro_title')}</Text>
          <Text style={styles.cardDesc}>{t('srv_astro_desc')}</Text>
        </BlurView>

        <TouchableOpacity onPress={() => router.navigate('/symptom-checker')} activeOpacity={0.8}>
          <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
              <MaterialIcons name="healing" size={32} color="#4caf50" />
            </View>
            <Text style={styles.cardTitle}>AI Symptom Checker</Text>
            <Text style={styles.cardDesc}>Get instant Ayurvedic home remedies based on your symptoms.</Text>
          </BlurView>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c1e16',
  },
  heroContainer: {
    minHeight: 450,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    padding: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fdfbf7',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  gradientText: {
    color: '#4caf50',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#d7ccc8',
    marginBottom: 30,
    lineHeight: 24,
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    elevation: 4,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#2c1e16',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1.5,
    borderColor: '#d4af37',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  secondaryButtonText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  servicesSection: {
    padding: 24,
    paddingTop: 30,
    backgroundColor: '#2c1e16',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fdfbf7',
    textAlign: 'center',
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#4caf50',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 30,
    borderRadius: 2,
  },
  serviceCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fdfbf7',
    marginBottom: 8,
  },
  cardDesc: {
    color: '#d7ccc8',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
});
