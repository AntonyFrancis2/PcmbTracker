import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const COLORS = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#9b5de5', '#f15bb5'];

type Piece = { x: number; drift: number; size: number; color: string; delay: number; spin: number; round: boolean };

/** A burst of falling paper confetti. Changing `burstKey` fires a new burst. */
export function Confetti({ burstKey, count = 70 }: { burstKey: number; count?: number }) {
  const { width, height } = Dimensions.get('window');
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(() => {
    // Deterministic per burst so a re-render mid-animation doesn't reshuffle pieces.
    let seed = burstKey * 9301 + 49297;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => ({
      x: rnd() * width,
      drift: (rnd() - 0.5) * 160,
      size: 6 + rnd() * 8,
      color: COLORS[Math.floor(rnd() * COLORS.length)],
      delay: rnd() * 0.25,
      spin: (rnd() - 0.5) * 6,
      round: rnd() > 0.6,
    }));
  }, [burstKey, count, width]);

  useEffect(() => {
    if (!burstKey) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [burstKey, progress]);

  if (!burstKey) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const t = progress.interpolate({ inputRange: [0, p.delay, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: -20,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? p.size : 2,
              backgroundColor: p.color,
              opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 180}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
