import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { ScrollView as RNScrollView } from 'react-native'; // alias for debug log
import mqttService from '../services/MqttService';

const Settings = ({ navigation }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [brokerHost, setBrokerHost] = useState('554b0e4c82374d2ab695dd37313d9311.s1.eu.hivemq.cloud');
  const [brokerPort, setBrokerPort] = useState('8884');
  const [clientId, setClientId] = useState(`clientId-${Math.random().toString(36).substr(2, 9)}`);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keepAlive, setKeepAlive] = useState('60');
  const [debugLog, setDebugLog] = useState([]);

  const appendLog = (msg) => {
    setDebugLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-100));
  };

  useEffect(() => {
    // Listen for connection status changes
    const handleStatusChange = (status) => {
      setConnectionStatus(status);
      appendLog(`Status: ${status}`);
    };
    const handleRaw = (data) => appendLog(`Raw: ${data}`);
    const handleMessage = (msg) => appendLog(`Message: ${JSON.stringify(msg)}`);

    mqttService.on('statusChange', handleStatusChange);
    mqttService.on('rawMessage', handleRaw);
    mqttService.on('message', handleMessage);

    // Get initial status
    setConnectionStatus(mqttService.getConnectionStatus());

    return () => {
      // No off() method in current service, so logs will accumulate if you hot reload
    };
  }, []);

  const handleConnect = async () => {
    try {
      appendLog(`Connecting to: ${brokerHost}:${brokerPort} as ${clientId}`);
      mqttService.updateConfig({
        host: brokerHost,
        port: parseInt(brokerPort),
        clientId: clientId,
        username: username,
        password: password,
        keepalive: parseInt(keepAlive),
      });
      await mqttService.connect();
    } catch (error) {
      appendLog(`Failed to connect: ${error}`);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = () => {
    appendLog('Disconnecting...');
    mqttService.disconnect();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FF9800';
      case 'disconnected':
      default:
        return '#F44336';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/robot-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.searchContainer}>
          <Image
            source={require('../assets/search.png')}
            style={styles.searchIcon}
            resizeMode="contain"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#FFFFFF"
          />
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Image 
            source={require('../assets/menu.png')}
            style={styles.menuIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.connectionSection}>
          <View style={styles.connectionHeader}>
            <Text style={styles.connectionText}>
              My Home: <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
            </Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          </View>
          
          <View style={styles.brokerConfigContainer}>
            <Text style={styles.configLabel}>Broker Configuration:</Text>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Host:</Text>
              <TextInput
                style={styles.configInput}
                value={brokerHost}
                onChangeText={setBrokerHost}
                placeholder="mqtt-dashboard.com"
              />
            </View>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Port:</Text>
              <TextInput
                style={styles.configInput}
                value={brokerPort}
                onChangeText={setBrokerPort}
                placeholder="8884"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Client ID:</Text>
              <TextInput
                style={styles.configInput}
                value={clientId}
                onChangeText={setClientId}
                placeholder="clientId-xxx"
              />
            </View>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Username:</Text>
              <TextInput
                style={styles.configInput}
                value={username}
                onChangeText={setUsername}
                placeholder="(optional)"
              />
            </View>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Password:</Text>
              <TextInput
                style={styles.configInput}
                value={password}
                onChangeText={setPassword}
                placeholder="(optional)"
                secureTextEntry
              />
            </View>
            
            <View style={styles.configRow}>
              <Text style={styles.configFieldLabel}>Keep Alive:</Text>
              <TextInput
                style={styles.configInput}
                value={keepAlive}
                onChangeText={setKeepAlive}
                placeholder="60"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.serialInputContainer}>
            <TextInput
              style={styles.serialInput}
              placeholder="Serial-number"
              value={serialNumber}
              onChangeText={setSerialNumber}
            />
            {connectionStatus === 'connected' ? (
              <TouchableOpacity style={[styles.connectButton, styles.disconnectButton]} onPress={handleDisconnect}>
                <Text style={styles.connectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Debug Log Box */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Debug Log</Text>
          <RNScrollView style={styles.debugScroll}>
            {debugLog.map((line, idx) => (
              <Text key={idx} style={styles.debugLine}>{line}</Text>
            ))}
          </RNScrollView>
        </View>

        <View style={styles.riceCookerContainer}>
          <Image
            source={require('../assets/rice-cooker.png')}
            style={styles.riceCookerImage}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={require('../assets/profile.png')}
            style={styles.profileIcon}
          />
          <Text style={styles.profileButtonText}>Your Profile</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#178ea3',
  },
  logo: {
    width: 50,
    height: 50,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    backgroundColor: '#178ea3',
    padding: 15,
    borderRadius: 25,
    marginBottom: 30,
    borderWidth: 0.9,
    borderColor: '#096171',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  connectionSection: {
    marginBottom: 30,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  connectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  brokerConfigContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  configFieldLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  configInput: {
    flex: 1,
    height: 35,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 5,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  serialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  connectButton: {
    backgroundColor: '#178ea3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  riceCookerContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  riceCookerImage: {
    width: 300,
    height: 320,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#178ea3',
    padding: 16,
    borderRadius: 25,
    marginBottom:50
    
  },
  profileIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
    marginRight: 12,
  },
  profileButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  // Add debug box styles:
  debugBox: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 10,
    marginTop: 20,
    marginBottom: 30,
    minHeight: 120,
    maxHeight: 200,
  },
  debugTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  debugScroll: {
    maxHeight: 160,
  },
  debugLine: {
    color: '#b5e853',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default Settings;