// Test script for App Developers - No ESP32 Required
// This simulates ESP32 responses to test your React Native app

const mqtt = require('mqtt');

// MQTT Topics
const MQTT_TOPICS = {
  START_COOKING: 'ricebot/start_cooking',
  COOKING_PROGRESS: 'ricebot/cooking_progress',
  ALERTS: 'ricebot/alerts',
  DEVICE_STATUS: 'ricebot/device_status'
};

// Connect to MQTT broker (TCP - same as your app)
const client = mqtt.connect('mqtt://broker.hivemq.com:1883', {
  clientId: 'app-test-client-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

console.log('🧪 App Developer Test Mode - Simulating ESP32');
console.log('📱 This script simulates ESP32 responses for your React Native app');

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log('📡 Subscribing to all topics...');
  
  // Subscribe to topics
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
  
  // Simulate ESP32 response to start cooking command
  if (topic === MQTT_TOPICS.START_COOKING) {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'start_cooking') {
        console.log('🚀 Simulating ESP32 response to start cooking...');
        simulateCookingProcess(data.quantity);
      }
    } catch (error) {
      console.log('❌ Failed to parse start cooking message');
    }
  }
});

client.on('error', (error) => {
  console.log('❌ MQTT Error:', error);
});

// Simulate cooking process
function simulateCookingProcess(quantity) {
  console.log(`🍚 Starting dummy cooking process for ${quantity}`);
  
  let progress = 0;
  let status = 'washing';
  
  // Send initial status
  publishDeviceStatus(true, progress, status);
  publishAlert('info', `Dummy cooking started for ${quantity}`);
  
  const interval = setInterval(() => {
    progress += 5;
    
    // Update status based on progress
    if (progress <= 25) {
      status = 'washing';
    } else if (progress <= 50) {
      status = 'soaking';
    } else if (progress <= 100) {
      status = 'cooking';
    }
    
    // Publish progress
    publishCookingProgress(progress, status);
    publishDeviceStatus(true, progress, status);
    
    // Send random alerts
    if (Math.random() < 0.3) { // 30% chance
      const alerts = [
        'Dummy: Water flow is normal',
        'Dummy: Temperature is rising',
        'Dummy: Rice level is adequate',
        'Dummy: Cooking process is proceeding well'
      ];
      publishAlert('info', alerts[Math.floor(Math.random() * alerts.length)]);
    }
    
    // Complete cooking
    if (progress >= 100) {
      clearInterval(interval);
      publishCookingProgress(100, 'done');
      publishAlert('success', 'Dummy cooking completed! Rice is ready.');
      publishDeviceStatus(false, 100, 'done');
      console.log('✅ Dummy cooking process completed!');
    }
    
    console.log(`📊 Progress: ${progress}% - Status: ${status}`);
  }, 2000); // Update every 2 seconds
}

function publishCookingProgress(progress, status) {
  const payload = {
    progress: progress,
    status: status,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.COOKING_PROGRESS, JSON.stringify(payload));
  console.log(`📤 Published progress: ${progress}% (${status})`);
}

function publishAlert(type, message) {
  const payload = {
    type: type,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.ALERTS, JSON.stringify(payload));
  console.log(`🚨 Published alert: ${message}`);
}

function publishDeviceStatus(isCooking, progress, status) {
  const payload = {
    wifi: true,
    water_flow: true,
    rice_level: 'normal',
    temperature: 25,
    is_cooking: isCooking,
    cooking_progress: progress,
    cooking_status: status,
    is_dummy_mode: true,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.DEVICE_STATUS, JSON.stringify(payload));
  console.log(`📱 Published device status: cooking=${isCooking}, progress=${progress}%`);
}

// Manual test functions
function testStartCooking(quantity = '1.5 Cup') {
  const payload = {
    action: 'start_cooking',
    quantity: quantity,
    timestamp: new Date().toISOString()
  };
  
  client.publish(MQTT_TOPICS.START_COOKING, JSON.stringify(payload));
  console.log(`🚀 Sent start cooking command: ${quantity}`);
}

function testAlert(message = 'Manual test alert') {
  publishAlert('warning', message);
}

function testDeviceStatus() {
  publishDeviceStatus(false, 0, 'idle');
}

// Command line interface
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🎮 Manual Test Commands:');
console.log('start [quantity] - Start cooking (e.g., "start 2 Cup")');
console.log('alert [message]   - Send alert (e.g., "alert Test message")');
console.log('status            - Publish device status');
console.log('quit              - Exit\n');

rl.on('line', (input) => {
  const args = input.trim().split(' ');
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'start':
      const quantity = args.slice(1).join(' ') || '1.5 Cup';
      testStartCooking(quantity);
      break;
    case 'alert':
      const message = args.slice(1).join(' ') || 'Manual test alert';
      testAlert(message);
      break;
    case 'status':
      testDeviceStatus();
      break;
    case 'quit':
    case 'exit':
      console.log('👋 Goodbye!');
      client.end();
      process.exit(0);
      break;
    default:
      console.log('❌ Unknown command. Type "start", "alert", "status", or "quit"');
  }
});

// Auto-start test after 3 seconds
setTimeout(() => {
  console.log('🔄 Auto-starting test cooking process in 3 seconds...');
  setTimeout(() => {
    testStartCooking('1 Cup');
  }, 3000);
}, 3000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  client.end();
  process.exit(0);
}); 