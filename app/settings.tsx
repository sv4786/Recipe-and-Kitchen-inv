import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import {
  createAndShareBackup,
  pickAndValidateBackup,
  restoreValidatedBackup,
} from '@/services/backup';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [isBusy, setIsBusy] = useState(false);

  async function createBackup() {
    setIsBusy(true);

    try {
      await createAndShareBackup(db);
      Alert.alert(
        'Backup ready',
        'Use the Android share sheet to save a copy somewhere safe.',
      );
    } catch (error) {
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function chooseBackupToRestore() {
    setIsBusy(true);

    try {
      const selectedBackup = await pickAndValidateBackup();

      if (!selectedBackup) {
        setIsBusy(false);
        return;
      }

      Alert.alert(
        'Replace kitchen data?',
        'The selected backup will replace the recipes, inventory and shopping list on this device. A safety copy of the current data will be saved first.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsBusy(false),
          },
          {
            text: 'Restore backup',
            style: 'destructive',
            onPress: () => {
              restoreValidatedBackup(db, selectedBackup)
                .then(() => {
                  Alert.alert(
                    'Restore complete',
                    'Your backup has been restored.',
                  );
                })
                .catch((error: unknown) => {
                  Alert.alert(
                    'Restore failed',
                    error instanceof Error
                      ? error.message
                      : 'Your current data was not replaced.',
                  );
                })
                .finally(() => setIsBusy(false));
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Backup could not be opened',
        error instanceof Error
          ? error.message
          : 'Please choose a valid Recipe & Kitchen backup.',
      );
      setIsBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.back} onPress={() => router.back()}>‹ Back</Text>
      <Text style={styles.title}>Settings & backup</Text>
      <Text style={styles.subtitle}>
        Your household data stays on this device. Make a backup before changing
        phones or reinstalling the app.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Save a backup</Text>
        <Text style={styles.copy}>
          Export recipes, ingredients, inventory, shopping items and cooking
          history to a JSON file you can save or share.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={createBackup}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isBusy ? 'Working…' : 'Create and share backup'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Restore a backup</Text>
        <Text style={styles.copy}>
          Choose a Recipe & Kitchen backup file. It will be validated before
          anything changes. A local safety copy is saved before replacement.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={chooseBackupToRestore}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Choose backup file</Text>
        </Pressable>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>A small but important note</Text>
        <Text style={styles.copy}>
          Backups contain your saved household data. Keep them somewhere
          private. Restore replaces the current data on this device.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  copy: {
    color: colors.muted,
    lineHeight: 21,
    fontSize: 13,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondary: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: '#F8EBDD',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  noticeTitle: {
    color: colors.warning,
    fontWeight: '800',
  },
});
