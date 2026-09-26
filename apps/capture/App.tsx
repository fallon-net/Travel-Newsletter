import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Button, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { User } from "@supabase/supabase-js";
import { captureEntrySchema, processingStateSchema, type ProcessingState } from "@travel-newsletter/shared";
import { supabase } from "./lib/supabase";

const contentModes = ["general", "ministry", "business", "personal"] as const;
const savedEntriesStorageKey = "travel-newsletter.saved-entries";
const reviewApiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL;

type SavedEntry = {
  id: string;
  title?: string;
  location?: string;
  capturedAt: string;
  contentMode: (typeof contentModes)[number];
  photoUris: string[];
  voiceNoteUri: string;
  voiceNoteDurationSeconds: number;
  processing: ProcessingState;
};

const processingLabels: Record<ProcessingState["status"], string> = {
  queued: "Queued for secure upload",
  uploading: "Uploading private media",
  transcribing: "Transcribing voice note",
  generating: "Creating newsletter draft",
  ready: "Ready for review",
  failed: "Processing needs attention"
};

export default function App() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [contentMode, setContentMode] = useState<(typeof contentModes)[number]>("general");
  const [message, setMessage] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [screen, setScreen] = useState<"home" | "capture">("home");
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recordedSeconds = Math.round(recorderState.durationMillis / 1000);
  const hasValidVoiceNote = recordedSeconds >= 30 && recordedSeconds <= 180 && Boolean(recorder.uri);
  const canSubmit = photos.length === 3 && hasValidVoiceNote;

  useEffect(() => {
    AsyncStorage.getItem(savedEntriesStorageKey).then((storedEntries) => {
      if (!storedEntries) {
        return;
      }

      try {
        const parsedEntries: unknown = JSON.parse(storedEntries);
        if (!Array.isArray(parsedEntries)) {
          throw new Error("Saved entries are not a list.");
        }

        setSavedEntries(
          parsedEntries.map((entry) => {
            const savedEntry = entry as SavedEntry & { processing?: unknown };
            const processing = processingStateSchema.safeParse(savedEntry.processing);
            return {
              ...savedEntry,
              processing: processing.success ? processing.data : { status: "queued" }
            };
          })
        );
      } catch {
        setMessage("Saved entries could not be loaded.");
      }
    });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const choosePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      selectionLimit: 3
    });

    if (!result.canceled) {
      setPhotos(result.assets.slice(0, 3));
      setMessage(result.assets.length === 3 ? "Three photos selected." : "Select exactly three photos.");
    }
  };

  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setMessage("Microphone permission is required for a voice note.");
      return;
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setMessage("Recording started. Record between 30 seconds and 3 minutes.");
  };

  const authenticate = async () => {
    setIsAuthenticating(true);
    setMessage("");
    const result = authMode === "signUp"
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setIsAuthenticating(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(authMode === "signUp" ? "Account created. Check email confirmation if enabled." : "Signed in.");
  };

  const saveEntry = async () => {
    const result = captureEntrySchema.safeParse({
      title: title.trim() || undefined,
      location: location.trim() || undefined,
      capturedAt: new Date(),
      contentMode,
      photoCount: photos.length,
      voiceNoteDurationSeconds: recordedSeconds
    });

    if (!result.success) {
      setMessage("Add exactly three photos and a 30-second to 3-minute voice note before saving.");
      return;
    }

    if (!user) {
      setMessage("Sign in before uploading a private entry.");
      return;
    }

    if (!reviewApiUrl) {
      setMessage("The review API URL is not configured.");
      return;
    }

    const localId = new Date().toISOString();
    const entry: SavedEntry = {
      id: localId,
      title: title.trim() || undefined,
      location: location.trim() || undefined,
      capturedAt: new Date().toISOString(),
      contentMode,
      photoUris: photos.map((photo) => photo.uri),
      voiceNoteUri: recorder.uri as string,
      voiceNoteDurationSeconds: recordedSeconds,
      processing: { status: "uploading" }
    };
    const nextEntries = [entry, ...savedEntries];

    setSavedEntries(nextEntries);
    await AsyncStorage.setItem(savedEntriesStorageKey, JSON.stringify(nextEntries));
    setIsUploading(true);
    setMessage("Uploading private media...");

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) {
        throw new Error("Your session expired. Sign in again.");
      }

      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          name: `photo-${index + 1}.jpg`,
          type: photo.mimeType ?? "image/jpeg"
        } as unknown as Blob);
      });
      formData.append("voiceNote", {
        uri: recorder.uri,
        name: "voice-note.m4a",
        type: "audio/m4a"
      } as unknown as Blob);
      formData.append("title", title.trim());
      formData.append("location", location.trim());
      formData.append("capturedAt", new Date().toISOString());
      formData.append("contentMode", contentMode);
      formData.append("voiceNoteDurationSeconds", String(recordedSeconds));

      const response = await fetch(`${reviewApiUrl.replace(/\/$/, "")}/api/entries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const payload = (await response.json()) as { entryId?: string; status?: ProcessingState["status"]; error?: string };
      if (!response.ok || !payload.entryId) {
        throw new Error(payload.error ?? "Upload failed. Retry the entry.");
      }

      const uploadedEntries = nextEntries.map((savedEntry) =>
        savedEntry.id === localId
          ? { ...savedEntry, id: payload.entryId as string, processing: { status: payload.status ?? "queued" } }
          : savedEntry
      );
      setSavedEntries(uploadedEntries);
      await AsyncStorage.setItem(savedEntriesStorageKey, JSON.stringify(uploadedEntries));
      setMessage("Entry uploaded and queued for processing.");
    } catch (error) {
      const failedEntries = nextEntries.map((savedEntry) =>
        savedEntry.id === localId
          ? { ...savedEntry, processing: { status: "failed" as const, errorMessage: error instanceof Error ? error.message : "Upload failed." } }
          : savedEntry
      );
      setSavedEntries(failedEntries);
      await AsyncStorage.setItem(savedEntriesStorageKey, JSON.stringify(failedEntries));
      setMessage("Upload failed. The entry is saved locally for retry.");
    } finally {
      setIsUploading(false);
    }
    setScreen("home");
  };

  if (screen === "home") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>TRAVEL NEWSLETTER</Text>
        <Text style={styles.title}>Your entries</Text>
        <Text style={styles.description}>Start a new story or return to a saved capture.</Text>
        {!user ? (
          <View style={styles.authCard}>
            <Text style={styles.label}>Sign in to protect your entries</Text>
            <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={authEmail} onChangeText={setAuthEmail} style={styles.input} />
            <TextInput placeholder="Password" secureTextEntry value={authPassword} onChangeText={setAuthPassword} style={styles.input} />
            <Button title={isAuthenticating ? "Working..." : authMode === "signUp" ? "Create account" : "Sign in"} onPress={authenticate} disabled={isAuthenticating} />
            <Button title={authMode === "signUp" ? "Use existing account" : "Create an account"} onPress={() => setAuthMode(authMode === "signUp" ? "signIn" : "signUp")} />
          </View>
        ) : (
          <>
            <Text style={styles.helper}>Signed in as {user.email}</Text>
            <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
          </>
        )}
        <Button title="New entry" onPress={() => setScreen("capture")} disabled={!user} />
        <Text style={styles.label}>Saved entries ({savedEntries.length})</Text>
        {savedEntries.length === 0 ? (
          <Text style={styles.helper}>No saved entries yet.</Text>
        ) : (
          savedEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryTitle}>{entry.title || "Untitled travel story"}</Text>
              <Text style={styles.helper}>
                {entry.location || "Location to confirm"} · {new Date(entry.capturedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.helper}>
                {entry.photoUris.length} photos · {entry.voiceNoteDurationSeconds}s voice note · {entry.contentMode}
              </Text>
              <Text style={styles.status}>{processingLabels[entry.processing.status]}</Text>
              {entry.processing.status === "failed" && entry.processing.errorMessage ? (
                <Text style={styles.error}>{entry.processing.errorMessage}</Text>
              ) : null}
            </View>
          ))
        )}
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Back to entries" onPress={() => setScreen("home")} />
      <Text style={styles.eyebrow}>NEW ENTRY</Text>
      <Text style={styles.title}>Capture a travel story</Text>
      <Text style={styles.description}>Three photos and one voice note become a reviewed newsletter draft.</Text>

      <Text style={styles.label}>Photos ({photos.length}/3)</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <Image key={photo.assetId ?? photo.uri} source={{ uri: photo.uri }} style={styles.photo} />
        ))}
      </View>
      <Button title="Choose exactly 3 photos" onPress={choosePhotos} />

      <Text style={styles.label}>Voice note</Text>
      <Text style={styles.helper}>Recorded: {recordedSeconds}s. Required: 30-180s.</Text>
      <Button title={recorderState.isRecording ? "Stop recording" : "Record voice note"} onPress={toggleRecording} />

      <Text style={styles.label}>Details</Text>
      <TextInput placeholder="Optional title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Confirm location" value={location} onChangeText={setLocation} style={styles.input} />
      <Text style={styles.helper}>Content mode</Text>
      <View style={styles.modeRow}>
        {contentModes.map((mode) => (
          <Pressable key={mode} onPress={() => setContentMode(mode)} style={[styles.mode, contentMode === mode && styles.selectedMode]}>
            <Text style={contentMode === mode ? styles.selectedModeText : styles.modeText}>{mode}</Text>
          </Pressable>
        ))}
      </View>

      <Button title={isUploading ? "Uploading..." : "Upload entry"} onPress={saveEntry} disabled={!canSubmit || isUploading} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 24,
    paddingBottom: 48
  },
  eyebrow: {
    color: "#9a5b35",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5
  },
  title: {
    color: "#20352f",
    fontSize: 32,
    fontWeight: "700"
  },
  description: {
    color: "#53635d",
    fontSize: 16,
    lineHeight: 24
  },
  label: {
    alignSelf: "stretch",
    color: "#20352f",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12
  },
  helper: {
    alignSelf: "stretch",
    color: "#53635d"
  },
  photoGrid: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    minHeight: 92
  },
  photo: {
    backgroundColor: "#e8eee9",
    borderRadius: 8,
    flex: 1,
    height: 92
  },
  input: {
    alignSelf: "stretch",
    borderColor: "#b9c8c0",
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 16,
    padding: 12
  },
  modeRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  mode: {
    borderColor: "#b9c8c0",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  selectedMode: {
    backgroundColor: "#20352f",
    borderColor: "#20352f"
  },
  modeText: {
    color: "#20352f"
  },
  selectedModeText: {
    color: "#ffffff"
  },
  message: {
    color: "#9a5b35",
    fontWeight: "600",
    textAlign: "center"
  },
  entryCard: {
    alignSelf: "stretch",
    backgroundColor: "#eef3ef",
    borderColor: "#c8d5cc",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  entryTitle: {
    color: "#20352f",
    fontSize: 18,
    fontWeight: "700"
  },
  status: {
    color: "#9a5b35",
    fontWeight: "700"
  },
  error: {
    color: "#9b2c2c"
  },
  authCard: {
    alignSelf: "stretch",
    backgroundColor: "#eef3ef",
    borderColor: "#c8d5cc",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16
  }
});