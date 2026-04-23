import { Link, router } from "expo-router";
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
import { getApiErrorMessage, login, saveSession } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      Alert.alert("Invalid input", validationError);
      return;
    }

    setLoading(true);
    try {
      const session = await login({
        email: email.trim(),
        password,
      });

      await saveSession(session);

      Alert.alert("Login successful", "Welcome back to Musafee.", [
        {
          text: "Continue",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert("Login failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-16 pt-12"
    >
      <Text className="text-3xl font-black text-slate-900">Login</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Sign in with your Musafee account.
      </Text>

      <View className="mt-8 gap-4">
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Your password"
        />
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="mt-8 items-center rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-lg font-semibold text-white">Login</Text>
        )}
      </Pressable>

      <Link
        href="/signup"
        className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 text-center text-base font-semibold text-slate-700"
      >
        Create a new account
      </Link>
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

type LoginInput = {
  email: string;
  password: string;
};

function validateLoginInput(input: LoginInput) {
  if (!input.email.trim()) {
    return "Email is required.";
  }

  if (!input.password) {
    return "Password is required.";
  }

  return null;
}
