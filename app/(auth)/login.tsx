import { useAuth } from "@/src/context/AuthContext";
import { isValidEmail } from "@/src/lib/validation";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedEmail = email.trim();

  const fieldErrors = useMemo(() => {
    const errs: { email?: string; password?: string } = {};

    if (!trimmedEmail) errs.email = "Email is required.";
    else if (!isValidEmail(trimmedEmail)) errs.email = "Enter a valid email.";

    if (!password) errs.password = "Password is required.";

    return errs;
  }, [trimmedEmail, password]);

  const canSubmit = !loading && !fieldErrors.email && !fieldErrors.password;

  const onSubmit = async () => {
    setError(null);

    if (!canSubmit) {
      setError("Fix the highlighted fields first 🙂");
      return;
    }

    setLoading(true);
    const res = await login(trimmedEmail, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Login failed");
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 350 }}
      >
        <Text style={styles.title}>Welcome Back 📚</Text>
        <Text style={styles.subtitle}>Continue your story.</Text>

        {error ? (
          <MotiView
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 200 }}
            style={styles.errorBox}
          >
            <Text style={styles.errorText}>{error}</Text>
          </MotiView>
        ) : null}

        {/* Email */}
        <TextInput
          placeholder="Email"
          style={[
            styles.input,
            fieldErrors.email ? styles.inputBad : styles.inputGood,
          ]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {fieldErrors.email ? (
          <Text style={styles.hintBad}>{fieldErrors.email}</Text>
        ) : null}

        {/* Password + Eye */}
        <View
          style={[
            styles.passwordWrapper,
            fieldErrors.password ? styles.inputBad : styles.inputGood,
          ]}
        >
          <TextInput
            placeholder="Password"
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            autoCapitalize="none"
          />

          <Pressable
            onPress={() => setSecure((s) => !s)}
            hitSlop={10}
            accessibilityLabel={secure ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#555"
            />
          </Pressable>
        </View>
        {fieldErrors.password ? (
          <Text style={styles.hintBad}>{fieldErrors.password}</Text>
        ) : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </Pressable>

        <Text style={styles.small}>
          New here? <Link href="/(auth)/signup">Create account</Link>
        </Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#F5F1E8",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
    color: "#0F3D3E",
  },
  subtitle: {
    color: "#2E5E4E",
    marginBottom: 16,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
  },

  inputBad: {
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  inputGood: {
    borderWidth: 1,
    borderColor: "#eee",
  },

  hintBad: {
    color: "#b91c1c",
    fontWeight: "700",
    marginTop: 6,
  },

  button: {
    backgroundColor: "#0F3D3E",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontWeight: "900",
  },

  small: {
    marginTop: 14,
    color: "#444",
  },

  errorBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#b91c1c",
    marginBottom: 6,
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "900",
  },
});
