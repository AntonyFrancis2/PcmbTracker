import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ALL_CHAPTERS, SUBJECT_BY_KEY } from '../../data/chapters';
import { TOPICS } from '../../data/topics';
import { shortDate } from '../../logic/dates';
import { computePace, computeStats, computeXp, currentStreak, evaluateBadges, levelFor, milestoneById, upNext, type Pace } from '../../logic/gamify';
import { useStore } from '../../state/AppStore';
import { Bar, Card, SectionTitle, T } from '../../ui/components';
import { ChapterRow } from '../../ui/ChapterRow';
import { usePalette, radius } from '../../ui/theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function PaceLine({ label, pace, color }: { label: string; pace: Pace; color: string }) {
  const c = usePalette();
  const ahead = pace.diff > 0;
  const onTrack = pace.diff === 0;
  const status = pace.actual >= Math.round(pace.expected) && pace.daysLeft === 0 ? 'Done on time' : onTrack ? 'On track' : ahead ? `${pace.diff} ahead` : `${-pace.diff} behind`;
  const statusColor = ahead ? c.done : onTrack ? c.accent : c.rev;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T style={{ fontWeight: '700' }}>{label}</T>
        <View style={{ backgroundColor: statusColor + '22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <T variant="small" color={statusColor} style={{ fontWeight: '800' }}>
            {status}
          </T>
        </View>
      </View>
      <View style={{ height: 10, justifyContent: 'center' }}>
        <Bar value={pace.actual / Math.max(1, pace.total)} color={color} height={10} />
        {/* Where the plan says you should be today */}
        <View
          style={{
            position: 'absolute',
            left: `${Math.min(100, (pace.expected / Math.max(1, pace.total)) * 100)}%`,
            width: 3,
            height: 18,
            marginLeft: -1.5,
            borderRadius: 2,
            backgroundColor: c.ink,
          }}
        />
      </View>
      <T variant="small">
        {pace.actual} done · plan says {Math.round(pace.expected)} by today · {pace.daysLeft} days to {shortDate(pace.target)}
        {pace.daysLeft > 0 && pace.actual < pace.total ? ` · aim for ${pace.perWeek} a week` : ''}
      </T>
    </View>
  );
}

