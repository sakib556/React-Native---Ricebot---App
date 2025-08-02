import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import useMqtt from '../hooks/useMqtt';

const Home = ({ navigation, route }) => {
  // Get userName from route params, fallback to 'User'
  const userName = route.params?.userName || 'User';
  
  // MQTT state
  const [cookingProgress, setCookingProgress] = useState(0);
  const [cookingStatus, setCookingStatus] = useState('idle');
  const [isCooking, setIsCooking] = useState(false);
  
  const { 
    isConnected, 
    connect, 
    subscribeToCookingProgress,
    subscribeToAlerts,
    MQTT_TOPICS 
  } = useMqtt();

  useEffect(() => {
    // Subscribe to cooking progress updates
    const progressCallback = (data) => {
      console.log('📊 Home: Cooking progress received:', data);
      if (data.progress !== undefined) {
        setCookingProgress(data.progress);
        setIsCooking(data.progress > 0 && data.progress < 100);
      }
      if (data.status) {
        setCookingStatus(data.status);
        setIsCooking(data.status !== 'idle' && data.status !== 'done');
      }
    };

    // Subscribe to alerts
    const alertCallback = (data) => {
      console.log('🚨 Home: Alert received:', data);
    };

    // Subscribe to topics when connected
    if (isConnected) {
      console.log('📡 Home: Subscribing to MQTT topics...');
      subscribeToCookingProgress(progressCallback);
      subscribeToAlerts(alertCallback);
    }

    return () => {
      // Cleanup subscriptions if needed
    };
  }, [isConnected]);

  const getStatusText = () => {
    switch(cookingStatus) {
      case 'washing': return 'Washing Rice';
      case 'soaking': return 'Soaking Rice';
      case 'cooking': return 'Cooking Rice';
      case 'done': return 'Cooking Complete!';
      case 'error': return 'Error Occurred';
      default: return 'Ready to Cook';
    }
  };

  const getStatusColor = () => {
    switch(cookingStatus) {
      case 'washing': return '#4CAF50';
      case 'soaking': return '#2196F3';
      case 'cooking': return '#FF9800';
      case 'done': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#178ea3';
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
              placeholder="Search"
              placeholderTextColor="#FFFFFF"
            />
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Image 
              source={require('../assets/menu.png')}
              style={styles.headerMenuIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Image
              source={require('../assets/rice-cooker.png')}
              style={styles.riceCooker}
              resizeMode="contain"
            />

            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome {userName}!</Text>
            </View>

            {/* MQTT Connection Status */}
            <View style={styles.mqttStatusContainer}>
              <Text style={styles.mqttStatusText}>
                MQTT: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>Your Current Rice cooking State is:</Text>
              <Text style={[styles.percentage, { color: getStatusColor() }]}>
                {cookingProgress}%
              </Text>
              <Text style={[styles.statusDetailText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {/* Quick Status Card */}
            {isCooking && (
              <TouchableOpacity 
                style={styles.quickStatusCard}
                onPress={() => navigation.navigate('CookingStatus')}
              >
                <View style={styles.quickStatusContent}>
                  <Text style={styles.quickStatusTitle}>Active Cooking Session</Text>
                  <Text style={styles.quickStatusProgress}>{cookingProgress}% Complete</Text>
                  <Text style={styles.quickStatusAction}>Tap to view details →</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.menuGrid}>
              <View style={styles.menuRow}>
                <TouchableOpacity 
                  style={styles.menuItemContainer}
                  onPress={() => navigation.navigate('StartCooking')}
                >
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/cooking.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>Cooking</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItemContainer}
                  onPress={() => navigation.navigate('CookingStatus')}
                >
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/eye.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>Status</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItemContainer}
                  onPress={() => navigation.navigate('CookingHistory')}
                >
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/history.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>History</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuRow}>
                <TouchableOpacity 
                  style={styles.menuItemContainer}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/settings.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>Settings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItemContainer}
                  onPress={() => navigation.navigate('Profile', { token: route.params?.token})}
                >
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/profile.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItemContainer}>
                  <View style={styles.menuItem}>
                    <Image source={require('../assets/chat.png')} style={styles.menuIcon} />
                  </View>
                  <Text style={styles.menuLabel}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, isCooking && styles.disabledButton]}
                onPress={() => navigation.navigate('StartCooking')}
                disabled={isCooking}
              >
                <Text style={styles.buttonText}>
                  {isCooking ? 'Cooking in Progress' : 'Start Cooking'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.historyButton]}
                onPress={() => navigation.navigate('CookingHistory')}
              >
                <Text style={[styles.buttonText, styles.historyButtonText]}>Cooking History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#178ea3',
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
  logo: {
    width: 70,
    height: 70,
  },
  menuButton: {
    padding: 10,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  riceCooker: {
    width: 300,
    height: 320,
    marginBottom: 30,
  },
  mqttStatusContainer: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: '#096171',
  },
  mqttStatusText: {
    textAlign: 'center',
    color: '#178ea3',
    fontSize: 12,
    fontWeight: '500',
  },
  menuItem: {
    backgroundColor: '#178ea3',
    padding: 15,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.9,
    borderColor: '#096171',
    overflow: 'hidden',
  },
  menuIcon: {
    width: 30,
    height: 30,
    tintColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    transform: [{ scale: 0.9 }],
  },
  welcomeContainer: {
    backgroundColor: '#178ea3',
    padding: 15,
    borderRadius: 25,
    width: '100%',
    marginBottom: 20,
    borderWidth: 0.9,
    borderColor: '#096171',
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  statusText: {
    color: '#000000',
    fontSize: 16,
    textAlign: 'center',
  },
  percentage: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusDetailText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 5,
  },
  quickStatusCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#178ea3',
    width: '100%',
  },
  quickStatusContent: {
    alignItems: 'center',
  },
  quickStatusTitle: {
    color: '#178ea3',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  quickStatusProgress: {
    color: '#178ea3',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  quickStatusAction: {
    color: '#178ea3',
    fontSize: 14,
    fontStyle: 'italic',
  },
  menuGrid: {
    width: '100%',
    marginBottom: 30,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  headerMenuIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  gridMenuIcon: {
    width: 30,
    height: 30,
    tintColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    transform: [{ scale: 0.9 }],
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    backgroundColor: '#178ea3',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  historyButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#178ea3',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyButtonText: {
    color: '#178ea3',
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
  menuItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '33%',
  },
  menuLabel: {
    color: 'black',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    width: '100%',
    paddingHorizontal: 10,
  },
});

export default Home;