import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    getApiErrorMessage,
    registerDriver,
    saveSession,
} from "../../lib/auth";

export default function DriverSignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!fullName || !email || !phone || !password || !gender) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      const session = await registerDriver({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        gender: gender.trim(),
        date_of_birth: dateOfBirth.trim() || undefined,
      });

      await saveSession(session);

      Alert.alert(
        "Signup successful",
        "Driver account created. Upload verification documents next.",
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
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-12 pt-10"
    >
      <Text className="text-3xl font-bold text-white">
        Create Driver Account
      </Text>
      <Text className="mt-2 text-sm text-slate-300">
        Drivers need identity verification after registration.
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
        />
        <Field
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Field label="Gender *" value={gender} onChangeText={setGender} />
        <Field
          label="Date of Birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          autoCapitalize="none"
        />
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
            Sign up as Driver
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
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
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
        placeholderTextColor="#64748b"
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
