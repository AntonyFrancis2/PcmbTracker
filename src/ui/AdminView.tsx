import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chapterDetail, daysSince, summarize, toCsv, type StudentRow } from '../logic/admin';
import { shortDate } from '../logic/dates';
import { Bar, Button, Card, Chip, T } from './components';
import { usePalette, radius } from './theme';

type SortKey = 'lastActive' | 'read' | 'revised' | 'name' | 'joined';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'lastActive', label: 'Last active' },
  { key: 'read', label: 'Most read' },
  { key: 'revised', label: 'Most revised' },
  { key: 'joined', label: 'Newest' },
  { key: 'name', label: 'Name' },
];

function ago(t: number | null): string {
  const d = daysSince(t);
  if (d == null) return 'never';
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

function downloadCsv(rows: StudentRow[]) {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pcmb-tracker-students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 150, gap: 2, padding: 14 }}>
      <T variant="label">{label}</T>
      <T variant="num">{value}</T>
      {hint ? <T variant="small">{hint}</T> : null}
    </Card>
  );
}

function PaceTag({ pace }: { pace: number | null }) {
  const c = usePalette();
  if (pace == null) return <T variant="small">No plan</T>;
  const color = pace > 0 ? c.done : pace === 0 ? c.accent : c.rev;
  const text = pace > 0 ? `${pace} ahead` : pace === 0 ? 'On track' : `${-pace} behind`;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: color + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <T variant="small" color={color} style={{ fontWeight: '800' }}>
        {text}
      </T>
    </View>
  );
}

