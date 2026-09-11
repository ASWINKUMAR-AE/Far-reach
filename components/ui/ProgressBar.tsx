import React from 'react';
import { View } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
}

export function ProgressBar({ 
  progress, 
  color = 'bg-primary-500', 
  backgroundColor = 'bg-earth-200',
  height = 4
}: ProgressBarProps) {
  return (
    <View className={`w-full ${backgroundColor} rounded-full overflow-hidden`} style={{ height }}>
      <View 
        className={`${color} rounded-full h-full`}
        style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
      />
    </View>
  );
}