# MQTT Implementation for Rice Cooking System

## Overview

This document describes the MQTT (Message Queuing Telemetry Transport) implementation for the rice cooking system that enables real-time communication between the React Native app and the ESP32-S3 device.

## System Architecture

```
React Native App ←→ MQTT Broker ←→ ESP32-S3 Device
     (Frontend)        (HiveMQ)        (Hardware)
```

## Connection Types: WebSocket vs TCP

The system supports both WebSocket and TCP connections to the MQTT broker:

### WebSocket Connection (Default)
- **Port**: 8000
- **Protocol**: `ws://` or `wss://`
- **Advantages**:
  - ✅ Better firewall compatibility
  - ✅ Works in web browsers
  - ✅ Less likely to be blocked by corporate networks
  - ✅ Native React Native support
- **Disadvantages**:
  - ⚠️ Slight overhead compared to TCP
  - ⚠️ Larger message headers

### TCP Connection (Alternative)
- **Port**: 1883
- **Protocol**: `mqtt://` or `mqtts://`
- **Advantages**:
  - ✅ Standard MQTT protocol
  - ✅ Better performance
  - ✅ Smaller message overhead
  - ✅ Direct connection
- **Disadvantages**:
  - ❌ Often blocked by firewalls
  - ❌ Doesn't work in web browsers
  - ❌ May require additional setup in some networks

### Switching Connection Types

Users can switch between WebSocket and TCP in the Settings screen:

1. Go to **Settings** → **MQTT Connection**
2. Tap **WebSocket** or **TCP** button
3. Confirm the switch
4. The app will disconnect and reconnect using the new protocol

## MQTT Topics

The system uses the following MQTT topics for communication:

| Topic | Direction | Purpose | Payload Format |
|-------|-----------|---------|----------------|
| `ricebot/start_cooking` | App → ESP32 | Start cooking command | `{action, quantity, timestamp}` |
| `ricebot/cooking_progress` | ESP32 → App | Real-time cooking progress | `{progress, status, timestamp}` |
| `ricebot/alerts` | ESP32 → App | Device alerts and warnings | `{type, message, timestamp}` |
| `ricebot/device_status` | ESP32 → App | Device health status | `{wifi, water_flow, rice_level, temperature}` |

## Implementation Details

### 1. MQTT Service (`src/services/MqttService.js`)

The MQTT service handles all MQTT communication with support for both connection types:

- **Connection Management**: Automatic connection to HiveMQ broker
- **Protocol Switching**: Switch between WebSocket and TCP
- **Auto-fallback**: Falls back to WebSocket if TCP fails
- **Message Publishing**: Send commands to ESP32
- **Message Subscription**: Receive updates from ESP32
- **Error Handling**: Connection retry and error logging

```javascript
// Switch connection type
mqttService.setConnectionType('tcp'); // or 'websocket'

// Get current configuration
const config = mqttService.getConnectionConfig();
console.log(config); // { type: 'tcp', host: 'broker.hivemq.com', port: 1883, protocol: 'mqtt' }
```

### 2. MQTT Hook (`src/hooks/useMqtt.js`)

React hook for easy MQTT integration with connection type management:

```javascript
const { 
  isConnected, 
  connectionConfig,
  setConnectionType,
  startCooking, 
  subscribeToCookingProgress,
  subscribeToAlerts 
} = useMqtt();

// Switch connection type
setConnectionType('tcp');
```

### 3. Start Cooking Flow

1. User selects rice quantity (1, 1.5, or 2 cups)
2. User taps "Start Cooking" button
3. Confirmation popup appears
4. After confirmation:
   - Prediction API call is made
   - MQTT start cooking message is sent
   - User is navigated to CookingStatus screen

### 4. Real-time Progress Updates

The CookingStatus screen subscribes to:
- **Cooking Progress**: Updates progress percentage (0-100%)
- **Cooking Status**: Updates current stage (washing/soaking/cooking/done)
- **Alerts**: Shows device warnings and errors