function StudentDetail({ row, onClose }: { row: StudentRow; onClose: () => void }) {
  const c = usePalette();
  const groups = chapterDetail(row);
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="h2">{row.name}</T>
          <T variant="small">
            {row.email} · {row.stream} · joined {row.joinedAt ? shortDate(row.joinedAt) : 'unknown'} · last active {ago(row.lastActiveAt)}
          </T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close student detail" onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={24} color={c.muted} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <T variant="small">
          Level {row.level} · {row.levelName} · {row.xp} XP
        </T>
        <T variant="small">Streak {row.streak} days</T>
        <T variant="small">
          Read by {row.firstReadTarget ? shortDate(row.firstReadTarget) : '—'} · Revise by {row.revisionTarget ? shortDate(row.revisionTarget) : '—'}
        </T>
        <PaceTag pace={row.pace} />
      </View>
      {row.badges.length > 0 && <T variant="small">Badges: {row.badges.join(', ')}</T>}

      {groups.map((g) => {
        const read = g.lines.filter((l) => l.readAt).length;
        const rev = g.lines.filter((l) => l.revisedAt).length;
        return (
          <View key={g.subject} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T style={{ fontWeight: '800' }} color={c.subject[g.subject]}>
                {g.name}
              </T>
              <T variant="small">
                {read}/{g.lines.length} read · {rev}/{g.lines.length} revised
              </T>
            </View>
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, overflow: 'hidden' }}>
              {g.lines.map((l, i) => (
                <View
                  key={l.chapter.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: c.line,
                    backgroundColor: l.readAt && l.revisedAt ? c.doneSoft : 'transparent',
                  }}
                >
                  <T variant="small" style={{ width: 22, fontWeight: '800', textAlign: 'right' }}>
                    {l.chapter.no}
                  </T>
                  <T style={{ flex: 1 }} numberOfLines={2}>
                    {l.chapter.name}
                  </T>
                  <T variant="small" style={{ width: 92 }} color={l.readAt ? c.done : c.faint}>
                    {l.readAt ? `Read ${shortDate(l.readAt)}` : 'Not read'}
                  </T>
                  <T variant="small" style={{ width: 104 }} color={l.revisedAt ? c.rev : c.faint}>
                    {l.revisedAt ? `Revised ${shortDate(l.revisedAt)}` : 'Not revised'}
                  </T>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export function AdminView({
  rows,
  loadedAt,
  onRefresh,
  refreshing,
}: {
  rows: StudentRow[];
  loadedAt: number | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const c = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('lastActive');
  const [selected, setSelected] = useState<string | null>(null);

  const summary = useMemo(() => summarize(rows), [rows]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    const by: Record<SortKey, (a: StudentRow, b: StudentRow) => number> = {
      lastActive: (a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0),
      read: (a, b) => b.read / (b.total || 1) - a.read / (a.total || 1),
      revised: (a, b) => b.revised / (b.total || 1) - a.revised / (a.total || 1),
      joined: (a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [rows, query, sort]);
  const current = rows.find((r) => r.uid === selected) ?? null;

  const list = (
    <View style={{ gap: 8, flex: 1 }}>
      {shown.map((r) => {
        const on = r.uid === selected;
        const inactive = (daysSince(r.lastActiveAt) ?? 99) >= 7;
        return (
          <Pressable key={r.uid} accessibilityRole="button" onPress={() => setSelected(on ? null : r.uid)}>
            <Card style={{ gap: 8, padding: 14, borderColor: on ? c.accent : c.line, borderWidth: on ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
                <T style={{ flex: 1, fontWeight: '800' }} numberOfLines={1}>
                  {r.name}
                </T>
                <T variant="small" color={inactive ? c.rev : c.muted}>
                  {ago(r.lastActiveAt)}
                </T>
              </View>
              <T variant="small" numberOfLines={1}>
                {r.email || 'email not synced yet'} · {r.stream}
                {r.onboarded ? '' : ' · setting up'}
              </T>
              <View style={{ gap: 4 }}>
                <Bar value={r.total ? r.read / r.total : 0} color={c.done} height={6} />
                <Bar value={r.total ? r.revised / r.total : 0} color={c.rev} height={6} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <T variant="small">
                  {r.read}/{r.total} read · {r.revised} revised
                </T>
                <T variant="small">Streak {r.streak}</T>
                <T variant="small">Lv {r.level}</T>
                <PaceTag pace={r.pace} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      {shown.length === 0 && (
        <Card style={{ alignItems: 'center', padding: 28 }}>
          <T variant="small">{rows.length ? 'No student matches that search.' : 'No students have signed up yet.'}</T>
        </Card>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16, maxWidth: 1200, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <T variant="title">Students</T>
          <T variant="small">
            PCMB Tracker admin · read-only{loadedAt ? ` · updated ${new Date(loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={refreshing ? 'Refreshing…' : 'Refresh'} kind="secondary" onPress={onRefresh} disabled={refreshing} icon={<Ionicons name="refresh" size={16} color={c.accent} />} />
          {Platform.OS === 'web' && (
            <Button label="Download CSV" kind="secondary" onPress={() => downloadCsv(rows)} disabled={!rows.length} icon={<Ionicons name="download-outline" size={16} color={c.accent} />} />
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Students" value={String(summary.students)} hint={`${summary.notStarted} not started`} />
        <Stat label="Active this week" value={String(summary.activeWeek)} hint="ticked something in 7 days" />
        <Stat label="Avg read" value={`${summary.avgReadPct}%`} hint="of their chapters" />
        <Stat label="Avg revised" value={`${summary.avgRevisedPct}%`} hint="of their chapters" />
      </View>

      <View style={{ gap: 10 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          placeholderTextColor={c.faint}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, fontSize: 15, color: c.ink, backgroundColor: c.surface }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
          ))}
        </View>
      </View>

      {wide ? (
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ width: 380 }}>{list}</View>
          <View style={{ flex: 1 }}>
            {current ? (
              <StudentDetail row={current} onClose={() => setSelected(null)} />
            ) : (
              <Card style={{ alignItems: 'center', padding: 40, gap: 6 }}>
                <Ionicons name="person-outline" size={28} color={c.faint} />
                <T variant="small">Pick a student to see every chapter they've read and revised.</T>
              </Card>
            )}
          </View>
        </View>
      ) : current ? (
        <StudentDetail row={current} onClose={() => setSelected(null)} />
      ) : (
        list
      )}
    </ScrollView>
  );
}
