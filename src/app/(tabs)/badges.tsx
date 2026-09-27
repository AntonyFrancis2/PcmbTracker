import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shortDate } from '../../logic/dates';
import { computeStats, computeXp, evaluateBadges, levelFor, LEVEL_XP, THEMES, type BadgeState, type BadgeTone } from '../../logic/gamify';
import { useStore } from '../../state/AppStore';
import { Bar, Card, SectionTitle, T } from '../../ui/components';
import { usePalette } from '../../ui/theme';

const TONES: Record<BadgeTone, string> = { start: '#0ea5e9', subject: '#6366f1', revision: '#f59e0b', big: '#e11d48', habit: '#f97316' };

function Badge({ b }: { b: BadgeState }) {
  const c = usePalette();
  const tint = TONES[b.tone];
  return (
    <View style={{ flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, padding: 8 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: b.earned ? tint : c.surfaceAlt,
          borderWidth: b.earned ? 0 : 2,
          borderColor: c.line,
          borderStyle: 'dashed',
        }}
      >
        <Ionicons name={(b.earned ? b.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap} size={b.earned ? 34 : 24} color={b.earned ? '#fff' : c.faint} />
      </View>
      <T style={{ fontWeight: '800', textAlign: 'center', fontSize: 13 }} color={b.earned ? c.ink : c.muted}>
        {b.name}
      </T>
      {b.earned ? (
        <T variant="small" style={{ textAlign: 'center', fontSize: 11 }}>
          {b.earnedAt ? shortDate(b.earnedAt) : 'Earned'}
        </T>
      ) : (
        <View style={{ alignSelf: 'stretch', gap: 3 }}>
          <Bar value={b.current / Math.max(1, b.needed)} color={tint} height={4} />
          <T variant="small" style={{ textAlign: 'center', fontSize: 11 }}>
            {b.desc}
          </T>
        </View>
      )}
    </View>
  );
}

export default function Badges() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { profile, progress, updateProfile } = useStore();

  const { badges, level } = useMemo(() => {
    const stats = computeStats(profile, progress);
    return {
      badges: evaluateBadges({ stats, profile, progress, now: Date.now() }),
      level: levelFor(computeXp(stats, profile)),
    };
  }, [profile, progress]);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 40, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <T variant="title">Badges</T>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T variant="h2">
            Level {level.level} · {level.name}
          </T>
          <T variant="small">{level.xp} XP</T>
        </View>
        <Bar value={level.max ? 1 : level.into / level.span} color={c.accent} height={10} />
        <T variant="small">
          First read 10 XP · Revision 15 XP · Ahead of your plan 1.5× · {level.max ? 'Top level!' : `${level.toNext} XP to level ${level.level + 1}`}
        </T>
      </Card>

      <SectionTitle>Colour themes</SectionTitle>
      <T variant="small" style={{ marginTop: -8 }}>
        Level up to unlock new colours for the app.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {THEMES.map((t) => {
          const unlocked = level.level >= t.unlockLevel;
          const selected = profile.theme === t.id;
          const swatch = c.dark ? t.accentDark : t.accent;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !unlocked }}
              disabled={!unlocked}
              onPress={() => updateProfile({ theme: t.id })}
              style={{
                flexBasis: '30%',
                flexGrow: 1,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selected ? swatch : c.line,
                backgroundColor: c.surface,
                padding: 10,
                gap: 8,
                alignItems: 'center',
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: swatch, alignItems: 'center', justifyContent: 'center' }}>
                {!unlocked && <Ionicons name="lock-closed" size={16} color="#fff" />}
                {selected && <Ionicons name="checkmark" size={20} color="#fff" />}
              </View>
              <T style={{ fontWeight: '700', fontSize: 13 }}>{t.name}</T>
              <T variant="small" style={{ fontSize: 11 }}>
                {unlocked ? (selected ? 'In use' : 'Tap to use') : `Level ${t.unlockLevel} · ${LEVEL_XP[t.unlockLevel - 1]} XP`}
              </T>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle right={<T variant="small">{earned.length} of {badges.length}</T>}>Earned</SectionTitle>
      {earned.length ? (
        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
          {earned.map((b) => (
            <Badge key={b.id} b={b} />
          ))}
        </Card>
      ) : (
        <T variant="small">Tick your first chapter to earn First Step.</T>
      )}

      <SectionTitle>Still to earn</SectionTitle>
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
        {locked.map((b) => (
          <Badge key={b.id} b={b} />
        ))}
      </Card>
    </ScrollView>
  );
}
