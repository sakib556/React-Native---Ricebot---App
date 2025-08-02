# App Developer Setup - Dummy ESP32 Testing

## 🎯 **For App Developers Testing React Native App**

This guide helps you test your React Native rice cooking app without any real hardware sensors.

## 📱 **React Native App (Ready to Test)**

Your React Native app is configured to:
- ✅ Use WebSocket MQTT (Port 8000) - **React Native limitation**
- ✅ Show real-time cooking progress
- ✅ Display alerts and device status
- ✅ Handle start cooking commands

### **⚠️ Important: React Native MQTT Limitation**
React Native's `react_native_mqtt` library **only supports WebSocket connections**, not native TCP. Even when you select "TCP" mode, it uses WebSocket on port 8000. This is **compatible with ESP32** because:
- ESP32 can connect via TCP (port 1883) to the same broker
- Both devices communicate through the same MQTT broker
- Messages flow: React Native (WebSocket) ↔ Broker ↔ ESP32 (TCP)

## 🔧 **ESP32 Dummy Setup (No Sensors Required)**

### **What You Need:**
- ESP32 board (any model)
- USB cable
- WiFi connection
- Arduino IDE

### **What You DON'T Need:**
- ❌ Water flow sensors
- ❌ Rice level sensors  
- ❌ Temperature sensors
- ❌ Relay modules
- ❌ Any hardware components

## 🚀 **Quick Setup (5 minutes)**

### **1. Install Arduino Libraries**
In Arduino IDE, go to **Tools → Manage Libraries** and install:
- `PubSubClient` by Nick O'Leary
- `ArduinoJson` by Benoit Blanchon

### **2. Update WiFi Credentials**
Open `esp32-dummy-test.ino` and update:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### **3. Upload to ESP32**
- Connect ESP32 via USB
- Select your ESP32 board in Arduino IDE
- Click **Upload**

### **4. Open Serial Monitor**
- Set baud rate to **115200**
- You should see:
```
🍚 ESP32 Dummy Rice Cooker - App Testing Mode
📶 Connecting to WiFi...
✅ WiFi connected
📱 IP address: 192.168.1.xxx
🔌 Attempting MQTT connection...
✅ MQTT connected
```

## 🧪 **Testing Your App**

### **Test 1: Start Cooking**
1. Open your React Native app
2. Go to **Start Cooking** screen
3. Select quantity (1, 1.5, or 2 cups)
4. Tap **Start Cooking** → Confirm
5. **Expected Result**: ESP32 receives command and starts dummy cooking

### **Test 2: Real-time Progress**
1. After starting cooking, go to **Cooking Status** screen
2. **Expected Result**: Progress updates every 2 seconds (0% → 100%)
3. **Stages**: Washing (0-25%) → Soaking (25-50%) → Cooking (50-100%) → Done

### **Test 3: Alerts**
1. During cooking, watch for alerts
2. **Expected Result**: Random alerts every 30-60 seconds
3. **Alert Types**: Info, Warning, Success messages

### **Test 4: Device Status**
1. Check device status in app
2. **Expected Result**: Shows dummy sensor values and cooking state

## 📊 **What the Dummy ESP32 Simulates**

### **Cooking Process (2 minutes total)**
```
0%   → 25%  : Washing rice (30 seconds)
25%  → 50%  : Soaking rice (30 seconds)  
50%  → 100% : Cooking rice (60 seconds)
100%        : Done!
```

### **Dummy Sensor Values**
- **Water Flow**: Always `true`
- **Rice Level**: Always `normal`
- **Temperature**: Always `25°C`
- **WiFi**: Real connection status
- **Cooking State**: Real progress tracking

### **Random Alerts**
- "Dummy: Water flow is normal"
- "Dummy: Temperature is rising"
- "Dummy: Rice level is adequate"

## 🔍 **Debugging**

### **ESP32 Serial Monitor Commands**
Type these in Serial Monitor:
```
start   - Manually start cooking
alert   - Send test alert
status  - Publish device status
help    - Show all commands
```

### **React Native Console Logs**
Look for these logs:
```
🔌 Connecting to MQTT broker via TCP: broker.hivemq.com:8000
✅ MQTT Connected successfully via TCP
📤 Published to ricebot/start_cooking: {"action":"start_cooking",...}
📊 Cooking progress received: {"progress":25,"status":"washing"}
🚨 Alert received: {"type":"info","message":"Dummy cooking started..."}
```

### **Common Issues**

1. **ESP32 Won't Connect**
   - Check WiFi credentials
   - Verify internet connection
   - Check Serial Monitor for errors

2. **App Won't Connect**
   - Check if MQTT broker is accessible
   - Verify network connectivity
   - Both "TCP" and "WebSocket" modes use WebSocket (port 8000)

3. **No Progress Updates**
   - Ensure ESP32 is running dummy code
   - Check MQTT connection status
   - Verify topic names match

## 📋 **Testing Checklist**

- [ ] ESP32 connects to WiFi
- [ ] ESP32 connects to MQTT broker (TCP port 1883)
- [ ] React Native app connects to MQTT broker (WebSocket port 8000)
- [ ] Start cooking command works
- [ ] Progress updates in real-time
- [ ] Alerts appear in app
- [ ] Device status shows dummy values
- [ ] Cooking completes successfully

## 🎯 **Next Steps**

1. **Test all app features** with dummy ESP32
2. **Verify UI/UX** works correctly
3. **Test error handling** (disconnect ESP32, etc.)
4. **Share dummy code** with hardware developer
5. **Hardware developer** will replace dummy sensors with real ones

## 📞 **Handoff to Hardware Developer**

When ready to hand off to hardware developer:

1. **Share these files:**
   - `esp32-dummy-test.ino` (current dummy version)
   - `esp32-rice-cooker.ino` (full version with real sensors)
   - `ESP32_REACT_NATIVE_SETUP.md` (hardware setup guide)

2. **Hardware developer will:**
   - Replace dummy sensor values with real sensor readings
   - Add actual relay control for heating/water
   - Implement real cooking timing
   - Test with actual rice cooker hardware

## 🎉 **You're Ready to Test!**

Your React Native app is now ready for full testing with the dummy ESP32. No hardware sensors needed - just WiFi and MQTT communication!

### **🔧 Technical Note:**
- **React Native**: WebSocket (port 8000) - library limitation
- **ESP32**: TCP (port 1883) - native support
- **Communication**: Both connect to same HiveMQ broker
- **Compatibility**: ✅ Works perfectly together 