import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function MusafeeTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const underlineAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  const iconAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      const isActive = i === state.index;
      Animated.spring(underlineAnims[i], {
        toValue: isActive ? 1 : 0,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
      Animated.spring(iconAnims[i], {
        toValue: isActive ? 1 : 0,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === i;
        const color = isFocused ? "#0D0D0D" : "#C2C2C2";

        const iconScale = iconAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        });
        const iconTranslateY = iconAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -1],
        });
        const iconOpacity = iconAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1],
        });

        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (options.tabBarButton) return null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={s.tab}
            activeOpacity={0.8}
          >
            {/* Underline indicator — springs in/out at top of tab */}
            <Animated.View
              style={[s.underline, { transform: [{ scaleX: underlineAnims[i] }] }]}
            />

            {/* Icon with spring scale + lift */}
            <Animated.View
              style={{
                transform: [
                  { scale: iconScale },
                  { translateY: iconTranslateY },
                ],
                opacity: iconOpacity,
              }}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 22 })}
            </Animated.View>

            {/* Label */}
            <Text
              style={[
                s.label,
                {
                  color,
                  fontWeight: isFocused ? "700" : "500",
                  letterSpacing: isFocused ? -0.1 : 0,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    gap: 5,
    position: "relative",
  },
  underline: {
    position: "absolute",
    top: 0,
    width: 28,
    height: 2.5,
    backgroundColor: "#0D0D0D",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  label: {
    fontSize: 11,
  },
});
