import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from "expo-haptics";

const logoSource = Platform.OS === 'web' ? { uri: '/icon.png' } : require('./assets/LegendTimerSmall.png');
const Stack = createNativeStackNavigator();

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ClockScreen({ navigation }) {
  const [time, setTime] = useState(new Date());
  const [totalTime, setTotalTime] = useState(0);
  const [intervalTime, setIntervalTime] = useState(30000); // default 30s
  const [remaining, setRemaining] = useState(30000);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalRunning, setIntervalRunning] = useState(false);
  const [is24Hour, setIs24Hour] = useState(true);
  const [timezone, setTimezone] = useState("local");
  const totalTimerRef = useRef(null);
  const intervalTimerRef = useRef(null);
  const lastBeepSecond = useRef(null);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    loadSettings();
    return () => clearInterval(tick);
  }, []);

  // Force to reload settings when focus returns to clock screen
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const storedFormat = await AsyncStorage.getItem("is24Hour");
    const storedTZ = await AsyncStorage.getItem("timezone");
    const storedInterval = await AsyncStorage.getItem("intervalTime");
    if (storedFormat !== null) setIs24Hour(storedFormat === "true");
    if (storedTZ) setTimezone(storedTZ);
    if (storedInterval) {
      setIntervalTime(parseInt(storedInterval));
      setRemaining(parseInt(storedInterval));
    }
  };

  const startTimers = () => {
    if (isRunning) return;
    setIsRunning(true);
    setIntervalRunning(true);
    totalTimerRef.current = setInterval(() => {
      setTotalTime((prev) => prev + 1000);
    }, 1000);

    intervalTimerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const newVal = prev - 1000;
        // Start beep when rolling over to start again
        if (newVal <= 0) {
          playStart();
          return intervalTime;
        }
        // Beep for each of the last 3 seconds
        if (newVal <= 3000 && newVal > 0 && lastBeepSecond.current !== newVal) {
          lastBeepSecond.current = newVal;
          playBeep();
        }
        return newVal;
      });
    }, 1000);
  };

  const stopTimers = () => {
    clearInterval(totalTimerRef.current);
    clearInterval(intervalTimerRef.current);
    setIsRunning(false);
    setIntervalRunning(false);
  };

  const resetTimers = () => {
    stopTimers();
    setTotalTime(0);
    setRemaining(intervalTime);
  };

  async function playBeep() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/beep.mp3'),
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.log('Error playing beep:', error);
    }
  }
  async function playStart() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/start.mp3'),
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.log('Error playing start beep:', error);
    }
  }

  const formatClock = () => {
    let display = time;
    let formatted = is24Hour
      ? display.toLocaleTimeString("en-US", { hour12: false })
      : display.toLocaleTimeString();
    return formatted;
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
{/*       <Image
        source={logoSource}
        style={{ width: 200, height: 100, marginLeft: 16, marginRight: 16, }}
        resizeMode="contain"
      /> */}
      <Text style={styles.clockText}>{formatClock()}</Text>

      <View style={styles.timerBox}>
        <Text style={styles.label}>Workout Total</Text>
        <Text style={styles.timer}>{formatTime(totalTime)}</Text>
        <Text style={styles.label}>Interval ({intervalTime / 1000}s)</Text>
        <Text style={styles.timer}>{formatTime(remaining)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={startTimers} style={styles.button}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={stopTimers} style={styles.button}>
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={resetTimers} style={styles.button}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Config", { intervalTime })}
        style={styles.configButton}
      >
        <Text style={styles.configText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfigScreen({ navigation, route }) {
  const [is24Hour, setIs24Hour] = useState(true);
  const [intervalTime, setIntervalTime] = useState(30000);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const f = await AsyncStorage.getItem("is24Hour");
    const i = await AsyncStorage.getItem("intervalTime");
    if (f !== null) setIs24Hour(f === "true");
    if (i) setIntervalTime(parseInt(i));
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem("is24Hour", is24Hour.toString());
    await AsyncStorage.setItem("intervalTime", intervalTime.toString());
    navigation.goBack();
  };

  const intervalOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 10000);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Clock Format</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIs24Hour((prev) => !prev)}
      >
        <Text style={styles.buttonText}>
          {is24Hour ? "24 Hour" : "12 Hour"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Interval Length</Text>
      <View style={styles.buttonRow}>
        {intervalOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.button,
              intervalTime === opt && { backgroundColor: "#0ff" },
            ]}
            onPress={() => setIntervalTime(opt)}
          >
            {/* <Text style={styles.buttonText}>{opt / 1000}s</Text> */}
            <Text
              style={[
                styles.buttonText,
                intervalTime === opt && styles.selectedButtonText,
              ]}
            >
              {opt / 1000}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={saveSettings} style={styles.configButton}>
        <Text style={styles.configText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Clock" component={ClockScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  clockText: {
    fontSize: 54,
    color: "#0ff",
    textShadowColor: "#0ff",
    textShadowRadius: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  timerBox: {
    marginTop: 40,
    alignItems: "center",
  },
  timer: {
    fontSize: 42,
    color: "#ff0",
    textShadowColor: "#ff0",
    textShadowRadius: 15,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  label: {
    fontSize: 18,
    color: "#0FF",
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 30,
  },
  button: {
    backgroundColor: "#111",
    borderColor: "#0ff",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
  },
  buttonText: {
    color: "#0ff",
    fontSize: 18,
  },
  startButton: {
    backgroundColor: "#111",
    borderColor: 'lime',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
  },
  startButtonText: {
    color: 'lime',
    fontSize: 18,
  },
  stopButton: {
    backgroundColor: "#111",
    borderColor: 'hotpink',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
  },
  stopButtonText: {
    color: 'hotpink',
    fontSize: 18,
  },
  selectedButtonText: {
    color: 'black',
  },
  configButton: {
    marginTop: 40,
    borderColor: "#ff0",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  configText: {
    color: "#ff0",
    fontSize: 18,
  },
  logoContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 100,
  },
});
