import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { publishAdminNews } from '../../lib/apiClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function AdminNewsDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('PROCUREMENT');
  const [priority, setPriority] = useState('MEDIUM');
  const [location, setLocation] = useState('');
  const [sourceName, setSourceName] = useState('Department of Agriculture');

  const handlePublish = async () => {
    if (!title || !summary) {
      Alert.alert('Validation Error', 'Title and summary are required.');
      return;
    }
    
    try {
      await publishAdminNews({
        title,
        summary,
        category,
        priority,
        location,
        source_name: sourceName,
        source_url: '',
      });
      Alert.alert('Success', 'News published successfully. It will now appear on farmer devices.');
      setTitle('');
      setSummary('');
    } catch (e) {
      Alert.alert('Error', 'Failed to publish news.');
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publish Live Update</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Paddy Procurement Extended"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Summary / Alert Text</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of the update..."
            multiline
            textAlignVertical="top"
            value={summary}
            onChangeText={setSummary}
          />
        </View>
        
        <View style={styles.rowGroup}>
          <View style={styles.flexInput}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.readonlyInput}>
               <Text style={styles.readonlyText}>{category}</Text>
            </View>
          </View>
          
          <View style={styles.flexInput}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.readonlyInput}>
               <Text style={styles.readonlyText}>{priority}</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Madurai, Tamil Nadu"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <TouchableOpacity 
          onPress={handlePublish}
          style={styles.publishButton}
        >
          <Text style={styles.publishButtonText}>Publish Now (Live)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb', 
    backgroundColor: '#ffffff' 
  },
  backButton: { marginRight: 16 },
  backText: { color: '#2563eb', fontWeight: '500', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { padding: 16, paddingBottom: 60 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    fontSize: 16, 
    color: '#111827' 
  },
  textArea: { height: 96 },
  rowGroup: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  flexInput: { flex: 1 },
  readonlyInput: {
    backgroundColor: '#f3f4f6', 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10,
  },
  readonlyText: { fontSize: 16, color: '#4b5563', fontWeight: '500' },
  publishButton: { 
    backgroundColor: '#16a34a', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  publishButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 }
});
