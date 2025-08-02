# ESP32 Rice Cooker - MQTT Integration Guide

## Overview
The ESP32 rice cooker has been updated with full MQTT integration to work seamlessly with the React Native mobile app. This system provides real-time communication between the hardware and the mobile application.

## Key Features

### 1. **MQTT Communication**
- **Broker**: HiveMQ public broker (`broker.hivemq.com:1883`)
- **Protocol**: TCP MQTT (standard for ESP32)
- **Topics**: 
  - `ricebot/start_cooking` - Receive cooking commands from app
  - `ricebot/cooking_progress` - Send progress updates to app
  - `ricebot/alerts` - Send alerts and notifications to app
  - `ricebot/device_status` - Send device status updates to app

### 2. **Real-time Progress Tracking**
- **Progress Updates**: Every stage of cooking sends progress percentage
- **Status Messages**: Detailed status updates for each cooking phase
- **Alert System**: Error handling and success notifications
- **Temperature Monitoring**: Real-time temperature data during cooking

### 3. **Cooking Process Integration**
The system now tracks and reports on each cooking stage:

1. **Initialization (0-5%)**: System startup and rice level check
2. **Rice Dispensing (5-10%)**: Stepper motor rice dispensing
3. **Washing (15-25%)**: Water filling, washing cycles, draining
4. **Soaking (30-50%)**: Water filling and soaking process
5. **Transfer (55-60%)**: Rice transfer to cooking chamber
6. **Cooking (65-95%)**: Steam cooking with temperature monitoring
7. **Draining (98-100%)**: Final water drainage and completion

## Hardware Requirements

### **Core Components**
- **ESP32 Development Board**
- **Stepper Motor** (NEMA17) with TMC2209 driver
- **Temperature Sensor** (DS18B20)
- **IR Sensor** for rice level detection
- **Water Flow Sensor**
- **OLED Display** (SSD1306, 128x32)
- **Relay Modules** (6 relays for various valves and motors)

### **Pin Configuration**
```cpp
#define STEPPER_DIR_PIN   2   // TMC2209 DIR
#define STEPPER_STEP_PIN  3   // TMC2209 STEP
#define IR_SENSOR_PIN     4   // IR sensor for rice level
#define VALVE1_PIN        5   // Relay 1: Water inlet
#define VALVE2_PIN        6   // Relay 2: Final drain
#define DRAIN_VALVE       7   // Relay 3: Drain dirty water
#define MOTOR_WASH        8   // Relay 4: Water motor for washing
#define COOK_VALVE        9   // Relay 5: Transfer valve
#define HEATER_RELAY      10  // Relay 6: Heater
#define ONE_WIRE_BUS      11  // DS18B20 temperature sensor
#define FLOW_SENSOR_PIN   12  // Water flow sensor
#define OLED_SDA          17  // OLED I2C SDA
#define OLED_SCL          18  // OLED I2C SCL
#define BUTTON_UP         19  // Increase quantity button
#define BUTTON_DOWN       20  // Decrease quantity button
#define BUTTON_ENTER      21  // Enter/Confirm button
```

## MQTT Message Formats

### 1. **Start Cooking Command** (App → ESP32)
```json
{
  "action": "start_cooking",
  "quantity": 1.0,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. **Progress Updates** (ESP32 → App)
```json
{
  "progress": 65,
  "status": "cooking",
  "timestamp": 1234567890
}
```

### 3. **Alerts** (ESP32 → App)
```json
{
  "type": "error|warning|info|success",
  "message": "Temperature sensor failure",
  "timestamp": 1234567890
}
```

### 4. **Device Status** (ESP32 → App)
```json
{
  "message": "Cooking in progress",
  "timestamp": 1234567890,
  "isCooking": true,
  "currentProgress": 75,
  "temperature": 95.5,
  "percentage": 75,
  "remainingTime": 300
}
```

## Setup Instructions

### 1. **WiFi Configuration**
Update the WiFi credentials in the code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. **MQTT Configuration**
The system uses HiveMQ public broker by default:
```cpp
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
```

### 3. **Hardware Assembly**
1. Connect all components according to pin definitions
2. Ensure proper power supply for relays and motors
3. Calibrate flow sensor pulses per liter
4. Test temperature sensor readings

### 4. **Upload and Test**
1. Install required libraries in Arduino IDE:
   - `PubSubClient`
   - `ArduinoJson`
   - `OneWire`
   - `DallasTemperature`
   - `Adafruit_GFX`
   - `Adafruit_SSD1306`

2. Upload the code to ESP32
3. Monitor Serial output for connection status
4. Test MQTT communication with the mobile app

## Operation Modes

### 1. **App Control Mode**
- Receive cooking commands from React Native app
- Send real-time progress updates
- Provide detailed status information
- Handle error conditions gracefully

### 2. **Manual Control Mode**
- Use physical buttons for quantity selection
- Start cooking process manually
- Same MQTT integration for app monitoring

### 3. **Error Handling**
- Automatic hardware reset on errors
- MQTT alerts for all error conditions
- Graceful failure recovery
- Temperature sensor validation

## Troubleshooting

### **Common Issues**

1. **MQTT Connection Failed**
   - Check WiFi connectivity
   - Verify broker address and port
   - Check firewall settings

2. **Hardware Not Responding**
   - Verify pin connections
   - Check power supply
   - Test individual components

3. **Temperature Sensor Issues**
   - Check wiring connections
   - Verify sensor address
   - Test with known good sensor

4. **Flow Sensor Problems**
   - Calibrate pulses per liter
   - Check for debris in sensor
   - Verify water flow

### **Debug Information**
- Serial monitor provides detailed debug output
- MQTT messages are logged for troubleshooting
- OLED display shows current status
- Error conditions are reported via MQTT alerts

## Integration with React Native App

The ESP32 system is designed to work seamlessly with the React Native app:

1. **Command Reception**: ESP32 listens for cooking commands on `ricebot/start_cooking`
2. **Progress Broadcasting**: Real-time progress updates on `ricebot/cooking_progress`
3. **Status Updates**: Device status on `ricebot/device_status`
4. **Alert System**: Error and success notifications on `ricebot/alerts`

## Safety Features

1. **Hardware Reset**: Automatic reset to safe state on errors
2. **Temperature Monitoring**: Continuous temperature validation
3. **Timeout Protection**: Cooking timeout detection
4. **Flow Validation**: Water flow sensor monitoring
5. **Rice Level Check**: IR sensor validation before cooking

## Future Enhancements

1. **Local MQTT Broker**: Option to use local Mosquitto broker
2. **SSL/TLS Support**: Secure MQTT connections
3. **OTA Updates**: Over-the-air firmware updates
4. **Data Logging**: Local storage of cooking history
5. **Multiple Recipes**: Support for different rice types
6. **Smart Scheduling**: Time-based cooking commands

## Support

For technical support or questions about the ESP32 rice cooker system:
- Check the Serial monitor for debug information
- Verify MQTT message formats
- Test individual hardware components
- Review error logs and alerts 