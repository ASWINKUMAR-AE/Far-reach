import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Phone, MessageSquare, ChevronLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert(t('auth.error.invalidPhone'));
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      Alert.alert(t('auth.otpSent'));
    }, 1500);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('auth.error.invalidOTP'));
      return;
    }

    setIsLoading(true);
    // Simulate API call  
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/(tabs)');
    }, 1500);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header with back button for OTP step */}
        {step === 'otp' && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep('phone')}
          >
            <ChevronLeft size={24} color="#2d3b2d" />
          </TouchableOpacity>
        )}

        {/* Illustration/Icon Section */}
        <View style={styles.iconSection}>
          <View style={[styles.iconContainer, step === 'otp' && styles.otpIconContainer]}>
            {step === 'phone' ? (
              <Phone size={36} color="#34a853" />
            ) : (
              <MessageSquare size={36} color="#34a853" />
            )}
          </View>
          
          <Text style={styles.title}>
            {step === 'phone' ? t('auth.phone.title') : t('auth.otp.title')}
          </Text>
          
          <Text style={styles.subtitle}>
            {step === 'phone' ? t('auth.phone.subtitle') : t('auth.otp.subtitle')}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {step === 'phone' ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('auth.phone.label')}
                </Text>
                <View style={styles.phoneInputWrapper}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder={t('auth.phone.placeholder')}
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={styles.phoneInput}
                    accessibilityLabel={t('auth.phone.accessibility')}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={isLoading || phoneNumber.length !== 10}
                style={[
                  styles.primaryButton,
                  (isLoading || phoneNumber.length !== 10) && styles.disabledButton
                ]}
              >
                <Text style={[
                  styles.primaryButtonText,
                  (isLoading || phoneNumber.length !== 10) && styles.disabledButtonText
                ]}>
                  {isLoading ? t('common.loading') : t('auth.sendOTP')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('auth.otp.label')}
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t('auth.otp.placeholder')}
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.otpInput}
                  accessibilityLabel={t('auth.otp.accessibility')}
                />
                <Text style={styles.otpHint}>
                  {t('auth.otp.hint')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                style={[
                  styles.primaryButton,
                  (isLoading || otp.length !== 6) && styles.disabledButton
                ]}
              >
                <Text style={[
                  styles.primaryButtonText,
                  (isLoading || otp.length !== 6) && styles.disabledButtonText
                ]}>
                  {isLoading ? t('common.loading') : t('auth.verify')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep('phone')}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {t('auth.changeNumber')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Skip Option */}
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>
            {t('auth.skipForNow')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  iconSection: {
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  otpIconContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  title: {
    color: '#2d3b2d',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b776b',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#2d3b2d',
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  countryCode: {
    color: '#2d3b2d',
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
  },
  phoneInput: {
    flex: 1,
    color: '#2d3b2d',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3b2d',
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#f9fafb',
  },
  otpHint: {
    color: '#6b776b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#34a853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#34a853',
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    marginTop: 'auto',
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#6b776b',
    fontSize: 14,
  },
});