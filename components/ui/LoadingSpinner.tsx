import React from 'react';
import { View, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function LoadingSpinner({ size = 'small', color = '#22C55E' }: LoadingSpinnerProps) {
  return (
    <View className="items-center justify-center">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}