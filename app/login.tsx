import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { getApiErrorMessage, login, saveSession } from "../lib/auth";
import { initializeNotifications } from "../lib/notifications";

/* ── Icons ─────────────────────────────────────────────────── */

function LogoIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 56 56" fill="none">
      <Path d="M8 36 C8 36, 14 20, 28 20 C42 20, 48 36, 48 36" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={18} cy={36} r={5} fill="#fff" />
      <Circle cx={38} cy={36} r={5} fill="#fff" />
      <Rect x={12} y={26} width={32} height={14} rx={5} fill="#fff" />
      <Path d="M28 8 L28 20" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={28} cy={6} r={3} fill="#fff" />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth={2} strokeLinecap="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

function LockIcon({ color = "#9E9E9E" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth={2} strokeLinecap="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth={2} strokeLinecap="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  );
}

/* ── Main screen ────────────────────────────────────────────── */

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      Alert.alert("Invalid input", validationError);
      return;
    }

    setLoading(true);
    try {
      const session = await login({ email: email.trim(), password });
      await saveSession(session);
      // Register FCM token now that auth token is available
      void initializeNotifications();
      Alert.alert("Login successful", "Welcome back to Musafee.", [
        { text: "Continue", onPress: () => router.replace("/") },
      ]);
    } catch (error) {
      Alert.alert("Login failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <LogoIcon />
          </View>
          <Text style={s.heading}>Welcome back 👋</Text>
          <Text style={s.subheading}>Sign in to continue your journey</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          {/* Email */}
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<UserIcon />}
          />

          {/* Password */}
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            leftIcon={<LockIcon color={password ? "#0D0D0D" : "#9E9E9E"} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </TouchableOpacity>
            }
          />

          <TouchableOpacity style={s.forgotRow}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In button */}
        <TouchableOpacity
          onPress={() => void onSubmit()}
          disabled={loading}
          style={s.btnPrimary}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnPrimaryText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or continue with</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={s.socialRow}>
          <View style={s.socialBtn}>
            <Text style={s.socialBtnText}>Google</Text>
          </View>
        </View>

        {/* Sign Up link */}
        <TouchableOpacity onPress={() => router.push("/signup")} style={s.signupRow}>
          <Text style={s.signupText}>
            Don't have an account?{" "}
            <Text style={s.signupLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── InputField ─────────────────────────────────────────────── */

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
  leftIcon,
  rightIcon,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || Boolean(value);

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={[s.fieldRow, active && s.fieldRowActive]}>
        {leftIcon && <View style={s.fieldIcon}>{leftIcon}</View>}
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C2C2C2"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && <View style={s.fieldIconRight}>{rightIcon}</View>}
      </View>
    </View>
  );
}

/* ── Validation ─────────────────────────────────────────────── */

function validateLoginInput({ email, password }: { email: string; password: string }) {
  if (!email.trim()) return "Email is required.";
  if (!password) return "Password is required.";
  return null;
}

/* ── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 12 },

  /* Header */
  header: { paddingTop: 24, marginBottom: 36 },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#0D0D0D",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },
  heading: {
    fontSize: 32, fontWeight: "800",
    letterSpacing: -1, color: "#0D0D0D", marginBottom: 6,
  },
  subheading: { fontSize: 15, color: "#9E9E9E" },

  /* Form */
  form: { gap: 14, marginBottom: 24 },

  /* Field */
  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: "600",
    color: "#424242", letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E8E8E8",
    borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: "#FAFAFA", minHeight: 52,
  },
  fieldRowActive: { borderColor: "#0D0D0D", backgroundColor: "#fff" },
  fieldIcon: { marginRight: 10 },
  fieldIconRight: { marginLeft: 10 },
  fieldInput: {
    flex: 1, fontSize: 15, color: "#0D0D0D",
    paddingVertical: 14,
  },

  /* Forgot */
  forgotRow: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13, color: "#757575", fontWeight: "500" },

  /* Primary button */
  btnPrimary: {
    backgroundColor: "#0D0D0D", borderRadius: 16,
    paddingVertical: 17, alignItems: "center", marginBottom: 20,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  /* Divider */
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EBEBEB" },
  dividerText: { fontSize: 13, color: "#C2C2C2", fontWeight: "500" },

  /* Social */
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: "#E8E8E8", backgroundColor: "#FAFAFA",
    alignItems: "center", justifyContent: "center",
  },
  socialBtnText: { fontSize: 15, fontWeight: "700", color: "#424242" },

  /* Sign up */
  signupRow: { alignItems: "center", paddingBottom: 16, paddingTop: 4 },
  signupText: { fontSize: 14, color: "#9E9E9E" },
  signupLink: { color: "#0D0D0D", fontWeight: "700" },
});
