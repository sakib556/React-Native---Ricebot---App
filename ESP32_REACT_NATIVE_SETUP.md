# ESP32 + React Native Rice Cooking System Setup

## 🎯 **Recommended Configuration: Hybrid MQTT**

### **Why Hybrid for ESP32 + React Native?**

| Aspect | ESP32 (TCP Port 1883) | React Native (WebSocket Port 8000) |
|--------|----------------------|-----------------------------------|
| **ESP32 Performance** | ✅ Excellent (Native TCP) | ✅ Good (WebSocket) |
| **React Native** | ❌ Not supported | ✅ Only option available |
| **Latency** | ✅ Lower | ⚠️ Slightly higher |
| **Memory Usage** | ✅ Lower | ⚠️ Higher |
| **Firewall Issues** | ❌ Sometimes blocked | ✅ Usually allowed |
| **Real-time Updates** | ✅ Better | ✅ Good |
| **Compatibility** | ✅ Works together | ✅ Works together |

## 📱 **React Native App Configuration**

### **Default Settings (Updated)**
- **Connection Type**: WebSocket (Port 8000) - **React Native limitation**
- **Broker**: broker.hivemq.com
- **ESP32 Compatibility**: ✅ Works with ESP32 TCP

### **How to Use**
1. **Default**: App uses WebSocket (port 8000)
2. **ESP32**: Uses TCP (port 1883) - both connect to same broker
3. **Communication**: React Native ↔ Broker ↔ ESP32

## 🔧 **ESP32 Configuration**

### **Required Libraries**
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
```

### **MQTT Settings**
```cpp
// TCP Configuration (Recommended)
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;  // TCP port

// WebSocket Configuration (Fallback)
// const int mqtt_port = 8000;  // WebSocket port
```

### **Topics to Subscribe/Publish**
```cpp
// Subscribe to commands from React Native app
const char* TOPIC_START_COOKING = "ricebot/start_cooking";

// Publish updates to React Native app
const char* TOPIC_COOKING_PROGRESS = "ricebot/cooking_progress";
const char* TOPIC_ALERTS = "ricebot/alerts";
const char* TOPIC_DEVICE_STATUS = "ricebot/device_status";
```

## 🚀 **Quick Start Guide**

### **1. React Native App**
```bash
# App automatically uses TCP by default
# No additional configuration needed
```

### **2. ESP32 Setup**
1. Install required libraries in Arduino IDE:
   - PubSubClient
   - ArduinoJson

2. Update WiFi credentials in `esp32-example.ino`:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

3. Upload code to ESP32

### **3. Testing**
```bash
# Test TCP connection (default)
node test-mqtt.js tcp

# Test WebSocket connection (fallback)
node test-mqtt.js websocket
```

## 📊 **Message Flow**

### **Start Cooking**
```
React Native App → MQTT Broker → ESP32
  (WebSocket)        (HiveMQ)     (TCP)
```

**Message Format:**
```json
{
  "action": "start_cooking",
  "quantity": "1.5 Cup",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Progress Updates**
```
ESP32 → MQTT Broker → React Native App
(TCP)     (HiveMQ)    (WebSocket)
```

**Message Format:**
```json
{
  "progress": 75,
  "status": "cooking",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **ESP32 Can't Connect**
   - Check WiFi credentials
   - Verify MQTT broker URL
   - Check firewall settings

2. **React Native Can't Connect**
   - Try switching to WebSocket in Settings
   - Check internet connection
   - Verify broker is accessible

3. **Messages Not Received**
   - Verify topic names match exactly
   - Check MQTT connection status
   - Ensure both devices use same protocol

### **Debug Commands**

**ESP32 Serial Monitor:**
```
WiFi connected
IP address: 192.168.1.100
MQTT connected
Subscribed to ricebot/start_cooking
Published progress: {"progress":25,"status":"washing"}
```

**React Native Console:**
```
🔌 Connecting to MQTT broker via TCP: broker.hivemq.com:8000
✅ MQTT Connected successfully via TCP
📊 Cooking progress received: {"progress":25,"status":"washing"}
```

## 🎛️ **Hardware Requirements**

### **ESP32 Sensors**
- **Water Flow Sensor**: Monitor water supply
- **Rice Level Sensor**: Check rice quantity
- **Temperature Sensor**: Monitor cooking temperature
- **Relay Module**: Control heating element

### **Pin Connections**
```cpp
const int WATER_FLOW_SENSOR_PIN = 34;
const int RICE_LEVEL_SENSOR_PIN = 35;
const int TEMPERATURE_SENSOR_PIN = 36;
const int RELAY_PIN = 32;
```

## 📈 **Performance Optimization**

### **For ESP32**
- Use TCP for better performance
- Minimize JSON payload size
- Use QoS 0 for faster delivery
- Implement connection retry logic

### **For React Native**
- TCP provides lower latency
- Real-time progress updates
- Efficient memory usage
- Automatic protocol fallback

## 🔒 **Security Considerations**

### **Development (Current)**
- Public HiveMQ broker
- No authentication
- Suitable for testing

### **Production (Recommended)**
- Private MQTT broker
- Username/password authentication
- TLS encryption (MQTTS)
- Topic access control

## 📋 **Testing Checklist**

- [ ] ESP32 connects to WiFi
- [ ] ESP32 connects to MQTT broker
- [ ] React Native app connects to MQTT broker
- [ ] Start cooking command received by ESP32
- [ ] Progress updates received by React Native app
- [ ] Alerts work in both directions
- [ ] Device status updates work
- [ ] Fallback to WebSocket works if TCP fails

## 🎯 **Final Recommendation**

**Use Hybrid MQTT (ESP32 TCP + React Native WebSocket)** because:

1. **ESP32 Performance**: Native TCP support for optimal performance
2. **React Native Compatibility**: WebSocket is the only available option
3. **Broker Communication**: Both connect to same HiveMQ broker
4. **Real-time Updates**: Excellent performance for cooking progress
5. **No Fallback Needed**: Both protocols work together seamlessly

The system is now optimized for ESP32 + React Native rice cooking with hybrid MQTT configuration! 