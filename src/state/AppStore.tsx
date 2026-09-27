import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { signInWithGoogle, signOutEverywhere } from '../lib/googleAuth';
import { isFirebaseConfigured } from '../config';
import { emptyProgress, type Profile, type Progress, type Reward } from '../logic/types';
import { mergeProfile, mergeProgress, sameJSON, toggleMark } from '../logic/progress';
import { toDay } from '../logic/dates';
import {
  computeStats,
  computeXp,
  evaluateBadges,
  levelFor,
  milestoneById,
  newlyEarned,
  type BadgeDef,
} from '../logic/gamify';

export type Celebration =
  | { kind: 'badge'; badge: BadgeDef }
  | { kind: 'reward'; reward: Reward }
  | { kind: 'level'; level: number; name: string };

export type SyncState = 'device' | 'synced' | 'saving' | 'offline';

type Account = { uid: string; name: string; email: string | null; photo: string | null };

type Store = {
  status: 'loading' | 'signedOut' | 'ready';
  cloud: boolean;
  account: Account | null;
  profile: Profile;
  progress: Progress;
  sync: SyncState;
  celebrations: Celebration[];
  update: { version: string; url: string } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Returns the XP gained (negative when a tick is undone). */
  toggle: (chapterId: string, kind: 'f' | 'r') => number;
  updateProfile: (patch: Partial<Profile>) => void;
  addReward: (title: string, milestone: string) => void;
  removeReward: (id: string) => void;
  dismissCelebration: () => void;
};

const Ctx = createContext<Store | null>(null);

export const defaultProfile = (): Profile => ({
  onboarded: false,
  subjects: [],
  planStart: toDay(Date.now()),
  firstReadTarget: null,
  revisionTarget: null,
  rewards: [],
  theme: 'indigo',
  updatedAt: 0,
});

const cacheKey = (uid: string) => `c12tracker:${uid}`;
const DEVICE_UID = 'on-device';

