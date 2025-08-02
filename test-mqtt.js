// Test script for MQTT rice cooking system
// This script can be run in a Node.js environment to test MQTT communication
// Supports both WebSocket and TCP connections (TCP recommended for ESP32)

const mqtt = require('mqtt');

// MQTT Topics for rice cooking system
const MQTT_TOPICS = {
  START_COOKING: 'ricebot/start_cooking',
  COOKING_STATUS: 'ricebot/cooking_status',
  COOKING_PROGRESS: 'ricebot/cooking_progress',
  ALERTS: 'ricebot/alerts',
  DEVICE_STATUS: 'ricebot/device_status'
};

// Connection configurations
const CONNECTION_CONFIGS = {
  // TCP Configuration (Recommended for ESP32)
  tcp: {
    url: 'mqtt://broker.hivemq.com:1883',
    options: {
      clientId: 'test-client-tcp-' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    }
  },
  // WebSocket Configuration (Fallback)
  websocket: {
    url: 'ws://broker.hivemq.com:8000/mqtt',
    options: {
      clientId: 'test-client-ws-' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    }
  }
};

let client;
let connectionType = 'tcp'; // Default to TCP for ESP32 compatibility

function connectToBroker(type = 'tcp') {
  connectionType = type;
  const config = CONNECTION_CONFIGS[type];
  
  console.log(`🔌 Connecting to MQTT broker via ${type.toUpperCase()}: ${config.url}`);
  console.log(`📱 Recommended for ESP32 + React Native rice cooking system`);
  
  client = mqtt.connect(config.url, config.options);

  client.on('connect', () => {
    console.log(`✅ Connected to MQTT broker via ${type.toUpperCase()}`);
    
    // Subscribe to all topics
    Object.values(MQTT_TOPICS).forEach(topic => {
      client.subscribe(topic, (err) => {
        if (err) {
          console.log(`❌ Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  });

  client.on('message', (topic, message) => {
    console.log(`📨 Received on ${topic}:`, message.toString());
    
    try {
      const data = JSON.parse(message.toString());
      console.log('📊 Parsed data:', data);
    } catch (error) {
      console.log('📝 Raw message:', message.toString());
    }
  });

  client.on('error', (error) => {
    console.log('❌ MQTT Error:', error);
  });

  client.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });
}

// Test functions
function testStartCooking(quantity = '1 Cup') {
  if (!client || !client.connected) {
    console.log('❌ Client not connected');
    return;
  }

  const payload = {
    action: 'start_cooking',
    quantity: quantity,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.START_COOKING, JSON.stringify(payload));
  console.log(`🚀 Sent start cooking command: ${quantity}`);
}

function testCookingProgress(progress = 50, status = 'cooking') {
  if (!client || !client.connected) {
    console.log('❌ Client not connected');
    return;
  }

  const payload = {
    progress: progress,
    status: status,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.COOKING_PROGRESS, JSON.stringify(payload));
  console.log(`📊 Sent cooking progress: ${progress}% (${status})`);
}

function testAlert(message = 'Test alert message') {
  if (!client || !client.connected) {
    console.log('❌ Client not connected');
    return;
  }

  const payload = {
    type: 'warning',
    message: message,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.ALERTS, JSON.stringify(payload));
  console.log(`🚨 Sent alert: ${message}`);
}

function testDeviceStatus() {
  if (!client || !client.connected) {
    console.log('❌ Client not connected');
    return;
  }

  const payload = {
    wifi: true,
    water_flow: true,
    rice_level: 'normal',
    temperature: 25,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.DEVICE_STATUS, JSON.stringify(payload));
  console.log('📱 Sent device status');
}

function switchConnectionType(type) {
  if (client) {
    client.end();
  }
  
  setTimeout(() => {
    connectToBroker(type);
  }, 1000);
}

function runFullTest() {
  console.log('🧪 Starting MQTT tests for ESP32 rice cooking system...');
  
  setTimeout(() => {
    testStartCooking('1.5 Cup');
  }, 2000);
  
  setTimeout(() => {
    testCookingProgress(25, 'washing');
  }, 4000);
  
  setTimeout(() => {
    testCookingProgress(50, 'soaking');
  }, 6000);
  
  setTimeout(() => {
    testCookingProgress(75, 'cooking');
  }, 8000);
  
  setTimeout(() => {
    testCookingProgress(100, 'done');
  }, 10000);
  
  setTimeout(() => {
    testAlert('Low rice level detected!');
  }, 12000);
  
  setTimeout(() => {
    testDeviceStatus();
  }, 14000);
  
  setTimeout(() => {
    console.log('✅ Tests completed');
    if (client) {
      client.end();
    }
    process.exit(0);
  }, 16000);
}

// Export test functions for use in other scripts
module.exports = {
  testStartCooking,
  testCookingProgress,
  testAlert,
  testDeviceStatus,
  switchConnectionType,
  connectToBroker,
  MQTT_TOPICS,
  CONNECTION_CONFIGS
};

// If running this script directly, run some tests
if (require.main === module) {
  // Get connection type from command line argument
  const args = process.argv.slice(2);
  const connectionTypeArg = args[0];
  
  if (connectionTypeArg && (connectionTypeArg === 'tcp' || connectionTypeArg === 'websocket')) {
    connectionType = connectionTypeArg;
    console.log(`🔧 Using ${connectionType} connection as specified`);
  } else {
    console.log('🔧 Using TCP connection (default for ESP32). Use "node test-mqtt.js websocket" for WebSocket');
  }
  
  connectToBroker(connectionType);
  runFullTest();
} 