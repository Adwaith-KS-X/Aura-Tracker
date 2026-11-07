import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduced(query.matches);
      update();
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduced(Boolean(value));
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', val =>
      setReduced(Boolean(val))
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

const TAB_ORDER: Record<string, number> = {
  Today: 0,
  Training: 1,
  Progress: 2,
};

export function MotionView({
  children,
  transitionKey,
  style,
}: {
  children: React.ReactNode;
  transitionKey: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const native = Platform.OS !== 'web';
  const opacity = useRef(new Animated.Value(1)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const prevKey = useRef(transitionKey);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevKey.current = transitionKey;
      return;
    }

    if (prevKey.current === transitionKey) return;

    if (reduced) {
      prevKey.current = transitionKey;
      opacity.setValue(1);
      offset.setValue(0);
      scale.setValue(1);
      return;
    }

    const prevIndex = TAB_ORDER[prevKey.current] ?? 0;
    const nextIndex = TAB_ORDER[transitionKey] ?? 0;
    const direction = nextIndex >= prevIndex ? 1 : -1;
    prevKey.current = transitionKey;

    opacity.stopAnimation();
    offset.stopAnimation();
    scale.stopAnimation();

    opacity.setValue(0.35);
    offset.setValue(direction * 22);
    scale.setValue(0.985);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
      }),
      Animated.spring(offset, {
        toValue: 0,
        stiffness: 280,
        damping: 26,
        mass: 0.9,
        overshootClamping: true,
        useNativeDriver: native,
      }),
      Animated.spring(scale, {
        toValue: 1,
        stiffness: 280,
        damping: 26,
        mass: 0.9,
        overshootClamping: true,
        useNativeDriver: native,
      }),
    ]).start();
  }, [transitionKey, reduced, opacity, offset, scale, native]);

  return (
    <Animated.View
      testID={`page-transition-${transitionKey}`}
      style={[
        style,
        {
          opacity,
          transform: [{ translateX: offset }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionModal({
  visible,
  onClose,
  children,
  page = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  page?: boolean;
}) {
  const reduced = useReducedMotion();
  const [rendered, setRendered] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) setRendered(true);
    if (!visible && !rendered) return;

    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) setRendered(false);
      return;
    }

    if (visible) {
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        stiffness: 280,
        damping: 28,
        mass: 0.9,
        overshootClamping: true,
        useNativeDriver: native,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: native,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered, reduced, progress, native]);

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View
        pointerEvents={visible ? 'auto' : 'none'}
        style={{ flex: 1, backgroundColor: page ? '#000000' : 'transparent' }}
      >
        {!page && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.5)',
                opacity: progress,
              },
            ]}
          />
        )}
        <Animated.View
          testID="modal-transition"
          style={{
            flex: 1,
            opacity: progress,
            transform: page
              ? [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  },
                ]
              : [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [48, 0],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
          }}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// Bouncy spring pressable for fluid tactile feedback across the whole app
export function PressableSpring({
  children,
  onPress,
  disabled = false,
  style,
  scaleTo = 0.95,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const native = Platform.OS !== 'web';

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      stiffness: 400,
      damping: 24,
      mass: 0.5,
      useNativeDriver: native,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      stiffness: 400,
      damping: 24,
      mass: 0.5,
      useNativeDriver: native,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Smooth animated progress bar for water hydration
export function AnimatedProgressBar({
  percent,
  style,
  fillColor = '#F5F5F5',
}: {
  percent: number;
  style?: StyleProp<ViewStyle>;
  fillColor?: string;
}) {
  const animatedPercent = useRef(new Animated.Value(Math.min(100, Math.max(0, percent)))).current;

  useEffect(() => {
    Animated.timing(animatedPercent, {
      toValue: Math.min(100, Math.max(0, percent)),
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, animatedPercent]);

  const widthInterpolation = animatedPercent.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={style}>
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: 3,
          width: widthInterpolation,
        }}
      />
    </View>
  );
}
