import { useAuth } from "@/src/context/AuthContext";
import { isValidEmail } from "@/src/lib/validation";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score; // 0..5
}

function passwordLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Okay";
  if (score === 3) return "Good";
  if (score === 4) return "Strong";
  return "Very strong";
}

export default function Signup() {
  const { signup } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  const pwScore = useMemo(() => passwordScore(password), [password]);
  const pwText = useMemo(() => passwordLabel(pwScore), [pwScore]);

  const fieldErrors = useMemo(() => {
    const errs: { name?: string; email?: string; password?: string } = {};

    if (!trimmedName) errs.name = "Name is required.";
    else if (trimmedName.length < 2) errs.name = "Name looks too short.";

    if (!trimmedEmail) errs.email = "Email is required.";
    else if (!isValidEmail(trimmedEmail)) errs.email = "Enter a valid email.";

    // Password rules (good baseline before backend)
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Min 8 characters.";
    else if (!/[A-Z]/.test(password)) errs.password = "Add 1 uppercase letter.";
    else if (!/[0-9]/.test(password)) errs.password = "Add 1 number.";
    else if (!/[^A-Za-z0-9]/.test(password))
      errs.password = "Add 1 special character.";

    return errs;
  }, [trimmedName, trimmedEmail, password]);

  const canSubmit =
    !loading &&
    !fieldErrors.name &&
    !fieldErrors.email &&
    !fieldErrors.password;

  const onSubmit = async () => {
    setError(null);

    // final guard (even if button somehow enabled)
    if (!canSubmit) {
      setError("Fix the highlighted fields first 🙂");
      return;
    }

    setLoading(true);
    const res = await signup(trimmedName, trimmedEmail, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Signup failed");
      return;
    }

    // Go to tabs (Auth layout may also redirect, but this feels snappier)
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 350 }}
      >
        <Text style={styles.title}>Create Account 📚</Text>
        <Text style={styles.subtitle}>Where the stories travel.</Text>

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

        {/* Name */}
        <TextInput
          placeholder="Full Name"
          style={[
            styles.input,
            fieldErrors.name ? styles.inputBad : styles.inputGood,
          ]}
          value={name}
          onChangeText={setName}
        />
        {fieldErrors.name ? (
          <Text style={styles.hintBad}>{fieldErrors.name}</Text>
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

        {/* Strength Meter */}
        <View style={styles.strengthRow}>
          <View style={styles.strengthTrack}>
            <MotiView
              from={{ width: 0 }}
              animate={{ width: `${(pwScore / 5) * 100}%` }}
              transition={{ type: "timing", duration: 250 }}
              style={styles.strengthFill}
            />
          </View>
          <Text style={styles.strengthText}>{pwText}</Text>
        </View>

        {fieldErrors.password ? (
          <Text style={styles.hintBad}>{fieldErrors.password}</Text>
        ) : (
          <Text style={styles.hintGood}>
            Use 8+ chars, 1 uppercase, 1 number, 1 special char.
          </Text>
        )}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Sign Up"}
          </Text>
        </Pressable>

        <Text style={styles.small}>
          By signing up you agree to our{" "}
          <Link href="/terms" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.link}>Terms & Conditions</Text>
            </Pressable>
          </Link>
          .
        </Text>

        <Text style={styles.small}>
          Already have an account? <Link href="/(auth)/login">Login</Link>
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
  hintGood: {
    color: "#444",
    marginTop: 6,
    fontWeight: "600",
  },

  strengthRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#eaeaea",
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    backgroundColor: "#0F3D3E",
  },
  strengthText: {
    width: 88,
    textAlign: "right",
    fontWeight: "800",
    color: "#0F3D3E",
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
  link: {
    color: "#0F3D3E",
    fontWeight: "800",
    textDecorationLine: "underline",
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