/** Award badges and unlock rewards that are now met. Returns updated copies and what to celebrate. */
function settle(profile: Profile, progress: Progress, prevLevel: number | null, now = Date.now()) {
  if (!profile.onboarded) return { profile, progress, events: [] as Celebration[] };
  const stats = computeStats(profile, progress);
  const ctx = { stats, profile, progress, now };
  const events: Celebration[] = [];

  const fresh = newlyEarned(ctx);
  let nextProgress = progress;
  if (fresh.length) {
    const badges = { ...progress.badges };
    for (const b of fresh) {
      badges[b.id] = now;
      events.push({ kind: 'badge', badge: b });
    }
    nextProgress = { ...progress, badges, updatedAt: now };
  }

  const earned = new Set(evaluateBadges({ ...ctx, progress: nextProgress }).filter((b) => b.earned).map((b) => b.id));
  let nextProfile = profile;
  const unlocked: Reward[] = [];
  const rewards = profile.rewards.map((r) => {
    if (r.unlockedAt == null && earned.has(r.milestone)) {
      const u = { ...r, unlockedAt: now };
      unlocked.push(u);
      return u;
    }
    return r;
  });
  if (unlocked.length) {
    nextProfile = { ...profile, rewards, updatedAt: now };
    for (const r of unlocked) events.push({ kind: 'reward', reward: r });
  }

  if (prevLevel != null) {
    const lvl = levelFor(computeXp(computeStats(nextProfile, nextProgress), nextProfile));
    if (lvl.level > prevLevel) events.push({ kind: 'level', level: lvl.level, name: lvl.name });
  }
  // Show rewards first (the student set them), then badges, then level-ups.
  const order = { reward: 0, badge: 1, level: 2 } as const;
  events.sort((a, b) => order[a.kind] - order[b.kind]);
  return { profile: nextProfile, progress: nextProgress, events };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Store['status']>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [sync, setSync] = useState<SyncState>(isFirebaseConfigured ? 'synced' : 'device');
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [update, setUpdate] = useState<Store['update']>(null);

  // Latest values for async callbacks.
  const live = useRef({ profile, progress, uid: null as string | null });
  live.current.profile = profile;
  live.current.progress = progress;
  const lastRemote = useRef<{ profile: Profile | null; progress: Progress | null }>({ profile: null, progress: null });
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef(false);

  /* ------------------------------------------------------------ persistence */

  const saveLocal = useCallback((uid: string, p: Profile, g: Progress) => {
    AsyncStorage.setItem(cacheKey(uid), JSON.stringify({ profile: p, progress: g })).catch(() => {});
  }, []);

  const pushRemote = useCallback(async () => {
    const uid = live.current.uid;
    if (!db || !uid || uid === DEVICE_UID || writing.current) return;
    const { profile: p, progress: g } = live.current;
    const needProfile = !sameJSON(p, lastRemote.current.profile);
    const needProgress = !sameJSON(g, lastRemote.current.progress);
    if (!needProfile && !needProgress) {
      setSync('synced');
      return;
    }
    writing.current = true;
    setSync('saving');
    try {
      const jobs: Promise<void>[] = [];
      if (needProfile) jobs.push(setDoc(doc(db, 'users', uid), p));
      if (needProgress) jobs.push(setDoc(doc(db, 'progress', uid), g));
      // Firestore queues writes while offline; don't block the UI on the server ack.
      const timeout = new Promise<'slow'>((r) => setTimeout(() => r('slow'), 8000));
      const res = await Promise.race([Promise.all(jobs).then(() => 'ok' as const), timeout]);
      if (res === 'ok') {
        if (needProfile) lastRemote.current.profile = p;
        if (needProgress) lastRemote.current.progress = g;
        setSync('synced');
      } else {
        setSync('offline');
        Promise.all(jobs)
          .then(() => {
            if (needProfile) lastRemote.current.profile = p;
            if (needProgress) lastRemote.current.progress = g;
            setSync('synced');
          })
          .catch(() => {});
      }
    } catch {
      setSync('offline');
    } finally {
      writing.current = false;
    }
  }, []);

  const scheduleRemote = useCallback(() => {
    if (!db || live.current.uid === DEVICE_UID) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      pushRemote();
    }, 800);
  }, [pushRemote]);

  /** Apply a change: settle badges/rewards, update state, save locally and to the cloud. */
  const commit = useCallback(
    (nextProfile: Profile, nextProgress: Progress, celebrate: boolean) => {
      const prevLevel = celebrate
        ? levelFor(computeXp(computeStats(live.current.profile, live.current.progress), live.current.profile)).level
        : null;
      const settled = settle(nextProfile, nextProgress, prevLevel);
      live.current.profile = settled.profile;
      live.current.progress = settled.progress;
      setProfile(settled.profile);
      setProgress(settled.progress);
      if (celebrate && settled.events.length) setCelebrations((q) => [...q, ...settled.events]);
      const uid = live.current.uid;
      if (uid) saveLocal(uid, settled.profile, settled.progress);
      scheduleRemote();
    },
    [saveLocal, scheduleRemote],
  );

  /* ----------------------------------------------------------- sign-in flow */

  const loadFor = useCallback(
    async (uid: string) => {
      live.current.uid = uid;
      lastRemote.current = { profile: null, progress: null };
      let p = defaultProfile();
      let g = emptyProgress();
      try {
        const raw = await AsyncStorage.getItem(cacheKey(uid));
        if (raw) {
          const parsed = JSON.parse(raw) as { profile: Profile; progress: Progress };
          p = { ...defaultProfile(), ...parsed.profile };
          g = { ...emptyProgress(), ...parsed.progress };
        }
      } catch {
        // Corrupt cache: start from the cloud copy.
      }
      live.current.profile = p;
      live.current.progress = g;
      setProfile(p);
      setProgress(g);
      setStatus('ready');
    },
    [],
  );

  useEffect(() => {
    if (!auth || !db) {
      loadFor(DEVICE_UID);
      return;
    }
    const firestore = db;
    let unsubs: (() => void)[] = [];
    const stopDocs = () => {
      unsubs.forEach((u) => u());
      unsubs = [];
    };
    const off = onAuthStateChanged(auth, async (user: User | null) => {
      stopDocs();
      if (!user) {
        live.current.uid = null;
        setAccount(null);
        setStatus('signedOut');
        return;
      }
      setAccount({ uid: user.uid, name: user.displayName ?? 'Student', email: user.email, photo: user.photoURL });
      await loadFor(user.uid);

      const onRemote = (which: 'profile' | 'progress', data: unknown) => {
        if (which === 'profile') {
          const remote = { ...defaultProfile(), ...(data as Profile) };
          lastRemote.current.profile = remote;
          const merged = mergeProfile(live.current.profile, remote);
          if (!sameJSON(merged, live.current.profile)) commit(merged, live.current.progress, false);
          else if (!sameJSON(merged, remote)) scheduleRemote();
        } else {
          const remote = { ...emptyProgress(), ...(data as Progress) };
          lastRemote.current.progress = remote;
          const merged = mergeProgress(live.current.progress, remote);
          if (!sameJSON(merged, live.current.progress)) commit(live.current.profile, merged, false);
          else if (!sameJSON(merged, remote)) scheduleRemote();
        }
      };
      const missing = (which: 'profile' | 'progress') => {
        lastRemote.current[which] = null;
        scheduleRemote();
      };
      unsubs.push(
        onSnapshot(
          doc(firestore, 'users', user.uid),
          (s) => (s.exists() ? onRemote('profile', s.data()) : missing('profile')),
          () => setSync('offline'),
        ),
        onSnapshot(
          doc(firestore, 'progress', user.uid),
          (s) => (s.exists() ? onRemote('progress', s.data()) : missing('progress')),
          () => setSync('offline'),
        ),
      );

      if (Platform.OS === 'android') {
        getDoc(doc(firestore, 'config', 'app'))
          .then((s) => {
            const d = s.data() as { latestVersion?: string; apkUrl?: string } | undefined;
            const mine = Application.nativeApplicationVersion;
            if (d?.latestVersion && d.apkUrl && mine && compareVersions(d.latestVersion, mine) > 0) {
              setUpdate({ version: d.latestVersion, url: d.apkUrl });
            }
          })
          .catch(() => {});
      }
    });
    return () => {
      stopDocs();
      off();
    };
  }, [commit, loadFor, scheduleRemote]);

  /* ---------------------------------------------------------------- actions */

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    await pushRemote();
    await signOutEverywhere();
  }, [pushRemote]);

  const deleteAccount = useCallback(async () => {
    const uid = live.current.uid;
    if (!uid) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    await AsyncStorage.removeItem(cacheKey(uid)).catch(() => {});
    if (uid === DEVICE_UID || !auth || !db) {
      live.current.profile = defaultProfile();
      live.current.progress = emptyProgress();
      setProfile(defaultProfile());
      setProgress(emptyProgress());
      return;
    }
    await Promise.all([deleteDoc(doc(db, 'users', uid)), deleteDoc(doc(db, 'progress', uid))]);
    const user = auth.currentUser;
    if (user) {
      try {
        await user.delete();
      } catch (e) {
        if ((e as { code?: string }).code === 'auth/requires-recent-login') {
          await signInWithGoogle();
          await auth.currentUser?.delete();
        } else {
          throw e;
        }
      }
    }
    await signOutEverywhere().catch(() => {});
  }, []);

  const toggle = useCallback(
    (chapterId: string, kind: 'f' | 'r') => {
      const xpOf = () => computeXp(computeStats(live.current.profile, live.current.progress), live.current.profile);
      const before = xpOf();
      commit(live.current.profile, toggleMark(live.current.progress, chapterId, kind), true);
      return xpOf() - before;
    },
    [commit],
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      commit({ ...live.current.profile, ...patch, updatedAt: Date.now() }, live.current.progress, true);
    },
    [commit],
  );

  const addReward = useCallback(
    (title: string, milestone: string) => {
      const p = live.current.profile;
      if (!milestoneById(p.subjects, milestone)) return;
      const reward: Reward = {
        id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        milestone,
        createdAt: Date.now(),
        unlockedAt: null,
      };
      commit({ ...p, rewards: [...p.rewards, reward], updatedAt: Date.now() }, live.current.progress, true);
    },
    [commit],
  );

  const removeReward = useCallback(
    (id: string) => {
      const p = live.current.profile;
      commit({ ...p, rewards: p.rewards.filter((r) => r.id !== id), updatedAt: Date.now() }, live.current.progress, false);
    },
    [commit],
  );

  const dismissCelebration = useCallback(() => setCelebrations((q) => q.slice(1)), []);

  const value = useMemo<Store>(
    () => ({
      status,
      cloud: isFirebaseConfigured,
      account,
      profile,
      progress,
      sync,
      celebrations,
      update,
      signIn,
      signOut,
      deleteAccount,
      toggle,
      updateProfile,
      addReward,
      removeReward,
      dismissCelebration,
    }),
    [status, account, profile, progress, sync, celebrations, update, signIn, signOut, deleteAccount, toggle, updateProfile, addReward, removeReward, dismissCelebration],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}
