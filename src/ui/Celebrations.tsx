import React, { useEffect, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useStore, type Celebration } from '../state/AppStore';
import { milestoneById } from '../logic/gamify';
import { Button, T } from './components';
import { Confetti } from './Confetti';
import { usePalette } from './theme';

function copy(c: Celebration, subjects: Parameters<typeof milestoneById>[0]) {
  switch (c.kind) {
    case 'badge':
      return { eyebrow: 'Badge unlocked', title: c.badge.name, body: c.badge.desc, icon: c.badge.icon };
    case 'reward': {
      const m = milestoneById(subjects, c.reward.milestone);
      return {
        eyebrow: 'Reward unlocked',
        title: c.reward.title,
        body: `You earned it${m ? ` by reaching "${m.name}"` : ''}. Go claim it!`,
        icon: 'gift',
      };
    }
    case 'level':
      return { eyebrow: `Level ${c.level}`, title: c.name, body: 'New level reached. Check the Badges tab for new colour themes.', icon: 'star' };
  }
}

/** Full-screen card with confetti for badges, rewards and level-ups, shown one at a time. */
export function Celebrations() {
  const { celebrations, dismissCelebration, profile } = useStore();
  const c = usePalette();
  const current = celebrations[0];
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!current) return;
    setBurst((b) => b + 1);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [current]);

  if (!current) return null;
  const k = copy(current, profile.subjects);
  const tint = current.kind === 'reward' ? c.gold : c.accent;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissCelebration}>
      <View style={{ flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: c.surface,
            borderRadius: 28,
            padding: 28,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 108,
              height: 108,
              borderRadius: 54,
              backgroundColor: tint + '22',
              borderWidth: 3,
              borderColor: tint,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <Ionicons name={k.icon as keyof typeof Ionicons.glyphMap} size={52} color={tint} />
          </View>
          <T variant="label" color={tint}>
            {k.eyebrow}
          </T>
          <T variant="title" style={{ textAlign: 'center' }}>
            {k.title}
          </T>
          <T style={{ textAlign: 'center', color: c.muted }}>{k.body}</T>
          <Button label={celebrations.length > 1 ? 'Next' : 'Awesome!'} onPress={dismissCelebration} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        </View>
        <Confetti burstKey={burst} count={90} />
      </View>
    </Modal>
  );
}
