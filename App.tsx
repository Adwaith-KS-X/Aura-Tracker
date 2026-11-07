import { ProgressDashboard, MacroLogging } from './src/ProgressDashboard';
import { ErrorBoundary } from './src/ErrorBoundary';
import { TypographyProvider } from './src/Typography';
import { Text, TextInput } from './src/Typography';
import { ExercisePicker } from './src/exercises/ExercisePicker';
import { MotionView, MotionModal, PressableSpring, AnimatedProgressBar } from './src/Motion';
import { WaterHistory } from './src/WaterHistory';
import { corners } from './src/theme';
import React, { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { uid } from './src/uuid';
import { formatTimeSafe, formatDateSafe, formatFullDateSafe, formatNumberSafe } from './src/dateUtils';
import { ActivityIndicator, Animated, AppState, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from './src/dialogs';
import { emptyData, sortedWeights, weightKey, localDay, positiveNumber, recentDays, saveWeight, weightChange, type TrackerData, type WeightEntry } from './src/domain';
import { loadData, persistData } from './src/storage';
import { LocalProfileGate } from './src/LocalProfileGate';
import type { LocalTrackerContext } from './src/localProfileModel';
import { profileBMI } from './src/bmi';
import { kgToPounds, poundsToKg, round } from './src/account/profile';

type Tab = 'Today' | 'Training' | 'Progress';
type Editor = 'water' | 'goal' | null;
const C = { bg: '#000000', paper: '#121212', ink: '#F5F5F5', secondary: '#BDBDBD', muted: '#A3A3A3', line: '#2C2C2C', soft: '#242424' };
const tabs: Tab[] = ['Today', 'Training', 'Progress'];
const BusyContext = createContext(false);
const formatDay = (day: string, full = false) => formatDateSafe(day, full);
const number = (value: number) => formatNumberSafe(value, 1);

const NavIcon = memo(function NavIcon({ name, active }: { name: Tab; active: boolean }) {
  const color = active ? C.ink : C.muted;
  if (name === 'Today') return <View style={s.gridIcon}>{[0, 1, 2, 3].map(i => <View key={i} style={[s.gridSquare, { borderColor: color, borderWidth: active ? 2 : 1.5 }]} />)}</View>;
  if (name === 'Training') return <View style={s.dumbbell}><View style={[s.dumbbellBar, { backgroundColor: color, height: active ? 2 : 1.5 }]} /><View style={[s.dumbbellEnd, { left: 2, borderColor: color, borderWidth: active ? 2 : 1.5 }]} /><View style={[s.dumbbellEnd, { right: 2, borderColor: color, borderWidth: active ? 2 : 1.5 }]} /></View>;
  return <View style={s.chartIcon}>{[8, 14, 20].map((height, i) => <View key={i} style={{ width: 3.5, height, backgroundColor: color, borderRadius: 1.5, opacity: active ? 1 : 0.7 }} />)}</View>;
});

const FloatingTabItem = memo(function FloatingTabItem({
  item,
  active,
  onPress,
}: {
  item: Tab;
  active: boolean;
  onPress: () => void;
}) {
  const animScale = useRef(new Animated.Value(1)).current;
  const animPill = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animPill, {
        toValue: active ? 1 : 0,
        stiffness: 300,
        damping: 24,
        mass: 0.8,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(animScale, {
        toValue: active ? 1.04 : 1.0,
        stiffness: 320,
        damping: 22,
        mass: 0.6,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      if (active) {
        Animated.spring(animScale, {
          toValue: 1.0,
          stiffness: 300,
          damping: 24,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      }
    });
  }, [active, animPill, animScale]);

  const handlePressIn = () => {
    Animated.spring(animScale, {
      toValue: 0.90,
      stiffness: 400,
      damping: 22,
      mass: 0.5,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animScale, {
      toValue: 1.0,
      stiffness: 350,
      damping: 24,
      mass: 0.5,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={s.mobileTab}
    >
      <Animated.View
        style={[
          s.mobileTabInner,
          {
            transform: [{ scale: animScale }],
            backgroundColor: animPill.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(42,42,42,0)', 'rgba(42,42,42,1)'],
            }),
          },
        ]}
      >
        <NavIcon name={item} active={active} />
        <Text style={[s.navText, active && s.navActive]}>{item}</Text>
      </Animated.View>
    </Pressable>
  );
});

function AnimatedNotice({ notice }: { notice: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notice) {
      Animated.spring(anim, {
        toValue: 1,
        stiffness: 320,
        damping: 26,
        mass: 0.8,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [notice, anim]);

  if (!notice) return null;

  return (
    <Animated.View
      style={[
        s.notice,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={s.noticeText}>{notice}</Text>
    </Animated.View>
  );
}

function Button({ title, onPress, outline = false, small = false, disabled = false }: { title: string; onPress: () => void; outline?: boolean; small?: boolean; disabled?: boolean }) {
  const busy = useContext(BusyContext); disabled = disabled || busy;
  return (
    <PressableSpring
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.96}
      style={({ pressed }: { pressed: boolean }) => [s.button, outline && s.outlineButton, small && s.smallButton, (pressed || disabled) && { opacity: 0.65 }]}
    >
      <Text style={[s.buttonText, outline && { color: C.ink }]}>{title}</Text>
    </PressableSpring>
  );
}
function TextAction({ title, onPress, label }: { title: string; onPress: () => void; label?: string }) {
  const busy = useContext(BusyContext);
  return <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} accessibilityLabel={label ?? title} hitSlop={4} onPress={onPress} style={({ pressed }) => [s.textAction, (pressed || busy) && { opacity: 0.5 }]}><Text style={s.actionText}>{title}</Text></Pressable>;
}
function Field({ label, value, onChange, text = false, placeholder, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; text?: boolean; placeholder?: string; autoFocus?: boolean }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={text ? 'default' : 'decimal-pad'} autoFocus={autoFocus} maxLength={text ? 80 : 8} placeholder={placeholder} placeholderTextColor={C.muted} selectTextOnFocus={!text} style={s.input} /></View>;
}
function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  const { width } = useWindowDimensions();
  return <View style={[s.panel, style, width < 650 && { flex: undefined, flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }]}>{children}</View>;
}
function Empty({ title, detail }: { title: string; detail: string }) { return <View style={s.empty}><Text style={s.emptyTitle}>{title}</Text><Text style={s.body}>{detail}</Text></View>; }
function Remove({ onDelete, label }: { onDelete: () => void; label: string }) {
  return <TextAction title="Remove" label={`Delete ${label}`} onPress={() => Alert.alert('Remove entry?', label, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: onDelete }])} />;
}
function Metric({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 650;
  return <View style={s.flex}><Panel style={{ height: '100%', padding: compact ? 12 : 24, gap: 12 }}><Text style={[s.caption, compact && { fontSize: 9, letterSpacing: 0.3 }]}>{label}</Text><Text style={[s.metric, compact && { fontSize: 23 }]}>{value}<Text style={[s.unit, compact && { fontSize: 11 }]}>{unit ? ` ${unit}` : ''}</Text></Text><Text style={compact ? s.micro : s.body}>{detail}</Text></Panel></View>;
}

function Tracker({ account }: { account: LocalTrackerContext }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 800, twoColumns = width >= 650;
  const [data, setData] = useState<TrackerData>(emptyData);
  const latestData = useRef(data);
  const mounted = useRef(true), savingNow = useRef(false);
  const [saving, setSaving] = useState(false);
  const weightUnit = account.profile.weight_unit;
  const displayWeight = (kg: number) => weightUnit === 'lb' ? kgToPounds(kg) : kg;
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>('Today'), [today, setToday] = useState(localDay());
  const [editor, setEditor] = useState<Editor>(null);
  const lastEditor = useRef<Editor>('water');
  if (editor !== null) lastEditor.current = editor;
  const [waterHistoryOpen, setWaterHistoryOpen] = useState(false);
  const [water, setWater] = useState('250'), [goal, setGoal] = useState('2000'), [weight, setWeight] = useState('');
  const [exercise, setExercise] = useState(''), [sets, setSets] = useState('3'), [reps, setReps] = useState('10'), [load, setLoad] = useState('0');
  const [formError, setFormError] = useState(''), [notice, setNotice] = useState('');
  const [visibleEntries, setVisibleEntries] = useState(20);
  async function initialize() {
    setLoading(true);
    try { const saved = loadData(); if (mounted.current) { latestData.current = saved; setData(saved); setGoal(String(saved.goalMl)); setLoadError(false); } }
    catch { if (mounted.current) setLoadError(true); }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => {
    mounted.current = true; void initialize();
    const timer = setInterval(() => setToday(localDay()), 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setToday(localDay()); });
    return () => { mounted.current = false; clearInterval(timer); subscription.remove(); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);

  // Input changes do not rescan saved records. Summaries follow data and calendar changes.
  const summary = useMemo(() => {
    const days = recentDays(7, new Date(`${today}T12:00:00`));
    const dailyWater = new Map(days.map(day => [day, 0]));
    const todaysWater: TrackerData['water'] = [], todaysExercises: TrackerData['exercises'] = [];
    for (const entry of data.water) { const day = entry.day ?? localDay(new Date(entry.at)); if (dailyWater.has(day)) dailyWater.set(day, dailyWater.get(day)! + entry.ml); if (day === today) todaysWater.push(entry); }
    const trainingDays = new Set<string>(); let weeklySets = 0;
    for (const entry of data.exercises) { const day = entry.day ?? localDay(new Date(entry.at)); if (day === today) todaysExercises.push(entry); if (dailyWater.has(day)) { trainingDays.add(day); weeklySets += entry.sets; } }
    const weights = sortedWeights(data.weights);
    return { days, dailyWater, todaysWater: todaysWater.reverse(), todaysExercises: todaysExercises.reverse(), weights, latestWeight: weights[weights.length - 1], todayWeight: [...weights].reverse().find(entry => entry.day === today), change: weightChange(weights), trainingDays, weeklySets, todaySets: todaysExercises.reduce((sum, entry) => sum + entry.sets, 0) };
  }, [data, today]);
  const history = useMemo(() => [...data.exercises].reverse(), [data.exercises]);
  async function commit(update: (previous: TrackerData) => TrackerData, message?: string): Promise<boolean> {
    if (savingNow.current || !mounted.current) return false;
    savingNow.current = true; setSaving(true);
    const previous = latestData.current, next = update(previous);
    try { persistData(next); if (!mounted.current) return false; latestData.current = next; setData(next); if (message) setNotice(message); return true; }
    catch {
      if (mounted.current) {
        setLoadError(true);
        Alert.alert('Couldn’t confirm the save', 'Reload your tracker before adding another entry. This avoids accidentally saving an entry twice.');
      }
      return false;
    } finally { savingNow.current = false; if (mounted.current) setSaving(false); }
  }
  function navigate(next: Tab) { setTab(next); setFormError(''); setNotice(''); setVisibleEntries(20); }
  function addWater(ml: number) { void commit(previous => ({ ...previous, water: [...previous.water, { id: uid(), at: new Date().toISOString(), day: localDay(), ml }] }), `${number(ml)} ml added`); }
  function openEditor(next: Editor) { setFormError(''); setGoal(String(data.goalMl)); setEditor(next); }
  async function saveEditor() {
    const value = positiveNumber(editor === 'goal' ? goal : water, editor === 'goal' ? 10000 : 5000);
    if (value === null || value < (editor === 'goal' ? 100 : 1)) { setFormError(editor === 'goal' ? 'Enter a goal between 100 and 10,000 ml.' : 'Enter an amount between 1 and 5,000 ml.'); return; }
    if (editor === 'goal') { if (await commit(previous => ({ ...previous, goalMl: value }), 'Water goal updated')) setEditor(null); }
    else if (await commit(previous => ({ ...previous, water: [...previous.water, { id: uid(), at: new Date().toISOString(), day: localDay(), ml: value }] }), `${number(value)} ml added`)) setEditor(null);
  }
  async function logWeight() {
    const entered = positiveNumber(weight, weightUnit === 'kg' ? 700 : kgToPounds(700));
    const kg = entered === null ? null : weightUnit === 'lb' ? poundsToKg(entered) : entered;
    if (kg === null || kg < 1) { Alert.alert('Check weight', `Enter a weight from ${weightUnit === 'kg' ? '1 to 700 kg' : '2.21 to 1,543.23 lb'}.`); return; }
    if (await commit(previous => saveWeight(previous, localDay(), round(kg)), `${number(entered!)} ${weightUnit} saved for today`)) setWeight('');
  }
  async function logExercise() {
    const setCount = positiveNumber(sets, 100), repCount = positiveNumber(reps, 1000);
    const kg = /^0(?:\.0+)?$/.test(load.trim().replace(',', '.')) ? 0 : positiveNumber(load, 1000);
    if (!exercise.trim()) { setFormError('Enter an exercise name.'); return; }
    if (setCount === null || !Number.isInteger(setCount) || repCount === null || !Number.isInteger(repCount)) { setFormError('Use whole sets (1–100) and reps (1–1,000).'); return; }
    if (kg === null) { setFormError('Enter a load between 0 and 1,000 kg.'); return; }
    if (await commit(previous => ({ ...previous, exercises: [...previous.exercises, { id: uid(), at: new Date().toISOString(), day: localDay(), name: exercise.trim(), sets: setCount, reps: repCount, kg }] }), `${exercise.trim()} added`)) { setExercise(''); setFormError(''); }
  }
  const drank = summary.dailyWater.get(today) ?? 0, percent = Math.round(drank / data.goalMl * 100), lastWater = summary.todaysWater[0];
  const bmi = profileBMI(summary.latestWeight?.kg ?? account.profile.initial_weight_kg, account.profile.height_cm, account.profile.dob);
  const navigation = desktop
    ? <View accessibilityRole="tablist" style={s.desktopTabs}>{tabs.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => navigate(item)} style={({ pressed }) => [s.desktopTab, tab === item && s.desktopTabActive, pressed && { opacity: 0.5 }]}><NavIcon name={item} active={tab === item} /><Text style={[s.navText, tab === item && s.navActive]}>{item}</Text></Pressable>)}</View>
    : <View style={s.floatingTabWrapper}><View accessibilityRole="tablist" style={s.mobileTabs}>{tabs.map(item => <FloatingTabItem key={item} item={item} active={tab === item} onPress={() => navigate(item)} />)}</View></View>;
  if (loading) return <View style={s.center}><ActivityIndicator color={C.ink} /><Text style={s.body}>Loading Aura Tracker…</Text></View>;
  if (loadError) return <View style={s.center}><Text style={s.title}>Reload your tracker</Text><Text style={s.body}>We couldn’t confirm your latest records. Reload before making another change.</Text><Button title="Reload data" onPress={initialize} /><Button title="Profile" outline onPress={account.onOpenAccount} /></View>;

  return <BusyContext.Provider value={saving}><SafeAreaView style={s.safe}><StatusBar barStyle="light-content" /><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}><View style={[s.headerInner, desktop && s.headerWide]}><View style={s.brandGroup}><View style={s.brandMark}><View style={s.brandMarkInner} /></View><Text style={s.brand}>aura<Text style={s.brandLight}> tracker</Text></Text></View>{desktop && navigation}<Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={account.onOpenAccount} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '600' }}>{account.profile.name.slice(0, 1).toUpperCase()}</Text></Pressable></View></View>
    <MotionView transitionKey={tab} style={s.flex}><ScrollView key={tab} style={s.flex} contentContainerStyle={[s.content, !desktop && s.contentMobile]} keyboardShouldPersistTaps="handled">
      <View style={s.pageHeading}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>{tab === 'Today' ? 'Today' : tab === 'Training' ? 'Training log' : 'Progress'}</Text><Text style={s.subtitle}>{tab === 'Today' ? formatDay(today, true) : tab === 'Training' ? 'Exercises, sets, and reps.' : 'Your recorded activity over time.'}</Text></View>{tab === 'Today' && desktop && <Text style={s.pageMeta}>DAILY OVERVIEW</Text>}</View>
      {tab === 'Today' && <>
        <View style={[s.columns, !twoColumns && s.stack]}>
          <Panel style={s.flex}><View style={s.row}><Text style={s.section}>💧 Hydration</Text><View style={s.row}><TextAction title="History" onPress={() => setWaterHistoryOpen(true)} /><TextAction title="Edit goal" onPress={() => openEditor('goal')} /></View></View><View style={s.waterMetric}><Text style={s.heroNumber}>{number(drank)}</Text><Text style={s.heroUnit}>ml</Text></View><View style={s.progressLabels}><Text style={s.body}>of {number(data.goalMl)} ml daily goal</Text><Text style={s.progressPercent}>{percent}%</Text></View><AnimatedProgressBar percent={percent} style={s.progressTrack} fillColor={C.ink} /><View style={s.quickActions}><Button title="+ 250 ml" onPress={() => addWater(250)} /><Button title="+ 500 ml" outline onPress={() => addWater(500)} /><TextAction title="Custom" onPress={() => openEditor('water')} /></View><View style={s.cardFoot}><Text style={s.micro}>{lastWater ? `Last added at ${formatTimeSafe(lastWater.at)}` : 'No water logged today'}</Text>{lastWater && <TextAction title="Undo last" onPress={() => commit(previous => ({ ...previous, water: previous.water.filter(entry => entry.id !== lastWater.id) }), 'Last water entry removed')} />}</View></Panel>
          <Panel style={s.flex}><View style={s.row}><Text style={s.section}>⚖️ Body weight</Text><Text style={s.micro}>{summary.todayWeight ? 'Logged today' : 'Daily check-in'}</Text></View><View style={s.waterMetric}><Text style={s.heroNumber}>{summary.latestWeight ? number(displayWeight(summary.latestWeight.kg)) : '—'}</Text><Text style={s.heroUnit}>{weightUnit}</Text></View><Text style={s.body}>{summary.latestWeight ? `Last recorded ${formatDay(summary.latestWeight.day)}` : 'No weight entries yet'}</Text><View style={s.weightInputRow}><View style={s.flex}><Field label={`Today’s weight (${weightUnit})`} value={weight} onChange={setWeight} placeholder={summary.todayWeight ? number(displayWeight(summary.todayWeight.kg)) : 'e.g. 72.5'} /></View><Button title="Save weight" onPress={logWeight} disabled={!weight.trim()} /></View><Text style={s.micro}>Every save adds a new entry. Earlier measurements stay in your history.</Text></Panel>
        </View>
        <MacroLogging data={data} today={today} commit={commit} busy={saving}/>
        <Panel><View style={s.row}><View><Text style={s.section}>🏋️ Today’s training</Text><Text style={s.body}>{summary.todaysExercises.length} exercises · {summary.todaySets} sets</Text></View><Button small outline title="Log exercise" onPress={() => navigate('Training')} /></View>{summary.todaysExercises.length === 0 ? <Empty title="No exercises logged" detail="Your exercises will appear here after you log them." /> : <><View style={s.tableHeader}><Text style={[s.columnHeading, s.flex]}>EXERCISE</Text><Text style={s.columnHeading}>SETS × REPS</Text><Text style={[s.columnHeading, s.loadColumn]}>LOAD</Text></View>{summary.todaysExercises.slice(0, 5).map(entry => <View key={entry.id} style={s.tableRow}><Text style={[s.entryTitle, s.flex]}>{entry.name}</Text><Text style={s.tableNumber}>{entry.sets} × {entry.reps}</Text><Text style={[s.tableNumber, s.loadColumn]}>{entry.kg ? `${number(entry.kg)} kg` : 'BW'}</Text></View>)}{summary.todaysExercises.length > 5 && <TextAction title="View all exercises" onPress={() => navigate('Training')} />}</>}</Panel>
      </>}
      {tab === 'Training' && <View style={[s.columns, !twoColumns && s.stack]}>
        <Panel style={[s.flex, twoColumns && s.trainingForm]}><Text style={s.section}>Add exercise</Text><ExercisePicker value={exercise} onChange={setExercise} /><View style={s.columns}><View style={s.flex}><Field label="Sets" value={sets} onChange={setSets} /></View><View style={s.flex}><Field label="Reps per set" value={reps} onChange={setReps} /></View></View><Field label="Load (kg)" value={load} onChange={setLoad} /><Text style={s.micro}>Enter 0 for bodyweight exercises.</Text>{!!formError && <Text accessibilityRole="alert" style={s.formError}>{formError}</Text>}<Button title="Save exercise" onPress={logExercise} /></Panel>
        <Panel style={s.flex}><View style={s.row}><Text style={s.section}>Today’s session</Text><Text style={s.micro}>{summary.todaySets} sets</Text></View>{summary.todaysExercises.length === 0 ? <Empty title="Your log is empty" detail="Add your first exercise using the form." /> : summary.todaysExercises.slice(0, visibleEntries).map((entry, i) => <View style={s.exerciseRow} key={entry.id}><Text style={s.exerciseIndex}>{String(summary.todaysExercises.length - i).padStart(2, '0')}</Text><View style={s.flex}><Text style={s.entryTitle}>{entry.name}</Text><Text style={s.body}>{entry.sets} × {entry.reps} · {entry.kg === 0 ? 'Bodyweight' : `${number(entry.kg)} kg`}</Text></View><Remove label={entry.name} onDelete={() => commit(previous => ({ ...previous, exercises: previous.exercises.filter(item => item.id !== entry.id) }), 'Exercise removed')} /></View>)}{summary.todaysExercises.length > visibleEntries && <TextAction title="Show more exercises" onPress={() => setVisibleEntries(count => count + 20)} />}</Panel>
      </View>}
      {tab === 'Progress' && <>
        <ProgressDashboard data={data} profile={account.profile} today={today} commit={commit} busy={saving}/>
        <Panel style={s.flex}><Text style={s.section}>🏋️ Exercise history</Text>{history.length === 0 ? <Empty title="No exercises yet" detail="Saved exercises appear here." /> : history.slice(0, visibleEntries).map(entry => <View key={entry.id} style={s.entryRow}><View style={s.flex}><Text style={s.entryTitle}>{entry.name}</Text><Text style={s.micro}>{formatFullDateSafe(entry.day ?? localDay(new Date(entry.at)))}</Text><Text style={s.micro}>{entry.sets} × {entry.reps} · {entry.kg ? `${number(entry.kg)} kg` : 'Bodyweight'}</Text></View><Remove label={entry.name} onDelete={() => commit(previous => ({ ...previous, exercises: previous.exercises.filter(item => item.id !== entry.id) }), 'Exercise removed')} /></View>)}{history.length > visibleEntries && <TextAction title="Show more exercises" onPress={() => setVisibleEntries(count => count + 20)} />}</Panel>
      </>}
    </ScrollView></MotionView>
    <AnimatedNotice notice={notice} />
    {!desktop && navigation}
  </KeyboardAvoidingView>
  <MotionModal visible={editor !== null} onClose={() => setEditor(null)}><KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View accessibilityViewIsModal style={s.modalCard}><View style={s.row}><Text style={s.section}>{(editor ?? lastEditor.current) === 'goal' ? 'Daily water goal' : 'Add water'}</Text><TextAction title="Close" onPress={() => setEditor(null)} /></View><Field label={(editor ?? lastEditor.current) === 'goal' ? 'Daily goal (ml)' : 'Water amount (ml)'} value={(editor ?? lastEditor.current) === 'goal' ? goal : water} onChange={(editor ?? lastEditor.current) === 'goal' ? setGoal : setWater} autoFocus /><Text style={s.body}>{(editor ?? lastEditor.current) === 'goal' ? 'Choose your own daily target.' : 'Enter the amount you drank.'}</Text>{!!formError && <Text accessibilityRole="alert" style={s.formError}>{formError}</Text>}<Button title={(editor ?? lastEditor.current) === 'goal' ? 'Save goal' : 'Add water'} onPress={saveEditor} /></View></KeyboardAvoidingView></MotionModal>
  <MotionModal visible={waterHistoryOpen} onClose={() => setWaterHistoryOpen(false)} page><WaterHistory entries={data.water} onClose={() => setWaterHistoryOpen(false)} onRemove={id => { void commit(previous => ({ ...previous, water: previous.water.filter(entry => entry.id !== id) }), "Water entry removed"); }} /></MotionModal>
  </SafeAreaView></BusyContext.Provider>;
}
export default function App() { return <ErrorBoundary><TypographyProvider><SafeAreaProvider><StatusBar barStyle="light-content" /><LocalProfileGate>{account => <Tracker key={account.userId} account={account} />}</LocalProfileGate></SafeAreaProvider></TypographyProvider></ErrorBoundary>; }

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, safe: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 28, gap: 20 },
  header: { backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.line }, headerInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 24, height: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 }, headerWide: { paddingHorizontal: 32, height: 88 }, brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brand: { color: C.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 }, brandLight: { fontWeight: '400' }, brandMark: { width: 25, height: 25, borderWidth: 6, borderColor: C.ink, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, brandMarkInner: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.ink }, headerDate: { color: C.secondary, fontSize: 12 },
  desktopTabs: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', alignItems: 'stretch' }, desktopTab: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' }, desktopTabActive: { borderBottomColor: C.ink }, navText: { color: C.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 }, navActive: { color: C.ink, fontWeight: '700' }, floatingTabWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 28 : 16, paddingHorizontal: 24, pointerEvents: 'box-none' }, mobileTabs: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6, elevation: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, borderWidth: 1, borderColor: '#2A2A2A', width: '100%', maxWidth: 320 } as any, mobileTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 } as any, mobileTabInner: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 } as any, mobileTabActive: { backgroundColor: '#2A2A2A' } as any,
  gridIcon: { width: 19, height: 19, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }, gridSquare: { width: 8, height: 8, borderWidth: 1.5, borderRadius: 1.5 }, dumbbell: { width: 23, height: 21, transform: [{ rotate: '-30deg' }] }, dumbbellBar: { position: 'absolute', left: 0, right: 0, top: 10, height: 1.5 }, dumbbellEnd: { position: 'absolute', top: 5, width: 5, height: 12, borderWidth: 1.5, borderRadius: 1.5 }, chartIcon: { width: 20, height: 21, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 40, paddingBottom: 48, gap: 20 }, contentMobile: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 100, gap: 16 }, pageHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 8 }, title: { fontSize: 30, lineHeight: 38, letterSpacing: -1, fontWeight: '600', color: C.ink }, subtitle: { fontSize: 14, color: C.secondary, marginTop: 5, lineHeight: 22 }, pageMeta: { fontSize: 10, letterSpacing: 1.6, color: C.muted },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' }, stack: { flexDirection: 'column', alignItems: 'stretch', gap: 16 }, panel: { ...corners.card, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, padding: 24, gap: 18, minWidth: 0, width: '100%' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, section: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: C.ink }, body: { color: C.secondary, fontSize: 13, lineHeight: 21 }, micro: { color: C.muted, fontSize: 11, lineHeight: 18 }, caption: { fontSize: 10, color: C.secondary, letterSpacing: 1.2, fontWeight: '500' },
  waterMetric: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }, heroNumber: { fontSize: 54, fontWeight: '500', letterSpacing: -2.4, color: C.ink }, heroUnit: { color: C.muted, fontSize: 18 }, progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -6 }, progressPercent: { color: C.ink, fontSize: 12, fontWeight: '600' }, progressTrack: { height: 5, backgroundColor: C.soft, borderRadius: 3, overflow: 'hidden', marginTop: -8 }, progressFill: { height: '100%', backgroundColor: C.ink, borderRadius: 3 }, quickActions: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }, cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, minHeight: 40 },
  button: { ...corners.button, minHeight: 44, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink }, outlineButton: { backgroundColor: C.paper, borderColor: '#3A3A3A' }, smallButton: { minHeight: 40, paddingVertical: 9, paddingHorizontal: 12 }, buttonText: { color: C.paper, fontSize: 13, fontWeight: '600' }, textAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 2, flexShrink: 0 }, actionText: { color: C.secondary, fontSize: 12, textDecorationLine: 'underline', textDecorationColor: '#8A8A8A' },
  field: { gap: 8, minWidth: 0 }, fieldLabel: { fontSize: 12, color: C.secondary, lineHeight: 18 }, input: { ...corners.input, borderWidth: 1, borderColor: '#3A3A3A', backgroundColor: C.paper, color: C.ink, fontSize: 16, minHeight: 46, paddingHorizontal: 13, paddingVertical: 11 }, weightInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }, empty: { paddingVertical: 26, gap: 6, alignItems: 'flex-start', justifyContent: 'center', minHeight: 108 }, emptyTitle: { color: C.ink, fontSize: 14, fontWeight: '500' },
  tableHeader: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center' }, columnHeading: { color: C.muted, fontSize: 9, letterSpacing: 0.7 }, tableRow: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.soft, alignItems: 'center' }, tableNumber: { fontSize: 13, color: C.secondary, minWidth: 68, textAlign: 'right' }, loadColumn: { width: 54, minWidth: 54, textAlign: 'right' }, entryTitle: { color: C.ink, fontSize: 14, fontWeight: '500', lineHeight: 21 }, entryRow: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }, trainingForm: { maxWidth: 370 }, exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18 }, exerciseIndex: { color: C.muted, fontSize: 11, width: 20 }, formError: { color: C.ink, fontSize: 12, lineHeight: 19, borderLeftWidth: 2, borderLeftColor: C.ink, paddingLeft: 10 },
  metric: { color: C.ink, fontSize: 32, fontWeight: '500', letterSpacing: -1 }, unit: { fontSize: 14, color: C.muted, letterSpacing: 0, fontWeight: '400' }, bars: { height: 158, flexDirection: 'row', gap: 10 }, barColumn: { flex: 1, alignItems: 'center', gap: 8 }, barNumber: { color: C.secondary, fontSize: 10 }, barTrack: { width: '65%', flex: 1, backgroundColor: C.soft, justifyContent: 'flex-end', borderRadius: 2, overflow: 'hidden' }, barFill: { width: '100%', backgroundColor: C.ink, borderRadius: 2 }, weightPlot: { height: 160, marginVertical: 4 }, chartGuide: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.soft }, plotDot: { position: 'absolute', height: 6, width: 6, borderRadius: 3, backgroundColor: C.ink }, notice: { ...corners.notice, alignSelf: 'center', marginHorizontal: 20, marginBottom: 90, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.ink, maxWidth: 480 }, noticeText: { color: C.paper, fontSize: 13 }, modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, modalCard: { ...corners.modal, width: '100%', maxWidth: 400, backgroundColor: C.paper, padding: 24, gap: 20 },
});