## Message Formats

### Start Cooking Command
```json
{
  "action": "start_cooking",
  "quantity": "1.5 Cup",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Cooking Progress Update
```json
{
  "progress": 75,
  "status": "cooking",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Alert Message
```json
{
  "type": "warning",
  "message": "Low rice level detected!",
  "timestamp": "2024-01-15T10:32:00.000Z"
}
```

### Device Status
```json
{
  "wifi": true,
  "water_flow": true,
  "rice_level": "normal",
  "temperature": 25,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## ESP32-S3 Requirements

The ESP32-S3 device should:

1. **Connect to MQTT Broker**: Use HiveMQ public broker
2. **Support Both Protocols**: Handle both WebSocket (port 8000) and TCP (port 1883)
3. **Subscribe to Commands**: Listen on `ricebot/start_cooking`
4. **Publish Progress**: Send updates to `ricebot/cooking_progress`
5. **Monitor Sensors**: Check water flow, rice level, temperature
6. **Send Alerts**: Publish warnings to `ricebot/alerts`
7. **Report Status**: Send device health to `ricebot/device_status`

### ESP32-S3 Connection Example

```cpp
// WebSocket connection
WiFiClientSecure client;
PubSubClient mqtt(client);

// For WebSocket (port 8000)
mqtt.setServer("broker.hivemq.com", 8000);

// For TCP (port 1883)
mqtt.setServer("broker.hivemq.com", 1883);
```

## Testing

Use the provided test script (`test-mqtt.js`) to test MQTT communication:

### Test WebSocket Connection
```bash
npm install mqtt
node test-mqtt.js websocket
```

### Test TCP Connection
```bash
npm install mqtt
node test-mqtt.js tcp
```

The test script will:
1. Connect to MQTT broker using specified protocol
2. Subscribe to all topics
3. Send test messages
4. Display received messages

## Error Handling

The system includes comprehensive error handling:

- **Connection Failures**: Automatic retry with exponential backoff
- **Protocol Fallback**: Auto-fallback to WebSocket if TCP fails
- **Message Parsing**: Graceful handling of malformed JSON
- **Network Issues**: Connection status indicators
- **Device Errors**: Alert notifications to user

## Security Considerations

- Using public HiveMQ broker (no authentication required for testing)
- For production, consider:
  - Private MQTT broker
  - Username/password authentication
  - TLS encryption (WSS for WebSocket, MQTTS for TCP)
  - Topic access control

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check internet connection
   - Verify broker URL and port
   - Check firewall settings
   - Try switching between WebSocket and TCP

2. **Messages Not Received**
   - Verify topic names match exactly
   - Check subscription status
   - Ensure ESP32 is publishing to correct topics
   - Check connection type compatibility

3. **Progress Not Updating**
   - Check MQTT connection status
   - Verify message format
   - Check console logs for errors
   - Try different connection type

### Debug Logs

Enable debug logging by checking console output:
- `🔌 Connecting to MQTT broker via WEBSOCKET/TCP`
- `✅ MQTT Connected successfully via WEBSOCKET/TCP`
- `📤 Sending to prediction backend`
- `✅ MQTT start cooking message sent`
- `📊 Cooking progress received`
- `🚨 Alert received`

### Connection Type Recommendations

- **Use WebSocket** if:
  - Behind corporate firewall
  - Using web browser version
  - Having connection issues with TCP
  - Need maximum compatibility

- **Use TCP** if:
  - On open network
  - Need maximum performance
  - ESP32 supports it
  - No firewall restrictions

## Future Enhancements

1. **Local MQTT Broker**: Set up private broker for production
2. **Message Encryption**: Add end-to-end encryption
3. **Offline Support**: Queue messages when offline
4. **Multiple Devices**: Support multiple rice cookers
5. **Analytics**: Track cooking patterns and efficiency
6. **Auto Protocol Detection**: Automatically choose best connection type 