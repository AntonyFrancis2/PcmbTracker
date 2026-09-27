import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_BY_KEY, type SubjectKey } from '../../data/chapters';
import { computeStats } from '../../logic/gamify';
import { useStore } from '../../state/AppStore';
import { Bar, Chip, T } from '../../ui/components';
import { ChapterRow } from '../../ui/ChapterRow';
import { usePalette, radius } from '../../ui/theme';

type Filter = 'all' | 'unread' | 'unrevised';

export default function Chapters() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { profile, progress } = useStore();
  const params = useLocalSearchParams<{ subject?: string }>();
  const [subject, setSubject] = useState<SubjectKey>(profile.subjects[0] ?? 'phy');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const p = params.subject as SubjectKey | undefined;
    if (p && profile.subjects.includes(p)) setSubject(p);
  }, [params.subject, profile.subjects]);

  const active = profile.subjects.includes(subject) ? subject : profile.subjects[0];
  const s = SUBJECT_BY_KEY[active];
  const st = computeStats(profile, progress).bySubject[active];

  const sections = useMemo(() => {
    const rows = s.chapters.filter((ch) => {
      const m = progress.chapters[ch.id];
      if (filter === 'unread') return m?.f == null;
      if (filter === 'unrevised') return m?.r == null;
      return true;
    });
    const parts = Array.from(new Set(rows.map((r) => r.part ?? '')));
    return parts.map((p) => ({ title: p, data: rows.filter((r) => (r.part ?? '') === p) }));
  }, [s, progress, filter]);

  const color = c.subject[active];

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.bg }}>
        <T variant="title">Chapters</T>
        <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 }}>
          {profile.subjects.map((k) => {
            const on = k === active;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSubject(k)}
                style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: on ? c.surface : 'transparent' }}
              >
                <T style={{ textAlign: 'center', fontWeight: '800' }} color={on ? c.subject[k] : c.muted}>
                  {SUBJECT_BY_KEY[k].short}
                </T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="small" style={{ fontWeight: '700' }} color={color}>
              {s.name}
            </T>
            <T variant="small">
              {st.read}/{st.total} read · {st.revised}/{st.total} revised
            </T>
          </View>
          <Bar value={st.read / st.total} color={c.done} height={6} />
          <Bar value={st.revised / st.total} color={c.rev} height={6} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Not read yet" selected={filter === 'unread'} onPress={() => setFilter('unread')} />
          <Chip label="Not revised yet" selected={filter === 'unrevised'} onPress={() => setFilter('unrevised')} />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(ch) => ch.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <T variant="label" style={{ marginTop: 12, marginBottom: 8, marginLeft: 4 }}>
              {s.name} {section.title}
            </T>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <View
            style={{
              backgroundColor: c.surface,
              borderColor: c.line,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: 1,
              borderTopLeftRadius: index === 0 ? radius.lg : 0,
              borderTopRightRadius: index === 0 ? radius.lg : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? radius.lg : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? radius.lg : 0,
            }}
          >
            <ChapterRow chapter={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center', gap: 6 }}>
            <T variant="h2">All done here</T>
            <T variant="small">Every {s.name} chapter is ticked for this filter.</T>
          </View>
        }
      />
    </View>
  );
}