export default function Home() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { account, profile, progress, sync, update } = useStore();
  const now = Date.now();

  const data = useMemo(() => {
    const stats = computeStats(profile, progress);
    const xp = computeXp(stats, profile);
    const pace = computePace(stats, profile, now);
    const badges = evaluateBadges({ stats, profile, progress, now });
    const nextBadge = badges
      .filter((b) => !b.earned && b.needed > 0)
      .sort((a, b) => b.current / b.needed - a.current / a.needed)[0];
    const lockedReward = profile.rewards
      .filter((r) => r.unlockedAt == null)
      .map((r) => ({ r, b: badges.find((x) => x.id === r.milestone) }))
      .filter((x) => x.b)
      .sort((a, b) => b.b!.current / b.b!.needed - a.b!.current / a.b!.needed)[0];
    return {
      stats,
      level: levelFor(xp),
      pace,
      streak: currentStreak(progress.days, now),
      earned: badges.filter((b) => b.earned).length,
      badgeCount: badges.length,
      nextBadge,
      lockedReward,
      next: upNext(stats, progress, 3),
      weakTopics: ALL_CHAPTERS.filter((ch) => profile.subjects.includes(ch.subject)).flatMap((ch) =>
        (TOPICS[ch.id] ?? [])
          .flatMap((t) => (t.subs.length ? t.subs : [t]))
          .filter((t) => progress.chapters[t.id]?.c === 1)
          .map((t) => ({ topic: t, chapter: ch })),
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, progress]);

  const { stats, level } = data;
  const first = account?.name?.split(' ')[0];
  const syncText = sync === 'device' ? 'Saved on this phone' : sync === 'synced' ? 'Synced' : sync === 'saving' ? 'Saving…' : 'Offline · will sync';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 32, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {update && (
        <Pressable onPress={() => Linking.openURL(update.url)} style={{ backgroundColor: c.accent, borderRadius: radius.md, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="cloud-download" size={22} color={c.onAccent} />
          <T style={{ flex: 1, fontWeight: '700' }} color={c.onAccent}>
            Version {update.version} is out. Tap to download it.
          </T>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="small">{greeting()}</T>
          <T variant="title">{first ?? 'Student'}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 }}>
          <Ionicons name={sync === 'offline' ? 'cloud-offline-outline' : sync === 'device' ? 'phone-portrait-outline' : 'cloud-done-outline'} size={16} color={c.faint} />
          <T variant="small" color={c.faint}>
            {syncText}
          </T>
        </View>
      </View>

      {/* Level + XP hero */}
      <View style={{ backgroundColor: c.accent, borderRadius: radius.lg, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <T variant="label" color={c.onAccent + 'cc'}>
              Level {level.level}
            </T>
            <T variant="title" color={c.onAccent}>
              {level.name}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T variant="num" color={c.onAccent}>
              {level.xp}
            </T>
            <T variant="small" color={c.onAccent + 'cc'}>
              XP
            </T>
          </View>
        </View>
        <Bar value={level.max ? 1 : level.into / level.span} color={c.onAccent} track={c.onAccent + '33'} height={10} />
        <T variant="small" color={c.onAccent + 'dd'}>
          {level.max ? 'Top level reached. Legend!' : `${level.toNext} XP to level ${level.level + 1}`}
        </T>
      </View>

      {/* Quick stats */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { icon: 'flame' as const, color: '#f97316', value: String(data.streak), label: 'day streak' },
          { icon: 'book' as const, color: c.done, value: `${stats.read}/${stats.total}`, label: 'read' },
          { icon: 'refresh-circle' as const, color: c.rev, value: `${stats.revised}/${stats.total}`, label: 'revised' },
        ].map((s) => (
          <Card key={s.label} style={{ flex: 1, padding: 12, gap: 4, alignItems: 'flex-start' }}>
            <Ionicons name={s.icon} size={22} color={s.color} />
            <T variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
              {s.value}
            </T>
            <T variant="small">{s.label}</T>
          </Card>
        ))}
      </View>

      {/* Pace */}
      <Card style={{ gap: 16 }}>
        <SectionTitle>Your plan</SectionTitle>
        {data.pace.first || data.pace.revision ? (
          <>
            {data.pace.first && <PaceLine label="First reading" pace={data.pace.first} color={c.done} />}
            {data.pace.revision && <PaceLine label="Revision" pace={data.pace.revision} color={c.rev} />}
          </>
        ) : (
          <Pressable onPress={() => router.push('/me')}>
            <T color={c.accent} style={{ fontWeight: '700' }}>
              Set your finish-by dates to see if you're ahead of plan →
            </T>
          </Pressable>
        )}
      </Card>

      {/* Next reward / badge */}
      {data.lockedReward && (
        <Card style={{ gap: 10, borderColor: c.gold + '66' }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name="gift" size={24} color={c.gold} />
            <View style={{ flex: 1 }}>
              <T variant="label" color={c.gold}>
                Next reward
              </T>
              <T style={{ fontWeight: '800' }}>{data.lockedReward.r.title}</T>
            </View>
          </View>
          <Bar value={data.lockedReward.b!.current / data.lockedReward.b!.needed} color={c.gold} />
          <T variant="small">
            {milestoneById(profile.subjects, data.lockedReward.r.milestone)?.desc} · {data.lockedReward.b!.current}/{data.lockedReward.b!.needed}
          </T>
        </Card>
      )}
      {data.nextBadge && (
        <Pressable onPress={() => router.push('/badges')}>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={data.nextBadge.icon as keyof typeof Ionicons.glyphMap} size={22} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T style={{ fontWeight: '800' }}>
                Next badge: {data.nextBadge.name}
              </T>
              <Bar value={data.nextBadge.current / data.nextBadge.needed} color={c.accent} height={6} />
              <T variant="small">
                {data.nextBadge.desc} · {data.nextBadge.current}/{data.nextBadge.needed}
              </T>
            </View>
          </Card>
        </Pressable>
      )}

      {/* Weak topics to revise */}
      {data.weakTopics.length > 0 && (
        <Card style={{ gap: 8, borderColor: c.weak + '66' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={22} color={c.weak} />
            <T style={{ flex: 1, fontWeight: '800' }}>
              {data.weakTopics.length} weak {data.weakTopics.length === 1 ? 'topic' : 'topics'} to revise
            </T>
          </View>
          {data.weakTopics.slice(0, 4).map(({ topic, chapter }) => (
            <Pressable key={topic.id} onPress={() => router.push({ pathname: '/chapters', params: { subject: chapter.subject } })}>
              <T variant="small">
                <T variant="small" color={c.subject[chapter.subject]} style={{ fontWeight: '800' }}>
                  {SUBJECT_BY_KEY[chapter.subject].short} {topic.no}
                </T>{' '}
                {topic.title}
              </T>
            </Pressable>
          ))}
          {data.weakTopics.length > 4 && <T variant="small">and {data.weakTopics.length - 4} more</T>}
        </Card>
      )}

      {/* Subjects */}
      <SectionTitle right={<T variant="small">{data.earned}/{data.badgeCount} badges</T>}>Subjects</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.subjects.map((k) => {
          const s = stats.bySubject[k];
          const color = c.subject[k];
          return (
            <Pressable key={k} onPress={() => router.push({ pathname: '/chapters', params: { subject: k } })} style={{ flexBasis: '47%', flexGrow: 1 }}>
              <Card style={{ gap: 8, padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T style={{ fontWeight: '800' }} color={color}>
                    {SUBJECT_BY_KEY[k].name}
                  </T>
                  <Ionicons name="chevron-forward" size={16} color={c.faint} />
                </View>
                <Bar value={s.read / s.total} color={c.done} height={6} />
                <Bar value={s.revised / s.total} color={c.rev} height={6} />
                <T variant="small">
                  {s.read}/{s.total} read · {s.revised} revised
                </T>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {/* Up next */}
      {data.next.length > 0 && (
        <>
          <SectionTitle>Up next</SectionTitle>
          <Card style={{ padding: 0 }}>
            {data.next.map((n, i) => (
              <View key={n.chapter.id + n.kind} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <ChapterRow chapter={n.chapter} showSubject />
              </View>
            ))}
          </Card>
        </>
      )}
      {stats.revised === stats.total && stats.total > 0 && (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Ionicons name="trophy" size={36} color={c.gold} />
          <T variant="h2">Everything read and revised</T>
          <T variant="small">You're exam ready. Keep revising the tricky ones.</T>
        </Card>
      )}
    </ScrollView>
  );
}
