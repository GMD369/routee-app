import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
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
import { getApiErrorMessage, registerRider, saveSession } from "../../lib/auth";

export default function RiderSignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const normalizedPhone = normalizePhoneNumber(phone);
    const validationError = validateRiderInput({
      fullName,
      email,
      phone: normalizedPhone,
      password,
      gender,
      dateOfBirth,
    });

    if (validationError) {
      Alert.alert("Invalid input", validationError);
      return;
    }

    const normalizedGender = gender.trim().toLowerCase();

    setLoading(true);
    try {
      const session = await registerRider({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        password,
        gender: normalizedGender || undefined,
        date_of_birth: dateOfBirth.trim() || undefined,
      });

      await saveSession(session);

      router.replace("/location-setup");
    } catch (error) {
      Alert.alert("Signup failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-12 pt-10"
    >
      <Text className="text-3xl font-bold text-white">
        Create Rider Account
      </Text>
      <Text className="mt-2 text-sm text-slate-300">
        Riders are active right away after registration.
      </Text>

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
        <GenderField label="Gender" value={gender} onChange={setGender} />
        <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="mt-8 items-center rounded-2xl bg-cyan-400 px-5 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text className="text-lg font-semibold text-slate-950">
            Sign up as Rider
          </Text>
        )}
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
      <Text className="mb-2 text-sm font-medium text-slate-200">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
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
      <Text className="mb-2 text-sm font-medium text-slate-200">{label}</Text>

      <Pressable
        onPress={() => setIsOpen((current) => !current)}
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
      >
        <Text
          className={`text-base ${selectedGender ? "text-white" : "text-slate-400"}`}
        >
          {selectedGender ? formatGenderLabel(selectedGender) : "Select gender"}
        </Text>
      </Pressable>

      {isOpen ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = selectedGender === option;

            return (
              <Pressable
                key={option}
                onPress={() => onSelect(option)}
                className={`px-4 py-3 ${isSelected ? "bg-cyan-400" : "bg-slate-900"}`}
              >
                <Text
                  className={`text-base font-medium ${
                    isSelected ? "text-slate-950" : "text-slate-200"
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
      <Text className="mb-2 text-sm font-medium text-slate-200">
        Date of Birth
      </Text>

      <Pressable
        onPress={() => setPickerVisible(true)}
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
      >
        <Text
          className={`text-base ${value ? "text-white" : "text-slate-400"}`}
        >
          {value || "Select date"}
        </Text>
      </Pressable>

      {isPickerVisible ? (
        <View className="mt-2 rounded-xl border border-slate-700 bg-slate-900 px-2 py-2">
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
              className="mt-2 items-center rounded-lg bg-slate-800 py-2"
            >
              <Text className="font-semibold text-cyan-300">Done</Text>
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

function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[\s-()]+/g, "");
}

function validateRiderInput(input: {
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

  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    return "Full name must be between 2 and 100 characters.";
  }

  if (!email) {
    return "Email is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email address is invalid.";
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

  if (gender && !/^(male|female|other)$/.test(gender)) {
    return "Gender must be one of: male, female, other.";
  }

  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return "Date of birth must be in YYYY-MM-DD format.";
  }

  return null;
}
