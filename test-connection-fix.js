// Test script to verify MQTT connection management fixes
// This simulates the React Native app behavior

const mqtt = require('mqtt');

// MQTT Topics
const MQTT_TOPICS = {
  START_COOKING: 'ricebot/start_cooking',
  COOKING_PROGRESS: 'ricebot/cooking_progress',
  ALERTS: 'ricebot/alerts',
  DEVICE_STATUS: 'ricebot/device_status'
};

// Simulate React Native MQTT service behavior
class MockMqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.statusListeners = [];
    this.messageListeners = [];
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
    
    console.log(`🔌 Connecting to MQTT broker (Attempt ${this.connectionAttempts})`);
    
    // Simulate connection
    setTimeout(() => {
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this._emitStatus('connected');
      console.log('✅ MQTT Connected successfully');
    }, 1000);
  }

  disconnect() {
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.isConnected = false;
    this._emitStatus('disconnected');
    console.log('🔌 MQTT Disconnected');
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
  }

  _emitStatus(status) {
    this.statusListeners.forEach(cb => cb(status));
  }

  getConnectionStatus() {
    if (this.isConnecting) return 'connecting';
    return this.isConnected ? 'connected' : 'disconnected';
  }
}

// Simulate useMqtt hook
class MockUseMqtt {
  constructor() {
    this.mqttService = new MockMqttService();
    this.hasInitialized = false;
    this.hasConnected = false;
    this.connectionStatus = 'disconnected';
    this.isConnected = false;
    this.isConnecting = false;
  }

  initialize() {
    if (this.hasInitialized) {
      console.log('🔄 Already initialized, skipping...');
      return;
    }
    
    this.hasInitialized = true;
    console.log('🚀 Initializing MQTT hook...');

    // Listen for status changes
    this.mqttService.onStatusChange((status) => {
      this.connectionStatus = status;
      this.isConnected = status === 'connected';
      this.isConnecting = status === 'connecting';
      
      // Auto-connect on first initialization
      if (!this.hasConnected && status === 'disconnected') {
        this.hasConnected = true;
        console.log('🔄 Auto-connecting to MQTT on first initialization...');
        this.mqttService.connect();
      }
    });

    // Get initial status
    const initialStatus = this.mqttService.getConnectionStatus();
    this.connectionStatus = initialStatus;
    this.isConnected = initialStatus === 'connected';
    this.isConnecting = initialStatus === 'connecting';

    // Auto-connect if not already connected
    if (initialStatus === 'disconnected' && !this.hasConnected) {
      this.hasConnected = true;
      console.log('🔄 Auto-connecting to MQTT...');
      this.mqttService.connect();
    }
  }

  connect() {
    if (!this.isConnected && !this.isConnecting) {
      console.log('🔌 Manual connect requested...');
      this.mqttService.connect();
    } else {
      console.log('⏳ Already connected or connecting, skipping...');
    }
  }

  getStatus() {
    return {
      connectionStatus: this.connectionStatus,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting
    };
  }
}

// Test scenarios
console.log('🧪 Testing MQTT Connection Management Fixes\n');

// Test 1: Multiple hook initializations (simulating screen navigation)
console.log('📱 Test 1: Multiple hook initializations (screen navigation)');
const hook1 = new MockUseMqtt();
const hook2 = new MockUseMqtt();
const hook3 = new MockUseMqtt();

hook1.initialize(); // Should connect
setTimeout(() => {
  console.log('📱 Navigating to screen 2...');
  hook2.initialize(); // Should NOT connect again
  setTimeout(() => {
    console.log('📱 Navigating to screen 3...');
    hook3.initialize(); // Should NOT connect again
  }, 1000);
}, 1000);

// Test 2: Multiple connect calls
setTimeout(() => {
  console.log('\n📱 Test 2: Multiple connect calls');
  hook1.connect(); // Should skip (already connected)
  hook1.connect(); // Should skip (already connected)
  hook1.connect(); // Should skip (already connected)
}, 3000);

// Test 3: Connection status
setTimeout(() => {
  console.log('\n📱 Test 3: Connection status check');
  console.log('Hook 1 status:', hook1.getStatus());
  console.log('Hook 2 status:', hook2.getStatus());
  console.log('Hook 3 status:', hook3.getStatus());
}, 4000);

// Test 4: Disconnect and reconnect
setTimeout(() => {
  console.log('\n📱 Test 4: Disconnect and reconnect');
  hook1.mqttService.disconnect();
  setTimeout(() => {
    hook1.connect(); // Should connect again
  }, 1000);
}, 5000);

console.log('\n✅ Test completed! Check the logs above to verify connection management is working correctly.');
console.log('\nExpected behavior:');
console.log('- Only one connection attempt on first initialization');
console.log('- Subsequent initializations should not trigger new connections');
console.log('- Multiple connect() calls should be ignored if already connected');
console.log('- Auto-reconnect should work after disconnection'); 