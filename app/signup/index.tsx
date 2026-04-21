import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    getApiErrorMessage,
    registerDriver,
    registerRider,
    saveSession,
    UserRole,
} from "../../lib/auth";

export default function SignupScreen() {
  const [role, setRole] = useState<UserRole>("rider");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    return role === "rider"
      ? "Riders are active immediately after signup."
      : "Drivers continue to verification after signup.";
  }, [role]);

  async function onSubmit() {
    const validationError = validateSignupInput({
      role,
      fullName,
      phone,
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
              phone: phone.trim(),
              password,
              gender: normalizedGender || undefined,
              date_of_birth: dateOfBirth.trim() || undefined,
            })
          : await registerDriver({
              full_name: fullName.trim(),
              email: email.trim(),
              phone: phone.trim(),
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
        [
          {
            text: "Continue",
            onPress: () => router.replace("/"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Signup failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-16 pt-12"
    >
      <Text className="text-3xl font-black text-slate-900">Create Account</Text>
      <Text className="mt-2 text-sm text-slate-500">{subtitle}</Text>

      <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-100 p-2">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setRole("rider")}
            className={`flex-1 rounded-xl px-4 py-3 ${
              role === "rider" ? "bg-slate-900" : "bg-stone-200"
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                role === "rider" ? "text-white" : "text-slate-600"
              }`}
            >
              Rider
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRole("driver")}
            className={`flex-1 rounded-xl px-4 py-3 ${
              role === "driver" ? "bg-slate-900" : "bg-stone-200"
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                role === "driver" ? "text-white" : "text-slate-600"
              }`}
            >
              Driver
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-8 gap-4">
        <Field
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
        />
        <Field
          label="Email *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Phone *"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+923001234567"
        />
        <Field
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Minimum 8 characters"
        />
        <GenderField
          label={role === "driver" ? "Gender *" : "Gender"}
          value={gender}
          onChange={setGender}
        />
        <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="mt-8 items-center rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-lg font-semibold text-white">
            Sign up as {role === "rider" ? "Rider" : "Driver"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push("/login")}
        className="mt-4 items-center rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
      >
        <Text className="text-base font-semibold text-slate-700">
          Already have an account? Login
        </Text>
      </Pressable>
    </ScrollView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  placeholder?: string;
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
  placeholder,
}: FieldProps) {
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-slate-900"
      />
    </View>
  );
}

type DateOfBirthFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

const GENDER_OPTIONS = ["male", "female", "other"] as const;
type GenderOption = (typeof GENDER_OPTIONS)[number];

type GenderFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function GenderField({ label, value, onChange }: GenderFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedGender =
    GENDER_OPTIONS.find((option) => option === value) || "";

  function onSelect(option: GenderOption) {
    onChange(option);
    setIsOpen(false);
  }

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-700">{label}</Text>

      <Pressable
        onPress={() => setIsOpen((current) => !current)}
        className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3"
      >
        <Text
          className={`text-base ${selectedGender ? "text-slate-900" : "text-slate-400"}`}
        >
          {selectedGender ? formatGenderLabel(selectedGender) : "Select gender"}
        </Text>
      </Pressable>

      {isOpen ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-stone-300 bg-stone-50">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = selectedGender === option;

            return (
              <Pressable
                key={option}
                onPress={() => onSelect(option)}
                className={`px-4 py-3 ${isSelected ? "bg-slate-900" : "bg-stone-50"}`}
              >
                <Text
                  className={`text-base font-medium ${
                    isSelected ? "text-white" : "text-slate-700"
                  }`}
                >
                  {formatGenderLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function DateOfBirthField({ value, onChange }: DateOfBirthFieldProps) {
  const [isPickerVisible, setPickerVisible] = useState(false);

  function onDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setPickerVisible(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    onChange(formatDateForApi(selectedDate));
  }

  const pickerValue = value
    ? new Date(`${value}T00:00:00`)
    : new Date(2000, 0, 1);

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-700">
        Date of Birth
      </Text>

      <Pressable
        onPress={() => setPickerVisible(true)}
        className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3"
      >
        <Text
          className={`text-base ${value ? "text-slate-900" : "text-slate-400"}`}
        >
          {value || "Select date"}
        </Text>
      </Pressable>

      {isPickerVisible ? (
        <View className="mt-2 rounded-xl border border-stone-300 bg-stone-50 px-2 py-2">
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={onDateChange}
          />

          {Platform.OS === "ios" ? (
            <Pressable
              onPress={() => setPickerVisible(false)}
              className="mt-2 items-center rounded-lg bg-stone-200 py-2"
            >
              <Text className="font-semibold text-sky-600">Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatGenderLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function validateSignupInput(input: {
  role: UserRole;
  fullName: string;
  phone: string;
  password: string;
  gender: string;
  dateOfBirth: string;
}) {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const password = input.password;
  const gender = input.gender.trim().toLowerCase();
  const dateOfBirth = input.dateOfBirth.trim();

  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    return "Full name must be between 2 and 100 characters.";
  }

  if (!phone) {
    return "Phone is required.";
  }

  if (!/^\+\d{10,15}$/.test(phone)) {
    return "Phone must be in E.164 format, e.g. +923001234567.";
  }

  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (input.role === "driver" && !gender) {
    return "Gender is required for driver signup.";
  }

  if (gender && !/^(male|female|other)$/.test(gender)) {
    return "Gender must be one of: male, female, other.";
  }

  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return "Date of birth must be in YYYY-MM-DD format.";
  }

  return null;
}
