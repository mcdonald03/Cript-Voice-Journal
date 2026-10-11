import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Two soft auras cross-fade slowly: lime/yellow <-> blue/peach.
export function AmbientGlow({ y = 0.5, intensity = 1 }: { y?: number; intensity?: number }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 0.5 : 0); // reduced motion: static blend of both

  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce]);

  const warm = useDerivedValue(() => (1 - t.value) * intensity);
  const cool = useDerivedValue(() => t.value * intensity);
  const r = width * 0.85;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={warm}>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={vec(width * 0.46, height * y)}
              r={r}
              colors={['rgba(198,241,53,0.55)', 'rgba(255,228,92,0.22)', 'rgba(198,241,53,0)']}
              positions={[0, 0.45, 1]}
            />
          </Rect>
        </Group>
        <Group opacity={cool}>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={vec(width * 0.54, height * y + 24)}
              r={r}
              colors={['rgba(77,124,255,0.55)', 'rgba(255,179,138,0.25)', 'rgba(77,124,255,0)']}
              positions={[0, 0.45, 1]}
            />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}