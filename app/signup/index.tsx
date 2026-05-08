import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
    getApiErrorMessage,
    registerDriver,
    registerRider,
    saveSession,
    UserRole,
} from "../../lib/auth";

/* ── Icons ─────────────────────────────────────────────────── */

function BackArrow() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D0D0D"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <Path d="M19 12H5" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Rect x={2} y={4} width={20} height={16} rx={2} />
      <Path d="M22 7l-10 7L2 7" />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.13h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.09 6.09l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9E9E9E"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

/* ── Main screen ────────────────────────────────────────────── */

export default function SignupScreen() {
  const [role, setRole] = useState<UserRole>("rider");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(
    () =>
      role === "rider"
        ? "Riders are active immediately after signup."
        : "Drivers continue to verification after signup.",
    [role],
  );

  async function onSubmit() {
    const normalizedPhone = normalizePhoneNumber(phone);
    const validationError = validateSignupInput({
      role,
      fullName,
      email,
      phone: normalizedPhone,
      password,
      gender,
      dateOfBirth,
    });

    if (!email.trim()) {
      Alert.alert("Missing fields", "Email is required.");
      return;
    }
    if (validationError) {
      Alert.alert("Invalid input", validationError);
      return;
    }

    const normalizedGender = gender.trim().toLowerCase();

    setLoading(true);
    try {
      const session =
        role === "rider"
          ? await registerRider({
              full_name: fullName.trim(),
              email: email.trim(),
              phone: normalizedPhone,
              password,
              gender: normalizedGender || undefined,
              date_of_birth: dateOfBirth.trim() || undefined,
            })
          : await registerDriver({
              full_name: fullName.trim(),
              email: email.trim(),
              phone: normalizedPhone,
              password,
              gender: normalizedGender,
              date_of_birth: dateOfBirth.trim() || undefined,
            });

      await saveSession(session);

      Alert.alert(
        "Signup successful",
        role === "rider"
          ? "Your rider account is ready."
          : "Driver account created. Upload verification documents next.",
        [{ text: "Continue", onPress: () => router.replace("/location-setup") }],
      );
    } catch (error) {
      Alert.alert("Signup failed", getApiErrorMessage(error));
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
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackArrow />
        </TouchableOpacity>

        {/* Title */}
        <Text style={s.heading}>Create Account</Text>
        <Text style={s.subheading}>{subtitle}</Text>

        {/* Role toggle */}
        <View style={s.roleToggle}>
          <TouchableOpacity
            onPress={() => setRole("rider")}
            style={[s.roleBtn, role === "rider" && s.roleBtnActive]}
          >
            <Text
              style={[s.roleBtnText, role === "rider" && s.roleBtnTextActive]}
            >
              Rider
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("driver")}
            style={[s.roleBtn, role === "driver" && s.roleBtnActive]}
          >
            <Text
              style={[s.roleBtnText, role === "driver" && s.roleBtnTextActive]}
            >
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={s.fields}>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ahmad Musafee"
            leftIcon={<UserIcon />}
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="hello@musafee.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<MailIcon />}
          />
          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+92 300 0000000"
            keyboardType="phone-pad"
            leftIcon={<PhoneIcon />}
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password"
            secureTextEntry
            autoCapitalize="none"
            leftIcon={<LockIcon />}
          />
          <GenderField
            label={role === "driver" ? "Gender *" : "Gender"}
            value={gender}
            onChange={setGender}
          />
          <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={() => void onSubmit()}
          disabled={loading}
          style={s.btnPrimary}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnPrimaryText}>
              Sign up as {role === "rider" ? "Rider" : "Driver"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={s.loginRow}
        >
          <Text style={s.loginText}>
            Already have an account? <Text style={s.loginLink}>Sign In</Text>
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
      </View>
    </View>
  );
}

/* ── GenderField ─────────────────────────────────────────────── */

const GENDER_OPTIONS = ["male", "female", "other"] as const;
type GenderOption = (typeof GENDER_OPTIONS)[number];

function GenderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = GENDER_OPTIONS.find((o) => o === value) ?? "";

  function onSelect(opt: GenderOption) {
    onChange(opt);
    setIsOpen(false);
  }

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <TouchableOpacity
        onPress={() => setIsOpen((v) => !v)}
        style={[s.fieldRow, selected ? s.fieldRowActive : null]}
      >
        <View style={s.fieldIcon}>
          <ChevronIcon />
        </View>
        <Text
          style={[
            s.fieldInput,
            { paddingVertical: 14 },
            !selected && { color: "#C2C2C2" },
          ]}
        >
          {selected ? formatGenderLabel(selected) : "Select gender"}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={s.dropdown}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => onSelect(opt)}
              style={[s.dropdownItem, selected === opt && s.dropdownItemActive]}
            >
              <Text
                style={[
                  s.dropdownText,
                  selected === opt && s.dropdownTextActive,
                ]}
              >
                {formatGenderLabel(opt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── DateOfBirthField ────────────────────────────────────────── */

function DateOfBirthField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [isPickerVisible, setPickerVisible] = useState(false);

  function onDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") setPickerVisible(false);
    if (event.type === "dismissed" || !selectedDate) return;
    onChange(formatDateForApi(selectedDate));
  }

  const pickerValue = value
    ? new Date(`${value}T00:00:00`)
    : new Date(2000, 0, 1);

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>DATE OF BIRTH</Text>
      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={[s.fieldRow, value ? s.fieldRowActive : null]}
      >
        <View style={s.fieldIcon}>
          <CalendarIcon />
        </View>
        <Text
          style={[
            s.fieldInput,
            { paddingVertical: 14 },
            !value && { color: "#C2C2C2" },
          ]}
        >
          {value || "Select date"}
        </Text>
      </TouchableOpacity>

      {isPickerVisible && (
        <View style={s.pickerWrap}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={s.pickerDoneBtn}
            >
              <Text style={s.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function formatDateForApi(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatGenderLabel(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[\s-()]+/g, "");
}

function validateSignupInput(input: {
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  dateOfBirth: string;
}) {
  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const password = input.password;
  const gender = input.gender.trim().toLowerCase();
  const dateOfBirth = input.dateOfBirth.trim();

  if (!fullName || fullName.length < 2 || fullName.length > 100)
    return "Full name must be between 2 and 100 characters.";
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Email address is invalid.";
  if (!phone) return "Phone is required.";
  if (!/^\+\d{10,15}$/.test(phone))
    return "Phone must be in E.164 format, e.g. +923001234567.";
  if (!password || password.length < 8)
    return "Password must be at least 8 characters.";
  if (input.role === "driver" && !gender)
    return "Gender is required for driver signup.";
  if (gender && !/^(male|female|other)$/.test(gender))
    return "Gender must be one of: male, female, other.";
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth))
    return "Date of birth must be in YYYY-MM-DD format.";
  return null;
}

/* ── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 48, paddingTop: 12 },

  /* Back */
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  /* Title */
  heading: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#0D0D0D",
    marginBottom: 4,
  },
  subheading: { fontSize: 14, color: "#9E9E9E", marginBottom: 28 },

  /* Role toggle */
  roleToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  roleBtnActive: { backgroundColor: "#0D0D0D" },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: "#9E9E9E" },
  roleBtnTextActive: { color: "#fff" },

  /* Fields */
  fields: { gap: 12, marginBottom: 24 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#424242",
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    minHeight: 50,
  },
  fieldRowActive: { borderColor: "#0D0D0D", backgroundColor: "#fff" },
  fieldIcon: { marginRight: 10 },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: "#0D0D0D",
  },

  /* Dropdown */
  dropdown: {
    marginTop: 4,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 13 },
  dropdownItemActive: { backgroundColor: "#0D0D0D" },
  dropdownText: { fontSize: 14, fontWeight: "500", color: "#424242" },
  dropdownTextActive: { color: "#fff" },

  /* Date picker */
  pickerWrap: {
    marginTop: 4,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerDoneBtn: {
    marginTop: 8,
    alignItems: "center",
    backgroundColor: "#EBEBEB",
    borderRadius: 10,
    paddingVertical: 10,
  },
  pickerDoneText: { fontSize: 14, fontWeight: "600", color: "#0D0D0D" },

  /* Submit */
  btnPrimary: {
    backgroundColor: "#0D0D0D",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 20,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  /* Login link */
  loginRow: { alignItems: "center", paddingBottom: 8 },
  loginText: { fontSize: 14, color: "#9E9E9E" },
  loginLink: { color: "#0D0D0D", fontWeight: "700" },
});
