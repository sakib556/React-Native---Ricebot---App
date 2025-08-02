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

// MQTT connection options - Only WebSocket configuration
const MQTT_CONFIG = {
  websocket: {
    host: 'broker.hivemq.com',
    port: 8000, // WebSocket port for HiveMQ
    path: '/mqtt', // WebSocket path for HiveMQ
    id: 'id_' + parseInt(Math.random() * 100000), // Unique client ID
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

    // Fixed to WebSocket
    this.options = MQTT_CONFIG.websocket;

    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 10; // Increased max attempts for more resilience
    this.reconnectTimeout = null;

    // Properties for exponential backoff
    this.initialReconnectDelay = 3000; // 3 seconds
    this.reconnectDelay = this.initialReconnectDelay;
    this.maxReconnectDelay = 30000; // 30 seconds
  }

  // Get current connection configuration (type is now implied)
  getConnectionConfig() {
    return {
      host: this.options.host,
      port: this.options.port,
      protocol: 'ws' // Always WebSocket
    };
  }

  _setupClient() {
    // Paho.MQTT.Client for WebSocket connections
    this.client = new Paho.MQTT.Client(
      this.options.host,
      this.options.port,
      this.options.path,
      this.options.id
    );

    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      this.isConnecting = false;
      this._emitStatus('disconnected');
      if (responseObject.errorCode !== 0) {
        console.log('onConnectionLost:', responseObject.errorMessage);
      }

      // Auto-reconnect with exponential backoff if not manually disconnected
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Auto-reconnecting in ${this.reconnectDelay / 1000} seconds... (Attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
        this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay);
        // Increase delay for next attempt, up to maxReconnectDelay
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      } else {
        console.log('❌ Max connection attempts reached. Manual reconnect required.');
        // Optionally, emit a specific status for max attempts reached
        this._emitStatus('reconnect_failed');
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

    // Clear any pending reconnect timeout if a manual connect is triggered
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear any existing client to ensure a fresh connection
    if (this.client) {
      try {
        console.log('Attempting to disconnect old client before new connection...');
        this.client.disconnect(); // This might throw if not connected/connecting
      } catch (error) {
        // This error is often benign if the client was already in a non-connectable state.
        console.log('Error disconnecting old client (might be benign):', error.message);
      }
      this.client = null; // Ensure client is null before _setupClient re-initializes it
    }

    this.isConnecting = true;
    this.connectionAttempts++;
    this._setupClient(); // Re-initialize the client instance

    this._emitStatus('connecting');

    console.log(`🔌 Connecting to MQTT broker via WEBSOCKET: ${this.options.host}:${this.options.port} (Attempt ${this.connectionAttempts})`);

    try {
      this.client.connect({
        onSuccess: () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.connectionAttempts = 0; // Reset attempts on success
          this.reconnectDelay = this.initialReconnectDelay; // Reset reconnect delay on success
          this._emitStatus('connected');
          console.log(`✅ MQTT Connected successfully via WEBSOCKET`);

          // Resubscribe to topics after reconnection
          this._resubscribeTopics();
        },
        useSSL: false, // No SSL for public broker
        timeout: 20, // Increased timeout for connection attempt
        onFailure: (err) => {
          this.isConnected = false;
          this.isConnecting = false;
          this._emitStatus(`failed: ${err?.errorMessage || err?.toString?.() || 'Unknown error'}`);
          console.log('Connect failed!', err);

          console.log('❌ MQTT connection failed. Check network connectivity or broker status.');

          // Auto-retry if under max attempts
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            console.log(`🔄 Retrying connection in ${this.reconnectDelay / 1000} seconds... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
            this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
          } else {
            console.log('❌ Max connection attempts reached. Manual reconnect required.');
            this._emitStatus('reconnect_failed'); // Specific status for client to react to
          }
        },
        userName: '', // Add if needed
        password: '', // Add if needed
        cleanSession: true,
        keepAliveInterval: 30, // Decreased keep-alive interval
      });
    } catch (error) {
      this.isConnecting = false;
      this._emitStatus(`failed: ${error?.toString?.() || 'Connection setup error'}`);
      console.log('Connection setup error:', error);

      // Also trigger reconnect logic if initial setup fails
      if (this.connectionAttempts < this.maxConnectionAttempts) {
          console.log(`🔄 Retrying connection in ${this.reconnectDelay / 1000} seconds due to setup error...`);
          this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      } else {
          console.log('❌ Max connection attempts reached after setup error. Manual reconnect required.');
          this._emitStatus('reconnect_failed');
      }
    }
  }

  disconnect() {
    this.isConnecting = false;
    this.connectionAttempts = 0; // Reset attempts on manual disconnect
    this.reconnectDelay = this.initialReconnectDelay; // Reset delay on manual disconnect

    // Clear any pending auto-reconnect timeout
    if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
    }

    if (this.client && this.isConnected) {
      try {
        this.client.disconnect();
        console.log('🔌 MQTT Disconnected successfully');
      } catch (error) {
        console.log('Error during explicit disconnect:', error);
      }
    } else {
        console.log('🔌 MQTT not connected or client not initialized, no explicit disconnect needed.');
    }

    this.isConnected = false;
    this._emitStatus('disconnected');
    this.subscribedTopics.clear(); // Clear subscribed topics on disconnect
  }

  // Resubscribe to all topics after reconnection
  _resubscribeTopics() {
    console.log('📡 Resubscribing to topics after reconnection...');
    // This will be handled by the components that need to resubscribe.
    // However, if you want the MqttService to automatically resubscribe
    // to previously subscribed topics, you would iterate over `this.subscribedTopics`
    // and call `this.client.subscribe(topic)` for each.
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
