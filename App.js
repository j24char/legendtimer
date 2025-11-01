import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from "expo-haptics";
import { Ionicons } from '@expo/vector-icons';


const logoSource = Platform.OS === 'web' ? { uri: '/icon.png' } : require('./assets/LegendTimerSmall.png');
const Stack = createNativeStackNavigator();

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ClockScreen({ navigation }) {
  // list of used state variables
  const [time, setTime] = useState(new Date());
  const [totalTime, setTotalTime] = useState(0);
  const [intervalTime, setIntervalTime] = useState(30000); // default 30s
  const [remaining, setRemaining] = useState(30000);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalRunning, setIntervalRunning] = useState(false);
  const [is24Hour, setIs24Hour] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // reference variables to be used within callbacks to get updated data
  const totalTimerRef = useRef(null);
  const intervalTimerRef = useRef(null);
  const lastBeepSecond = useRef(null);
  const isMutedRef = useRef(false);
  
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    loadSettings();
    return () => clearInterval(tick);
  }, []);

  useEffect(() => { 
    isMutedRef.current = isMuted; 
  }, [isMuted]);

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
          if (!isMutedRef.current) { playStart(); }
          return intervalTime;
        }
        // Beep for each of the last 3 seconds
        if (newVal <= 3000 && newVal > 0 && lastBeepSecond.current !== newVal) {
          lastBeepSecond.current = newVal;
          if (!isMutedRef.current) { playBeep(); }
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

  const changeMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next; // update ref immediately
      return next;
    });
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

      <Text style={styles.clockText}>{formatClock()}</Text>

      <View style={styles.timerBox}>
        <Text style={styles.label}>Workout Total</Text>
        <Text style={styles.timer}>{formatTime(totalTime)}</Text>
        <Text style={styles.label}>Interval ({intervalTime / 1000}s)</Text>
        <Text style={styles.timer}>{formatTime(remaining)}</Text>
        {/* <TouchableOpacity onPress={ changeMute } style={styles.muteButton}>
          <Text style={styles.buttonText}>{isMuted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity> */}
        <TouchableOpacity onPress={changeMute} style={styles.muteButton}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={32}
            color={isMuted ? "#f0f" : "#0ff"} 
          />
        </TouchableOpacity>
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

function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontSize: 24, marginBottom: 20 }]}>
        Privacy Policy
      </Text>
      <Text style={{ color: "#0ff", fontSize: 16, marginBottom: 20 }}>
        LegendTimer does not collect, store, or share any personal data. 
        All app settings are stored locally on your device and never transmitted.
        No analytics or tracking tools are used.
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.configButton}>
        <Text style={styles.configText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function AboutScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontSize: 24, marginBottom: 20 }]}>
        About LegendTimer
      </Text>
      <Text style={{ color: "#0ff", fontSize: 16, marginBottom: 20 }}>
        LegendTimer is a simple, neon-inspired workout and interval timer app 
        designed for smooth performance and ease of use. 
        It works across iOS, Android, and Web — including Fire TV devices.
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.configButton}>
        <Text style={styles.configText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfigScreen({ navigation, route }) {
  const [is24Hour, setIs24Hour] = useState(true);
  const [intervalTime, setIntervalTime] = useState(30000);
  const [originalFormat, setOriginalFormat] = useState(true);
  const [originalInterval, setOriginalInterval] = useState(30000);
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const f = await AsyncStorage.getItem("is24Hour");
    const i = await AsyncStorage.getItem("intervalTime");

    if (f !== null) {
      const format = f === "true";
      setIs24Hour(format);
      setOriginalFormat(format);
    }
    if (i) {
      const interval = parseInt(i);
      setIntervalTime(interval);
      setOriginalInterval(interval);
    }
  };

  // track when user makes a change
  const handleFormatChange = () => {
    const newVal = !is24Hour;
    setIs24Hour(newVal);
    setIsModified(newVal !== originalFormat || intervalTime !== originalInterval);
  };

  const handleIntervalChange = (opt) => {
    setIntervalTime(opt);
    setIsModified(is24Hour !== originalFormat || opt !== originalInterval);
  };

  const handleSaveOrBack = async () => {
    if (isModified) {
      await AsyncStorage.setItem("is24Hour", is24Hour.toString());
      await AsyncStorage.setItem("intervalTime", intervalTime.toString());
    }
    navigation.goBack();
  };

  const intervalOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 10000);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Clock Format</Text>
      <TouchableOpacity style={styles.clockButton} onPress={handleFormatChange}>
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
            onPress={() => handleIntervalChange(opt)}
          >
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

      {/* Dynamic Save/Back button */}
      <TouchableOpacity
        onPress={handleSaveOrBack}
        style={[
          styles.configButton,
          isModified && { borderColor: "#f0f" },
        ]}
      >
        <Text
          style={[
            styles.configText,
            isModified && { color: "#f0f" },
          ]}
        >
          {isModified ? "Save" : "Back"}
        </Text>
      </TouchableOpacity>
      <View style={styles.bottomButtonRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("PrivacyPolicy")}
          style={styles.smallButton}
        >
          <Text style={styles.configText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("About")}
          style={styles.smallButton}
        >
          <Text style={styles.configText}>About</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}




export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Clock" component={ClockScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
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
    width: 90,
    alignItems: "center",
  },
  muteButton: {
    backgroundColor: "#000",
    //borderColor: "#0ff",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
    width: 110,
    alignItems: "center",
  },
  clockButton: {
    backgroundColor: "#111",
    borderColor: "#0ff",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
    width: 150,
    alignItems: "center",
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
    alignItems: "center",
  },
  configText: {
    color: "#ff0",
    fontSize: 18,
  },
  saveText: {
    color: "#f0f",
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
  saveButton: {
    marginTop: 30,
    // borderColor: "#f0f",
    width: 150,
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "center",
  },
  bottomButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 60,
  },
  smallButton: {
    borderColor: "#ff0",
    borderWidth: 1,
    width: 150,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },

});
