import { useState, useEffect } from 'react';
import mqttService from '../services/MqttService';

const useMqtt = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Listen for connection status changes
    const handleStatusChange = (status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      setIsConnecting(status === 'connecting');
    };

    mqttService.on('statusChange', handleStatusChange);

    // Get initial status
    const initialStatus = mqttService.getConnectionStatus();
    setConnectionStatus(initialStatus);
    setIsConnected(initialStatus === 'connected');
    setIsConnecting(initialStatus === 'connecting');

    return () => {
      // Cleanup listener if needed
    };
  }, []);

  const connect = async (config = {}) => {
    try {
      if (config.host && config.port) {
        mqttService.updateConfig(config);
      }
      await mqttService.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  };

  const disconnect = () => {
    mqttService.disconnect();
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

  return {
    connectionStatus,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
    mqttService,
  };
};

export default useMqtt;