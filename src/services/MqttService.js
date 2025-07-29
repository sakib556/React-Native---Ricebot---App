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

// MQTT connection options
const options = {
  host: 'broker.hivemq.com',
  port: 8000, // WebSocket port for HiveMQ public broker
  path: '/mqtt', // WebSocket path for HiveMQ
  id: 'id_' + parseInt(Math.random() * 100000),
};

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.statusListeners = [];
    this.messageListeners = [];
    this.subscribedTopics = new Set();
  }

  _setupClient() {
    this.client = new Paho.MQTT.Client(options.host, options.port, options.path);
    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      this._emitStatus('disconnected');
      if (responseObject.errorCode !== 0) {
        console.log('onConnectionLost:', responseObject.errorMessage);
      }
    };
    this.client.onMessageArrived = (message) => {
      this._emitMessage(message);
    };
  }

  connect() {
    if (this.client) {
      this.disconnect();
    }
    this._setupClient();
    this._emitStatus('connecting');
    this.client.connect({
      onSuccess: () => {
        this.isConnected = true;
        this._emitStatus('connected');
      },
      useSSL: false,
      timeout: 3,
      onFailure: (err) => {
        this.isConnected = false;
        this._emitStatus(`failed: ${err?.errorMessage || err?.toString?.() || 'Unknown error'}`);
        console.log('Connect failed!', err);
      },
      userName: '', // Add if needed
      password: '', // Add if needed
      cleanSession: true,
      keepAliveInterval: 60,
    });
  }

  disconnect() {
    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.isConnected = false;
      this._emitStatus('disconnected');
      this.subscribedTopics.clear();
    }
  }

  subscribe(topic, onMessage) {
    if (!this.client || !this.isConnected) return;
    this.client.subscribe(topic, { qos: 0 });
    this.subscribedTopics.add(topic);
    if (onMessage) {
      // Add a wrapper to filter messages for this topic
      const listener = (message) => {
        if (message.destinationName === topic) {
          onMessage(message);
        }
      };
      this.messageListeners.push(listener);
    }
  }

  unsubscribe(topic) {
    if (!this.client || !this.isConnected) return;
    this.client.unsubscribe(topic);
    this.subscribedTopics.delete(topic);
  }

  publish(topic, message) {
    if (!this.client || !this.isConnected) return;
    const msg = new Paho.MQTT.Message(options.id + ':' + message);
    msg.destinationName = topic;
    this.client.send(msg);
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
  }

  _emitStatus(status) {
    this.statusListeners.forEach((cb) => cb(status));
  }

  onMessage(listener) {
    this.messageListeners.push(listener);
  }

  _emitMessage(message) {
    this.messageListeners.forEach((cb) => cb(message));
  }

  getConnectionStatus() {
    return this.isConnected ? 'connected' : 'disconnected';
  }
}

const mqttService = new MqttService();
export default mqttService;