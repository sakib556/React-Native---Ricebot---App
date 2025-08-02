# MQTT Connection Management Fixes

## 🔍 **Problems Identified**

### **1. Multiple Connection Attempts**
- Each screen was calling `connect()` independently
- Navigation between screens triggered new connection attempts
- No connection state management across components

### **2. Connection State Errors**
- `AMQJS0011E Invalid state not connecting or connected`
- `AMQJSC0001E Connect timed out`
- Connection lost errors during navigation

### **3. Poor Error Handling**
- No retry logic for failed connections
- No prevention of duplicate connection attempts
- Missing error boundaries for MQTT operations

## 🔧 **Fixes Implemented**

### **1. Centralized Connection Management**

#### **MqttService.js Updates**
```javascript
class MqttService {
  constructor() {
    this.isConnecting = false;           // Track connection state
    this.connectionAttempts = 0;         // Track retry attempts
    this.maxConnectionAttempts = 3;      // Limit retries
  }

  connect() {
    // Prevent multiple connection attempts
    if (this.isConnected) {
      console.log('✅ Already connected to MQTT');
      return;
    }
    
    if (this.isConnecting) {
      console.log('⏳ Already connecting to MQTT...');
      return;
    }

    this.isConnecting = true;
    this.connectionAttempts++;
    // ... connection logic
  }
}
```

#### **useMqtt Hook Updates**
```javascript
const useMqtt = () => {
  const hasInitialized = useRef(false);  // Prevent multiple initializations
  const hasConnected = useRef(false);    // Track connection attempts

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    // ... setup listeners and auto-connect
  }, []);

  const connect = async () => {
    // Only connect if not already connected or connecting
    if (!isConnected && !isConnecting) {
      console.log('🔌 Manual connect requested...');
      mqttService.connect();
    } else {
      console.log('⏳ Already connected or connecting, skipping...');
    }
  };
};
```

### **2. Auto-Reconnection Logic**

```javascript
// Auto-reconnect on connection loss
this.client.onConnectionLost = (responseObject) => {
  this.isConnected = false;
  this.isConnecting = false;
  this._emitStatus('disconnected');
  
  // Auto-reconnect if under max attempts
  if (this.connectionAttempts < this.maxConnectionAttempts) {
    console.log('🔄 Auto-reconnecting...');
    setTimeout(() => this.connect(), 3000);
  }
};
```

### **3. Error Handling Improvements**

```javascript
// Try-catch blocks around all MQTT operations
try {
  this.client.subscribe(topic, { qos: 0 });
  // ... success logic
} catch (error) {
  console.log('Error subscribing to topic:', error);
  return false;
}

// Error handling in listeners
_emitStatus(status) {
  this.statusListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (error) {
      console.log('Error in status listener:', error);
    }
  });
}
```

### **4. Screen Component Updates**

#### **Before (Problematic)**
```javascript
useEffect(() => {
  // Connect to MQTT if not connected
  if (!isConnected) {
    connect(); // ❌ Called on every screen mount
  }
  // ... subscribe logic
}, [isConnected]);
```

#### **After (Fixed)**
```javascript
useEffect(() => {
  // MQTT connection is handled automatically by useMqtt hook
  console.log('🍚 Screen: MQTT connection status:', isConnected ? 'Connected' : 'Disconnected');
  // ... subscribe logic only
}, [isConnected]);
```

## 📊 **Connection Flow**

### **Before Fix**
```
Screen 1 Mount → connect() → MQTT Connect
Screen 2 Mount → connect() → MQTT Connect (❌ Duplicate)
Screen 3 Mount → connect() → MQTT Connect (❌ Duplicate)
Navigation → Multiple connection attempts → Errors
```

### **After Fix**
```
App Start → useMqtt Hook → Auto-connect once
Screen 1 Mount → Check connection status → Subscribe only
Screen 2 Mount → Check connection status → Subscribe only  
Screen 3 Mount → Check connection status → Subscribe only
Navigation → No new connections → Stable
```

## ✅ **Benefits**

### **1. Stable Connections**
- ✅ Single connection attempt on app start
- ✅ Connection maintained across screen navigation
- ✅ Auto-reconnection on connection loss

### **2. Better Performance**
- ✅ No duplicate connection attempts
- ✅ Reduced network overhead
- ✅ Faster screen transitions

### **3. Improved Error Handling**
- ✅ Graceful error recovery
- ✅ Retry logic with limits
- ✅ Better error messages

### **4. User Experience**
- ✅ No connection errors during navigation
- ✅ Consistent MQTT state across screens
- ✅ Reliable real-time updates

## 🧪 **Testing**

### **Test Scenarios**
1. **App Launch**: Should connect once automatically
2. **Screen Navigation**: Should not trigger new connections
3. **Multiple connect() calls**: Should be ignored if already connected
4. **Connection Loss**: Should auto-reconnect up to 3 times
5. **Error Recovery**: Should handle errors gracefully

### **Expected Logs**
```
🚀 Initializing MQTT hook...
🔄 Auto-connecting to MQTT...
🔌 Connecting to MQTT broker via TCP: broker.hivemq.com:8000 (Attempt 1)
✅ MQTT Connected successfully via TCP
📱 Navigating to screen 2...
⏳ Already connected or connecting, skipping...
📱 Navigating to screen 3...
⏳ Already connected or connecting, skipping...
```

## 🎯 **Result**

Your React Native app now has:
- **Stable MQTT connections** across all screens
- **No more connection errors** during navigation
- **Automatic reconnection** on connection loss
- **Better error handling** and recovery
- **Improved performance** with single connection management

The MQTT system is now robust and ready for production use! 🍚📱 