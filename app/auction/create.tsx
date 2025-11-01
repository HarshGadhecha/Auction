import { CustomHeader } from '@/components/custom-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import auctionService from '@/services/auction.service';
import { AuctionType, CreateAuctionInput, SportType } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SPORT_TYPES: { label: string; value: SportType }[] = [
  { label: 'Cricket', value: 'cricket' },
  { label: 'Football', value: 'football' },
  { label: 'Basketball', value: 'basketball' },
  { label: 'Other', value: 'other' },
];

const AUCTION_TYPES: { label: string; value: AuctionType; description: string }[] = [
  {
    label: 'Player Auction',
    value: 'playerBid',
    description: 'Teams bid on individual players',
  },
  {
    label: 'Team Auction',
    value: 'teamBid',
    description: 'Teams bid, winner selects player',
  },
  {
    label: 'Number-wise',
    value: 'numberWise',
    description: 'Round-robin player selection',
  },
];

export default function CreateAuctionScreen() {
  const router = useRouter();
  const { user, hasSubscription } = useAuth();
  const { isDark } = useTheme();

  const colors = isDark ? Colors.dark : Colors.light;

  const [formData, setFormData] = useState<CreateAuctionInput>({
    auctionName: '',
    sportType: 'cricket',
    auctionType: 'playerBid',
    totalCreditsPerTeam: 1000,
    playersPerTeam: 11,
    minBidIncrement: 100,
    auctionDate: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
    venue: '',
    imageUrl: undefined,
  });

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateFormData = (key: keyof CreateAuctionInput, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentTime = new Date(formData.auctionDate);
      selectedDate.setHours(currentTime.getHours());
      selectedDate.setMinutes(currentTime.getMinutes());
      updateFormData('auctionDate', selectedDate.getTime());
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = new Date(formData.auctionDate);
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      updateFormData('auctionDate', currentDate.getTime());
    }
  };

  const validateForm = (): boolean => {
    // Image is optional - default image will be used if not provided
    if (!formData.auctionName.trim()) {
      Alert.alert('Error', 'Please enter auction name');
      return false;
    }
    if (!formData.venue.trim()) {
      Alert.alert('Error', 'Please enter venue');
      return false;
    }
    if (formData.totalCreditsPerTeam <= 0) {
      Alert.alert('Error', 'Credits per team must be greater than 0');
      return false;
    }
    if (formData.playersPerTeam <= 0) {
      Alert.alert('Error', 'Players per team must be greater than 0');
      return false;
    }
    if (formData.minBidIncrement <= 0) {
      Alert.alert('Error', 'Minimum bid increment must be greater than 0');
      return false;
    }
    if (formData.auctionDate <= Date.now()) {
      Alert.alert('Error', 'Auction date must be in the future');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an auction');
      return;
    }

    try {
      setLoading(true);

      // Upload image if selected, otherwise use default image
      let imageUrl = undefined;
      if (imageUri) {
        try {
          console.log('Uploading image...');
          const imagePath = `auctions/${user.uid}/${Date.now()}.jpg`;
          imageUrl = await auctionService.uploadImage(imageUri, imagePath);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);

          // Ask user if they want to continue without image
          const continueWithoutImage = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Image Upload Failed',
              `${uploadError.message || 'Failed to upload image'}\n\nWould you like to create the auction with a default image?`,
              [
                {
                  text: 'Cancel',
                  onPress: () => resolve(false),
                  style: 'cancel',
                },
                {
                  text: 'Use Default',
                  onPress: () => resolve(true),
                },
              ]
            );
          });

          if (!continueWithoutImage) {
            setLoading(false);
            return;
          }

          // Try to use default image
          imageUrl = await auctionService.getDefaultImageUrl('tournament');
        }
      } else {
        // No image selected, use default image
        console.log('No image selected, using default tournament image...');
        imageUrl = await auctionService.getDefaultImageUrl('tournament');
      }

      // Create auction
      console.log('Creating auction with data:', formData);
      const auctionId = await auctionService.createAuction(
        user.uid,
        user.displayName || 'Unknown',
        {
          ...formData,
          imageUrl,
        }
      );
      console.log('Auction created successfully with ID:', auctionId);

      Alert.alert('Success', 'Auction created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/auction/${auctionId}`),
        },
      ]);
    } catch (error: any) {
      console.error('Create auction error:', error);
      const errorMessage = error?.message || 'Failed to create auction. Please check your internet connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const auctionDate = new Date(formData.auctionDate);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="Create Auction"
        subtitle="Set up your auction details"
        showBackButton={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
              <IconSymbol name="photo" size={40} color={colors.textSecondary} />
              <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                Add Auction Image (Optional)
              </Text>
              <Text style={[styles.imageHintText, { color: colors.textSecondary }]}>
                Tap to upload or skip to use default
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Auction Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Auction Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter auction name"
            placeholderTextColor={colors.placeholder}
            value={formData.auctionName}
            onChangeText={(text) => updateFormData('auctionName', text)}
          />
        </View>

        {/* Sport Type */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Sport Type *</Text>
          <View style={styles.optionRow}>
            {SPORT_TYPES.map((sport) => (
              <TouchableOpacity
                key={sport.value}
                style={[
                  styles.optionButton,
                  { borderColor: colors.border },
                  formData.sportType === sport.value && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => updateFormData('sportType', sport.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: formData.sportType === sport.value ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {sport.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Auction Type */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Auction Type *</Text>
          {AUCTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.auctionTypeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                formData.auctionType === type.value && {
                  backgroundColor: colors.primary + '10',
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => updateFormData('auctionType', type.value)}
            >
              <View style={styles.auctionTypeContent}>
                <Text style={[styles.auctionTypeLabel, { color: colors.text }]}>
                  {type.label}
                </Text>
                <Text style={[styles.auctionTypeDesc, { color: colors.textSecondary }]}>
                  {type.description}
                </Text>
              </View>
              {formData.auctionType === type.value && (
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Credits Per Team */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Total Credits Per Team *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., 1000"
            placeholderTextColor={colors.placeholder}
            value={formData.totalCreditsPerTeam.toString()}
            onChangeText={(text) => updateFormData('totalCreditsPerTeam', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Players Per Team */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Players Per Team *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., 11"
            placeholderTextColor={colors.placeholder}
            value={formData.playersPerTeam.toString()}
            onChangeText={(text) => updateFormData('playersPerTeam', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Min Bid Increment */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Minimum Bid Increment *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., 10"
            placeholderTextColor={colors.placeholder}
            value={formData.minBidIncrement.toString()}
            onChangeText={(text) => updateFormData('minBidIncrement', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Date & Time */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Auction Date & Time *</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <IconSymbol name="calendar" size={20} color={colors.text} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {auctionDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <IconSymbol name="clock" size={20} color={colors.text} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {auctionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Date Picker Modals */}
        {showDatePicker && (
          <DateTimePicker
            value={auctionDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={auctionDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
        {/* Venue */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Venue *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter venue location"
            placeholderTextColor={colors.placeholder}
            value={formData.venue}
            onChangeText={(text) => updateFormData('venue', text)}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Auction'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePicker: {
    marginBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  imageHintText: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  auctionTypeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  auctionTypeContent: {
    flex: 1,
  },
  auctionTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  auctionTypeDesc: {
    fontSize: 14,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  dateTimeText: {
    fontSize: 16,
  },
  createButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
