import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
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

  // Get window dimensions for responsive layout
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // reference variables to be used within callbacks to get updated data
  const totalTimerRef = useRef(null);
  const intervalTimerRef = useRef(null);
  const lastBeepSecond = useRef(null);
  const isMutedRef = useRef(false);
  const beepSoundRef = useRef(null);
  const startSoundRef = useRef(null);
  const soundsLoadedRef = useRef(false);
  
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    loadSettings();
    
    // Cleanup on unmount
    return () => {
      clearInterval(tick);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      unloadSounds();
    };
  }, []);

  useEffect(() => { 
    isMutedRef.current = isMuted; 
  }, [isMuted]);

  useEffect(() => {
    async function configureAudio() {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true, // ✅ enables sound even if mute switch is on
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    }
    
    async function configureOrientation() {
      try {
        // Allow all orientations (portrait and landscape)
        await ScreenOrientation.unlockAsync();
      } catch (error) {
        console.log('Error configuring orientation:', error);
      }
    }
    
    configureAudio();
    configureOrientation();
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
    lastBeepSecond.current = null; // Reset beep tracking
    preloadSounds(); // Preload sounds before starting
    
    totalTimerRef.current = setInterval(() => {
      setTotalTime((prev) => prev + 1000);
    }, 1000);

    intervalTimerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const newVal = prev - 1000;
        // Start beep when rolling over to start again
        if (newVal <= 0) {
          if (!isMutedRef.current) { playStart(); }
          lastBeepSecond.current = null; // Reset for next interval
          return intervalTime;
        }
        // Beep for each of the last 3 seconds (3000ms, 2000ms, 1000ms)
        if (newVal <= 3000 && newVal > 0) {
          const currentSecond = Math.round(newVal / 1000);
          if (lastBeepSecond.current !== currentSecond) {
            lastBeepSecond.current = currentSecond;
            if (!isMutedRef.current) { playBeep(); }
          }
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
    unloadSounds(); // Cleanup sounds when stopping
  };

  const resetTimers = () => {
    stopTimers();
    setTotalTime(0);
    setRemaining(intervalTime);
  };

  // Preload sounds at the start of the timer for instant playback
  async function preloadSounds() {
    if (soundsLoadedRef.current) return; // Already loaded
    
    try {
      // Load beep sound
      if (!beepSoundRef.current) {
        const { sound: beepSound } = await Audio.Sound.createAsync(
          require('./assets/beep.mp3'),
          { shouldPlay: false, isLooping: false }
        );
        beepSoundRef.current = beepSound;
      }
      
      // Load start sound
      if (!startSoundRef.current) {
        const { sound: startSound } = await Audio.Sound.createAsync(
          require('./assets/start.mp3'),
          { shouldPlay: false, isLooping: false }
        );
        startSoundRef.current = startSound;
      }
      
      soundsLoadedRef.current = true;
      console.log('Sounds preloaded successfully');
    } catch (error) {
      console.log('Error preloading sounds:', error);
    }
  }

  // Unload sounds to free resources
  async function unloadSounds() {
    try {
      if (beepSoundRef.current) {
        await beepSoundRef.current.unloadAsync();
        beepSoundRef.current = null;
      }
      if (startSoundRef.current) {
        await startSoundRef.current.unloadAsync();
        startSoundRef.current = null;
      }
      soundsLoadedRef.current = false;
    } catch (error) {
      console.log('Error unloading sounds:', error);
    }
  }

  // Play preloaded beep sound (instant, no load time)
  async function playBeep() {
    try {
      if (beepSoundRef.current) {
        // Reset to beginning and play
        await beepSoundRef.current.setPositionAsync(0);
        await beepSoundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error playing beep:', error);
    }
  }

  // Play preloaded start sound (instant, no load time)
  async function playStart() {
    try {
      if (startSoundRef.current) {
        // Reset to beginning and play
        await startSoundRef.current.setPositionAsync(0);
        await startSoundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error playing start sound:', error);
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
    <ScrollView 
      contentContainerStyle={[
        styles.container,
        isLandscape && styles.containerLandscape
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      <View style={[
        styles.logoContainer,
        isLandscape && styles.logoContainerLandscape
      ]}>
        <Image
          source={logoSource}
          style={[
            styles.logo,
            isLandscape && styles.logoLandscape
          ]}
          resizeMode="contain"
        />
      </View>

      <Text style={[
        styles.clockText,
        isLandscape && styles.clockTextLandscape
      ]}>{formatClock()}</Text>

      <View style={[
        styles.timerBox,
        isLandscape && styles.timerBoxLandscape
      ]}>
        <View style={styles.timerColumn}>
          <Text style={[
            styles.label,
            isLandscape && styles.labelLandscape
          ]}>Workout Total</Text>
          <Text style={[
            styles.timer,
            isLandscape && styles.timerLandscape
          ]}>{formatTime(totalTime)}</Text>
        </View>
        <View style={styles.timerColumn}>
          <Text style={[
            styles.label,
            isLandscape && styles.labelLandscape
          ]}>Interval ({intervalTime / 1000}s)</Text>
          <Text style={[
            styles.timer,
            isLandscape && styles.timerLandscape
          ]}>{formatTime(remaining)}</Text>
        </View>
        <TouchableOpacity onPress={changeMute} style={styles.muteButton}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={isLandscape ? 24 : 32}
            color={isMuted ? "#f0f" : "#0ff"} 
          />
        </TouchableOpacity>
      </View>

      <View style={[
        styles.buttonRow,
        isLandscape && styles.buttonRowLandscape
      ]}>
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
        style={[
          styles.configButton,
          isLandscape && styles.configButtonLandscape
        ]}
      >
        <Text style={styles.configText}>Settings</Text>
      </TouchableOpacity>
    </ScrollView>
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
    padding: 10,
  },
  clockText: {
    fontSize: 48,
    color: "#0ff",
    textShadowColor: "#0ff",
    textShadowRadius: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  timerBox: {
    marginTop: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    width: "100%",
  },
  timerColumn: {
    alignItems: "center",
    marginHorizontal: 15,
  },
  timer: {
    fontSize: 32,
    color: "#ff0",
    textShadowColor: "#ff0",
    textShadowRadius: 15,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  label: {
    fontSize: 16,
    color: "#0FF",
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 15,
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
    marginTop: 15,
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
    marginBottom: 15,
  },
  logo: {
    width: 200,
    height: 100,
  },
  saveButton: {
    marginTop: 15,
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
    marginTop: 20,
  },
  smallButton: {
    borderColor: "#ff0",
    borderWidth: 1,
    width: 150,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  // Landscape-specific styles
  containerLandscape: {
    justifyContent: "flex-start",
    paddingVertical: 15,
  },
  logoContainerLandscape: {
    marginBottom: 15,
  },
  logoLandscape: {
    width: 100,
    height: 50,
  },
  clockTextLandscape: {
    fontSize: 32,
  },
  timerBoxLandscape: {
    marginTop: 15,
  },
  labelLandscape: {
    fontSize: 14,
    marginTop: 5,
  },
  timerLandscape: {
    fontSize: 24,
  },
  buttonRowLandscape: {
    marginTop: 10,
  },
  configButtonLandscape: {
    marginTop: 10,
  },

});
