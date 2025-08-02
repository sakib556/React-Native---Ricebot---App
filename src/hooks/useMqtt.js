import { useState, useEffect, useRef } from 'react';
import mqttService, { MQTT_TOPICS } from '../services/MqttService';

const useMqtt = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cookingProgress, setCookingProgress] = useState(0);
  const [cookingStatus, setCookingStatus] = useState('idle');
  const [alerts, setAlerts] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [connectionConfig, setConnectionConfig] = useState({
    type: 'websocket',
    host: 'broker.hivemq.com',
    port: 8000,
    protocol: 'ws'
  });
  
  // Use refs to track if we've already set up listeners and connection
  const hasInitialized = useRef(false);
  const hasConnected = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;

    // Listen for connection status changes
    const handleStatusChange = (status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      setIsConnecting(status === 'connecting');
      
      // Auto-connect on first initialization if not connected
      if (!hasConnected.current && status === 'disconnected') {
        hasConnected.current = true;
        console.log('🔄 Auto-connecting to MQTT on first initialization...');
        mqttService.connect();
      }
    };

    mqttService.onStatusChange(handleStatusChange);

    // Get initial status and config
    const initialStatus = mqttService.getConnectionStatus();
    const initialConfig = mqttService.getConnectionConfig();
    setConnectionStatus(initialStatus);
    setIsConnected(initialStatus === 'connected');
    setIsConnecting(initialStatus === 'connecting');
    setConnectionConfig(initialConfig);

    // Auto-connect if not already connected
    if (initialStatus === 'disconnected' && !hasConnected.current) {
      hasConnected.current = true;
      console.log('🔄 Auto-connecting to MQTT...');
      mqttService.connect();
    }

    return () => {
      // Cleanup listeners if needed
      // Note: We don't disconnect here to maintain connection across screens
    };
  }, []);

  const connect = async (config = {}) => {
    try {
      if (config.host && config.port) {
        // Update config if needed
        console.log('Config update not implemented yet');
      }
      
      // Only connect if not already connected or connecting
      if (!isConnected && !isConnecting) {
        console.log('🔌 Manual connect requested...');
        mqttService.connect();
      } else {
        console.log('⏳ Already connected or connecting, skipping...');
      }
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  };

  const disconnect = () => {
    hasConnected.current = false;
    mqttService.disconnect();
  };

  const setConnectionType = (type) => {
    const success = mqttService.setConnectionType(type);
    if (success) {
      setConnectionConfig(mqttService.getConnectionConfig());
    }
    return success;
  };

  const subscribe = (topic, callback) => {
    return mqttService.subscribe(topic, callback);
  };

  const unsubscribe = (topic) => {
    return mqttService.unsubscribe(topic);
  };

  const publish = (topic, message, options = {}) => {
    return mqttService.publish(topic, message, options);
  };

  // Rice cooking specific methods
  const startCooking = (quantity) => {
    return mqttService.startCooking(quantity);
  };

  const subscribeToCookingProgress = (callback) => {
    return mqttService.subscribeToCookingProgress(callback);
  };

  const subscribeToAlerts = (callback) => {
    return mqttService.subscribeToAlerts(callback);
  };

  const subscribeToDeviceStatus = (callback) => {
    return mqttService.subscribeToDeviceStatus(callback);
  };

  return {
    connectionStatus,
    isConnected,
    isConnecting,
    connectionConfig,
    cookingProgress,
    cookingStatus,
    alerts,
    deviceStatus,
    connect,
    disconnect,
    setConnectionType,
    subscribe,
    unsubscribe,
    publish,
    startCooking,
    subscribeToCookingProgress,
    subscribeToAlerts,
    subscribeToDeviceStatus,
    mqttService,
    MQTT_TOPICS,
  };
};

export default useMqtt;