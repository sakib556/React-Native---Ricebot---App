// import { MqttClient } from '@d11/react-native-mqtt';

// class MqttService {
//   constructor() {
//     this.client = null;
//     this.isConnected = false;
//     this.eventListeners = new Map();
//     this.config = {
//       host: '554b0e4c82374d2ab695dd37313d9311.s1.eu.hivemq.cloud',
//       port: 8884,
//       clientId: `clientId-${Math.random().toString(36).substr(2, 9)}`,
//       keepAlive: 60,
//       topic: 'testtopic/1',
//     };
//   }

//   on(event, listener) {
//     if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
//     this.eventListeners.get(event).push(listener);
//   }

//   emit(event, ...args) {
//     const listeners = this.eventListeners.get(event);
//     if (listeners) listeners.forEach(fn => fn(...args));
//   }

//   connect() {
//     return new Promise((resolve, reject) => {
//       const { clientId, host, port, keepAlive, topic } = this.config;
//       this.emit('statusChange', 'connecting');
//       this.client = new MqttClient(clientId, host, port, { keepAlive });

//       this.client.setOnConnectCallback(() => {
//         this.isConnected = true;
//         this.emit('statusChange', 'connected');
//         this.subscribe(topic); // auto-subscribe to default topic
//         resolve();
//       });

//       this.client.setOnDisconnectCallback(() => {
//         this.isConnected = false;
//         this.emit('statusChange', 'disconnected');
//       });

//       this.client.setOnErrorCallback((err) => {
//         this.isConnected = false;
//         this.emit('statusChange', 'disconnected');
//         reject(err);
//       });

//       // No need to call subscribe here, will be called on connect
//       this.client.connect();
//     });
//   }

//   subscribe(topic, callback) {
//     if (this.client && this.isConnected) {
//       this.client.subscribe({
//         topic,
//         qos: 0,
//         onEvent: (msg) => {
//           if (callback) callback(msg);
//           this.emit('message', msg);
//         },
//       });
//     }
//   }

//   publish(topic, message) {
//     if (this.client && this.isConnected) {
//       this.client.publish(topic, message, { qos: 0 });
//     }
//   }

//   disconnect() {
//     if (this.client) {
//       this.client.disconnect();
//       this.isConnected = false;
//       this.emit('statusChange', 'disconnected');
//     }
//   }

//   getConnectionStatus() {
//     return this.isConnected ? 'connected' : 'disconnected';
//   }

//   updateConfig(newConfig) {
//     this.config = { ...this.config, ...newConfig };
//   }
// }

// const mqttService = new MqttService();
// export default mqttService;