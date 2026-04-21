import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { getApiErrorMessage, getPrimaryRole, loadSession } from "../lib/auth";
import {
    DriverProfile,
    UploadDocumentFile,
    getMyDriverProfile,
    uploadDriverVerificationDocuments,
} from "../lib/driver";

export default function DriverVerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [cnicNumber, setCnicNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [cnicFrontFile, setCnicFrontFile] = useState<UploadDocumentFile | null>(
    null,
  );
  const [cnicBackFile, setCnicBackFile] = useState<UploadDocumentFile | null>(
    null,
  );
  const [licenseFile, setLicenseFile] = useState<UploadDocumentFile | null>(
    null,
  );

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    try {
      const session = await loadSession();
      const role = getPrimaryRole(session);
      if (!session || role !== "driver") {
        setIsAllowed(false);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setProfile(driverProfile);
      setCnicNumber(driverProfile.cnic_number || "");
      setLicenseNumber(driverProfile.license_number || "");
      setIsAllowed(true);
    } catch (error) {
      Alert.alert("Screen error", getApiErrorMessage(error));
      setIsAllowed(false);
    } finally {
      setLoading(false);
    }
  }

  async function pickDocument(
    setFile: (value: UploadDocumentFile | null) => void,
    label: string,
  ) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert(
          "Selection failed",
          `Could not read selected ${label} file.`,
        );
        return;
      }

      setFile({
        uri: asset.uri,
        name: asset.name || `${label.toLowerCase().replace(" ", "-")}.jpg`,
        type: asset.mimeType,
      });
    } catch (error) {
      Alert.alert("Picker error", getApiErrorMessage(error));
    }
  }

  async function onSubmitVerificationDocuments() {
    const normalizedCnic = cnicNumber.trim();
    if (!/^\d{13}$/.test(normalizedCnic)) {
      Alert.alert(
        "Invalid CNIC",
        "CNIC must be exactly 13 digits without dashes.",
      );
      return;
    }

    if (!cnicFrontFile || !cnicBackFile) {
      Alert.alert(
        "Missing files",
        "Please select CNIC front and CNIC back images.",
      );
      return;
    }

    setUploadingDocs(true);
    try {
      const response = await uploadDriverVerificationDocuments({
        cnic_number: normalizedCnic,
        cnic_front: cnicFrontFile,
        cnic_back: cnicBackFile,
        license_number: licenseNumber.trim() || undefined,
        license_doc: licenseFile || undefined,
      });

      Alert.alert(
        "Verification submitted",
        response.message || "Documents uploaded successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/driver-profile"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Upload failed", getApiErrorMessage(error));
    } finally {
      setUploadingDocs(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#22d3ee" />
        <Text className="mt-3 text-sm text-slate-300">
          Loading verification...
        </Text>
      </View>
    );
  }

  if (!isAllowed) {
    return (
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerClassName="px-6 pb-16 pt-12"
      >
        <Text className="text-3xl font-black text-white">
          Driver Verification
        </Text>
        <Text className="mt-2 text-sm text-slate-300">
          This page is available for logged-in drivers only.
        </Text>

        <Pressable
          onPress={() => router.replace("/driver-profile")}
          className="mt-7 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-cyan-300">
            Back to Driver Profile
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  const isVerified = profile?.verification_status === "verified";

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-16 pt-12"
    >
      <Text className="text-3xl font-black text-white">
        Driver Verification
      </Text>
      <Text className="mt-2 text-sm text-slate-300">
        Upload verification documents to complete account verification.
      </Text>

      {isVerified ? (
        <View className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <Text className="text-sm font-semibold text-emerald-200">
            Verification Complete
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-200">
            Your account is already verified.
          </Text>
          <Pressable
            onPress={() => router.replace("/driver-profile")}
            className="mt-4 items-center rounded-xl bg-emerald-400 px-4 py-3"
          >
            <Text className="text-base font-semibold text-emerald-950">
              Back to Driver Profile
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-sm font-semibold text-slate-200">
            CNIC Number
          </Text>
          <TextInput
            value={cnicNumber}
            onChangeText={setCnicNumber}
            keyboardType="number-pad"
            maxLength={13}
            placeholder="13 digits without dashes"
            placeholderTextColor="#64748b"
            className="mt-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mb-2 mt-4 text-sm font-semibold text-slate-200">
            CNIC Front Image
          </Text>
          <Pressable
            onPress={() => void pickDocument(setCnicFrontFile, "CNIC Front")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-sm text-cyan-300">
              {cnicFrontFile ? cnicFrontFile.name : "Select CNIC Front"}
            </Text>
          </Pressable>

          <Text className="mb-2 mt-4 text-sm font-semibold text-slate-200">
            CNIC Back Image
          </Text>
          <Pressable
            onPress={() => void pickDocument(setCnicBackFile, "CNIC Back")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-sm text-cyan-300">
              {cnicBackFile ? cnicBackFile.name : "Select CNIC Back"}
            </Text>
          </Pressable>

          <Text className="mb-2 mt-4 text-sm font-semibold text-slate-200">
            License Number (Optional)
          </Text>
          <TextInput
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="Optional"
            placeholderTextColor="#64748b"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mb-2 mt-4 text-sm font-semibold text-slate-200">
            License Image (Optional)
          </Text>
          <Pressable
            onPress={() => void pickDocument(setLicenseFile, "License")}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-sm text-cyan-300">
              {licenseFile
                ? licenseFile.name
                : "Select License Image (Optional)"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void onSubmitVerificationDocuments()}
            disabled={uploadingDocs}
            className="mt-5 items-center rounded-xl bg-emerald-400 px-4 py-3"
          >
            {uploadingDocs ? (
              <ActivityIndicator color="#052e16" />
            ) : (
              <Text className="text-base font-semibold text-emerald-950">
                Upload Verification Documents
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-3 items-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-base font-semibold text-slate-200">
              Cancel
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
