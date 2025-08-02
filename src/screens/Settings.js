import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Switch,
} from 'react-native';
import useMqtt from '../hooks/useMqtt';

const Settings = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  
  const { 
    isConnected, 
    connectionConfig
  } = useMqtt();



  const getConnectionTypeColor = () => {
    if (isConnected) {
      return '#2196F3'; // WebSocket blue
    }
    return '#F44336';
  };

  const getConnectionTypeText = () => {
    const status = isConnected ? 'Connected' : 'Disconnected';
    return `WEBSOCKET (${status})`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/robot-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Image 
            source={require('../assets/menu.png')}
            style={styles.menuIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* MQTT Connection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MQTT Connection</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Connection Type</Text>
              <Text style={[styles.settingValue, { color: getConnectionTypeColor() }]}>
                {getConnectionTypeText()}
              </Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Connection Details</Text>
              <Text style={styles.settingValue}>
                {connectionConfig?.host || 'Unknown'}:{connectionConfig?.port || 'Unknown'} ({connectionConfig?.protocol || 'Unknown'})
              </Text>
            </View>
          </View>

          <View style={styles.connectionInfo}>
            <Text style={styles.connectionInfoText}>
              <Text style={styles.bold}>WebSocket:</Text> MQTT over WebSocket protocol (Port 8000)
            </Text>
            <Text style={styles.connectionInfoText}>
              Compatible with React Native and works through firewalls
            </Text>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive cooking alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: '#178ea3' }}
              thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Use dark theme</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#767577', true: '#178ea3' }}
              thumbColor={darkModeEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto Connect</Text>
              <Text style={styles.settingDescription}>Connect to MQTT automatically</Text>
            </View>
            <Switch
              value={autoConnect}
              onValueChange={setAutoConnect}
              trackColor={{ false: '#767577', true: '#178ea3' }}
              thumbColor={autoConnect ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
          <Text style={styles.footerText}>Term of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Text style={styles.footerText}>Privacy policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ContactUs')}>
          <Text style={styles.footerText}>Contact Us</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#178ea3',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#178ea3',
    marginTop: 2,
  },

  connectionInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  connectionInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  bold: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#096171',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default Settings;