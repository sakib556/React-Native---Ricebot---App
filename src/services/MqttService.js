import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';

// Initialize react_native_mqtt with AsyncStorage
init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync: {},
});

// MQTT connection options - React Native only supports WebSocket
// We'll use WebSocket for both "TCP" and "WebSocket" modes
const MQTT_CONFIG = {
  // WebSocket Configuration (Primary - works with ESP32 TCP)
  tcp: {
    host: 'broker.hivemq.com',
    port: 8000, // WebSocket port for HiveMQ (compatible with ESP32 TCP)
    path: '/mqtt', // WebSocket path for HiveMQ
    protocol: 'ws',
    id: 'id_' + parseInt(Math.random() * 100000),
  },
  // WebSocket Configuration (Alternative)
  websocket: {
    host: 'broker.hivemq.com',
    port: 8000, // WebSocket port for HiveMQ
    path: '/mqtt', // WebSocket path for HiveMQ
    protocol: 'ws',
    id: 'id_' + parseInt(Math.random() * 100000),
  }
};

// MQTT Topics for rice cooking system
export const MQTT_TOPICS = {
  START_COOKING: 'ricebot/start_cooking',
  COOKING_STATUS: 'ricebot/cooking_status',
  COOKING_PROGRESS: 'ricebot/cooking_progress',
  ALERTS: 'ricebot/alerts',
  DEVICE_STATUS: 'ricebot/device_status'
};

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.statusListeners = [];
    this.messageListeners = [];
    this.subscribedTopics = new Set();
    this.connectionType = 'websocket'; // Default to WebSocket for React Native
    this.options = MQTT_CONFIG.websocket;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.reconnectTimeout = null;
  }

  // Method to switch between WebSocket and TCP
  setConnectionType(type) {
    if (type === 'tcp' || type === 'websocket') {
      this.connectionType = type;
      this.options = MQTT_CONFIG[type];
      console.log(`🔧 MQTT connection type set to: ${type}`);
      return true;
    }
    console.log('❌ Invalid connection type. Use "tcp" or "websocket"');
    return false;
  }

  // Get current connection configuration
  getConnectionConfig() {
    return {
      type: this.connectionType,
      host: this.options.host,
      port: this.options.port,
      protocol: this.options.protocol
    };
  }

  _setupClient() {
    if (this.connectionType === 'tcp') {
      // TCP connection setup
      this.client = new Paho.MQTT.Client(this.options.host, this.options.port, this.options.id);
    } else {
      // WebSocket connection setup
      this.client = new Paho.MQTT.Client(this.options.host, this.options.port, this.options.path);
    }

    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      this.isConnecting = false;
      this._emitStatus('disconnected');
      if (responseObject.errorCode !== 0) {
        console.log('onConnectionLost:', responseObject.errorMessage);
      }
      
      // Auto-reconnect if not manually disconnected
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log('🔄 Auto-reconnecting...');
        setTimeout(() => this.connect(), 3000);
      }
    };
    
    this.client.onMessageArrived = (message) => {
      this._emitMessage(message);
    };
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

    // Clear any existing client
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (error) {
        console.log('Error disconnecting old client:', error);
      }
      this.client = null;
    }

    this.isConnecting = true;
    this.connectionAttempts++;
    this._setupClient();
    this._emitStatus('connecting');
    
    console.log(`🔌 Connecting to MQTT broker via ${this.connectionType.toUpperCase()}: ${this.options.host}:${this.options.port} (Attempt ${this.connectionAttempts})`);
    
    try {
      this.client.connect({
        onSuccess: () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.connectionAttempts = 0; // Reset attempts on success
          this._emitStatus('connected');
          console.log(`✅ MQTT Connected successfully via ${this.connectionType.toUpperCase()}`);
          
          // Resubscribe to topics after reconnection
          this._resubscribeTopics();
        },
        useSSL: false, // No SSL for public broker
        timeout: 10, // Increased timeout
        onFailure: (err) => {
          this.isConnected = false;
          this.isConnecting = false;
          this._emitStatus(`failed: ${err?.errorMessage || err?.toString?.() || 'Unknown error'}`);
          console.log('Connect failed!', err);
          
          // Both TCP and WebSocket modes use WebSocket, so no fallback needed
          console.log('❌ MQTT connection failed. Check network connectivity.');
          
          // Auto-retry if under max attempts
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            console.log(`🔄 Retrying connection in 5 seconds... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
            setTimeout(() => this.connect(), 5000);
          } else {
            console.log('❌ Max connection attempts reached. Manual reconnect required.');
          }
        },
        userName: '', // Add if needed
        password: '', // Add if needed
        cleanSession: true,
        keepAliveInterval: 60,
      });
    } catch (error) {
      this.isConnecting = false;
      this._emitStatus(`failed: ${error?.toString?.() || 'Connection error'}`);
      console.log('Connection setup error:', error);
    }
  }

  disconnect() {
    this.isConnecting = false;
    this.connectionAttempts = 0; // Reset attempts on manual disconnect
    
    if (this.client && this.isConnected) {
      try {
        this.client.disconnect();
      } catch (error) {
        console.log('Error during disconnect:', error);
      }
    }
    
    this.isConnected = false;
    this._emitStatus('disconnected');
    this.subscribedTopics.clear();
    console.log('🔌 MQTT Disconnected');
  }

  // Resubscribe to all topics after reconnection
  _resubscribeTopics() {
    console.log('📡 Resubscribing to topics after reconnection...');
    // This will be handled by the components that need to resubscribe
  }

  subscribe(topic, onMessage) {
    if (!this.client || !this.isConnected) {
      console.log('Cannot subscribe: MQTT not connected');
      return false;
    }
    
    try {
      this.client.subscribe(topic, { qos: 0 });
      this.subscribedTopics.add(topic);
      
      if (onMessage) {
        // Add a wrapper to filter messages for this topic
        const listener = (message) => {
          if (message.destinationName === topic) {
            try {
              const payload = message.payloadString;
              const parsedPayload = JSON.parse(payload);
              onMessage(parsedPayload);
            } catch (error) {
              // If JSON parsing fails, send raw payload
              onMessage(message.payloadString);
            }
          }
        };
        this.messageListeners.push(listener);
      }
      
      console.log(`📡 Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.log('Error subscribing to topic:', error);
      return false;
    }
  }

  unsubscribe(topic) {
    if (!this.client || !this.isConnected) return;
    
    try {
      this.client.unsubscribe(topic);
      this.subscribedTopics.delete(topic);
      console.log(`📡 Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.log('Error unsubscribing from topic:', error);
    }
  }

  publish(topic, message) {
    if (!this.client || !this.isConnected) {
      console.log('Cannot publish: MQTT not connected');
      return false;
    }
    
    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      const msg = new Paho.MQTT.Message(payload);
      msg.destinationName = topic;
      this.client.send(msg);
      
      console.log(`📤 Published to ${topic}:`, payload);
      return true;
    } catch (error) {
      console.log('Error publishing message:', error);
      return false;
    }
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
  }

  _emitStatus(status) {
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (error) {
        console.log('Error in status listener:', error);
      }
    });
  }

  onMessage(listener) {
    this.messageListeners.push(listener);
  }

  _emitMessage(message) {
    this.messageListeners.forEach((cb) => {
      try {
        cb(message);
      } catch (error) {
        console.log('Error in message listener:', error);
      }
    });
  }

  getConnectionStatus() {
    if (this.isConnecting) return 'connecting';
    return this.isConnected ? 'connected' : 'disconnected';
  }

  // Specific methods for rice cooking system
  startCooking(quantity) {
    const payload = {
      action: 'start_cooking',
      quantity: quantity,
      timestamp: new Date().toISOString()
    };
    return this.publish(MQTT_TOPICS.START_COOKING, payload);
  }

  subscribeToCookingProgress(callback) {
    return this.subscribe(MQTT_TOPICS.COOKING_PROGRESS, callback);
  }

  subscribeToAlerts(callback) {
    return this.subscribe(MQTT_TOPICS.ALERTS, callback);
  }

  subscribeToDeviceStatus(callback) {
    return this.subscribe(MQTT_TOPICS.DEVICE_STATUS, callback);
  }
}

const mqttService = new MqttService();
export default mqttService;