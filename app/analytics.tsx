import { useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Page } from '../src/components/Page';
import { Entry, loadEntries, onChange } from '../src/lib/storage';
import { theme } from '../src/lib/theme';

const dayStart = (t: number) => new Date(t).setHours(0, 0, 0, 0);
const prevDay = (t: number) => { const d = new Date(t); d.setDate(d.getDate() - 1); return d.setHours(0, 0, 0, 0); }; // DST-safe
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // weeks start on Monday
const MAX_MONTHS = 12;
const FAINT = 'rgba(255,255,255,0.08)';
const OUTLINE = 'rgba(255,255,255,0.35)';

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 2 }}>
      <Text style={{ color: theme.fg, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 }}>{value}</Text>
      <Text style={[theme.type.caption, { color: theme.dim }]}>{label}</Text>
    </View>
  );
}

type DotState = 'on' | 'missed' | 'off';

function Dot({ state, today }: { state: DotState; today: boolean }) {
  return (
    <View
      style={{
        width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: today ? theme.fg : 'transparent',
      }}
    >
      <View
        style={{
          width: 12, height: 12, borderRadius: 6,
          backgroundColor: state === 'on' ? theme.fg : state === 'off' ? FAINT : 'transparent',
          borderWidth: state === 'missed' ? 1 : 0,
          borderColor: OUTLINE,
        }}
      />
    </View>
  );
}

function Month({ month, days, first, today, cell }: { month: Date; days: Set<number>; first: number | null; today: number; cell: number }) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // blank cells before the 1st (Monday = 0)
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1).getTime()),
  ];
  const n = cells.filter((c) => c !== null && days.has(c)).length;
  const name = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={{ gap: 8 }}>
      <View
        accessible
        accessibilityLabel={`${name}, ${n} ${n === 1 ? 'day' : 'days'} journaled`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text style={[theme.type.title, { color: theme.fg }]}>{name}</Text>
        <Text style={[theme.type.caption, { color: theme.dim }]}>{n} {n === 1 ? 'day' : 'days'}</Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
      >
        {cells.map((c, i) => {
          const state: DotState =
            c !== null && days.has(c) ? 'on' : c !== null && first !== null && c >= first && c <= today ? 'missed' : 'off';
          return (
            <View key={i} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
              {c !== null && <Dot state={state} today={c === today} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Legend({ filled, label }: { filled: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: filled ? theme.fg : 'transparent', borderWidth: filled ? 0 : 1, borderColor: OUTLINE,
        }}
      />
      <Text style={[theme.type.caption, { color: theme.dim }]}>{label}</Text>
    </View>
  );
}

export default function Analytics() {
  const { width } = useWindowDimensions();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const load = () => loadEntries().then(setEntries);
    load();
    return onChange(load);
  }, []);

  const stats = useMemo(() => {
    const today = dayStart(Date.now());
    const days = new Set(entries.map((e) => dayStart(e.createdAt)));
    const first = entries.length ? dayStart(Math.min(...entries.map((e) => e.createdAt))) : null;
    const totalMs = entries.reduce((s, e) => s + (e.durationMs ?? 0), 0);
    const missing = entries.filter((e) => e.durationMs == null).length;
    let streak = 0; // consecutive journaled days ending today (or yesterday, if today isn't done yet)
    for (let d = days.has(today) ? today : prevDay(today); days.has(d); d = prevDay(d)) streak++;
    return { today, days, first, totalMs, missing, streak };
  }, [entries]);

  const mins = stats.totalMs / 60000;
  const minutesText = stats.totalMs === 0 ? '0' : mins < 1 ? '<1' : Math.round(mins).toLocaleString();

  const now = new Date();
  const start = stats.first !== null ? new Date(stats.first) : now;
  const count = Math.max(
    1,
    Math.min(MAX_MONTHS, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1),
  );
  const months = Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const cell = Math.floor((width - 48) / 7);

  return (
    <Page title="Insights">
      <View style={{ gap: 4 }}>
        <Text
          accessibilityLabel={`${minutesText} minutes recorded`}
          style={{ color: theme.fg, fontSize: 56, lineHeight: 60, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}
        >
          {minutesText}
        </Text>
        <Text style={[theme.type.body, { color: theme.dim }]}>minutes recorded</Text>
        {stats.missing > 0 && (
          <Text style={[theme.type.caption, { color: theme.dim, marginTop: 4 }]}>
            {stats.missing} older {stats.missing === 1 ? 'entry has' : 'entries have'} no recorded length and {stats.missing === 1 ? 'isn’t' : 'aren’t'} counted.
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile value={String(entries.length)} label={entries.length === 1 ? 'entry' : 'entries'} />
        <Tile value={String(stats.streak)} label="day streak" />
      </View>

      <View style={{ gap: 16, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Legend filled label="Journaled" />
          <Legend filled={false} label="Missed" />
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={{ width: cell, textAlign: 'center', color: theme.dim, fontSize: 11, fontWeight: '500' }}>{d}</Text>
          ))}
        </View>
        <View style={{ gap: 28 }}>
          {months.map((m) => (
            <Month key={m.getTime()} month={m} days={stats.days} first={stats.first} today={stats.today} cell={cell} />
          ))}
        </View>
      </View>
    </Page>
  );
}

