import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function AccountTabScreen() {
  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-white">Account</Text>
      <Text className="mt-2 text-sm text-slate-300">
        Choose how you want to use Routee.
      </Text>

      <View className="mt-7 gap-4">
        <Text className="text-xs uppercase tracking-[2px] text-slate-400">
          Create New Account
        </Text>

        <Link
          href="/signup"
          className="rounded-2xl border border-white bg-white px-5 py-4 text-center text-lg font-semibold text-slate-950"
        >
          Start Signup
        </Link>

        <Text className="mt-2 text-xs leading-5 text-slate-400">
          Pick Rider or Driver on the next screen using a segmented toggle.
        </Text>
      </View>
    </ScrollView>
  );
}
