class MqttService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.eventListeners = new Map();
    this.subscribers = new Map();
    this.messageId = 0;

    this.config = {
      host: '554b0e4c82374d2ab695dd37313d9311.s1.eu.hivemq.cloud',
      port: 8884,
      protocol: 'wss',
      clientId: `clientId-${Math.random().toString(36).substr(2, 9)}`,
      keepalive: 60,
      topic: 'testtopic/1',
    };
  }

  on(event, listener) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(listener);
  }

  emit(event, ...args) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach(fn => fn(...args));
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) return reject('Already connecting');
      this.isConnecting = true;
      this.emit('statusChange', 'connecting');

      const url = `wss://${this.config.host}:${this.config.port}/mqtt`;
      console.log('Connecting to:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log('Connected to MQTT broker');
        this.emit('statusChange', 'connected');
        // Subscribe to topic after connect
        // this.subscribe(this.config.topic, (msg) => {
        //   this.emit('message', msg);
        // });
        // resolve();
      };

      this.ws.onmessage = (event) => {
        console.log('Received raw message:', event.data);
        // Just emit the raw message for now
        this.emit('rawMessage', event.data);
      };

      this.ws.onerror = (err) => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log('MQTT connection error:', err);
        this.emit('statusChange', 'disconnected');
        reject(err);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log('MQTT connection closed');
        this.emit('statusChange', 'disconnected');
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.emit('statusChange', 'disconnected');
      console.log('Disconnected from MQTT broker');
    }
  }

  subscribe(topic, callback) {
    this.subscribers.set(topic, callback);
    console.log(`Subscribed to topic: ${topic}`);
  }

  publish(topic, message) {
    if (!this.ws || !this.isConnected) return;
    const payload = {
      type: 'publish',
      topic,
      payload: message,
      messageId: ++this.messageId,
    };
    this.ws.send(JSON.stringify(payload));
    console.log(`Published to topic ${topic}:`, message);
  }

  getConnectionStatus() {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected) return 'connected';
    return 'disconnected';
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

const mqttService = new MqttService();
export default mqttService;