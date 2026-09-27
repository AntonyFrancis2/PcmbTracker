import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from './components';
import { usePalette } from './theme';

type Listener = (text: string) => void;
const listeners = new Set<Listener>();

/** Show a short floating message such as "+15 XP · ahead of plan". */
export function showToast(text: string) {
  listeners.forEach((l) => l(text));
}

export function XpToast() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const l: Listener = (t) => {
      setText(t);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setText(null));
      }, 1400);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [anim]);

  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 84, alignItems: 'center' }}>
      <Animated.View
        style={{
          backgroundColor: c.ink,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 999,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }}
      >
        <T style={{ fontWeight: '800' }} color={c.bg}>
          {text}
        </T>
      </Animated.View>
    </View>
  );
}
