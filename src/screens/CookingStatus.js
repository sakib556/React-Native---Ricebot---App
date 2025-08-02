
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import moment from 'moment';
import useMqtt from '../hooks/useMqtt';

const CookingStatus = ({ route, navigation }) => {
  const { predictionInfo, selectedQuantity, mqttTopics } = route.params || {};
  const [countdown, setCountdown] = useState('');
  const [nextSchedule, setNextSchedule] = useState('');
  const [cookingProgress, setCookingProgress] = useState(0);
  const [cookingStatus, setCookingStatus] = useState('idle');
  const [alerts, setAlerts] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});

  const { 
    isConnected, 
    connect, 
    subscribeToCookingProgress,
    subscribeToAlerts,
    subscribeToDeviceStatus,
    MQTT_TOPICS 
  } = useMqtt();

  useEffect(() => {
    // Subscribe to cooking progress updates
    const progressCallback = (data) => {
      console.log('📊 Cooking progress received:', data);
      if (data.progress !== undefined) {
        setCookingProgress(data.progress);
      }
      if (data.status) {
        setCookingStatus(data.status);
      }
    };

    // Subscribe to alerts
    const alertCallback = (data) => {
      console.log('🚨 Alert received:', data);
      setAlerts(prev => [...prev, data]);
      
      // Show alert to user
      if (data.message) {
        Alert.alert('Cooking Alert', data.message);
      }
    };

    // Subscribe to device status
    const deviceStatusCallback = (data) => {
      console.log('📱 Device status received:', data);
      setDeviceStatus(data);
    };

    // Subscribe to topics when connected
    if (isConnected) {
      console.log('📡 CookingStatus: Subscribing to MQTT topics...');
      subscribeToCookingProgress(progressCallback);
      subscribeToAlerts(alertCallback);
      subscribeToDeviceStatus(deviceStatusCallback);
    }

    return () => {
      // Cleanup subscriptions if needed
    };
  }, [isConnected]);

  useEffect(() => {
    let interval;

    if (predictionInfo && moment(predictionInfo, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      const target = moment(predictionInfo, "YYYY-MM-DD HH:mm:ss");
      // Set next schedule formatted string on mount
      setNextSchedule(`Next cooking scheduled at: ${target.format('MMM D, h:mm A')}`);

      interval = setInterval(() => {
        const now = moment();
        const duration = moment.duration(target.diff(now));

        if (duration.asSeconds() <= 0) {
          setCountdown("Cooking time reached!");
          clearInterval(interval);
        } else {
          const minutes = Math.floor(duration.asMinutes());
          const seconds = Math.floor(duration.seconds());
          setCountdown(`${minutes}m ${seconds}s remaining`);
        }
      }, 1000);
    } else {
      setCountdown("No future prediction available");
      setNextSchedule('');
    }

    return () => clearInterval(interval);
  }, [predictionInfo]);

  const getStatusText = () => {
    switch(cookingStatus) {
      case 'washing': return 'Washing Rice';
      case 'soaking': return 'Soaking Rice';
      case 'cooking': return 'Cooking Rice';
      case 'done': return 'Cooking Complete!';
      case 'error': return 'Error Occurred';
      default: return 'Preparing...';
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

  const handleCancelCooking = () => {
    Alert.alert(
      'Cancel Cooking',
      'Are you sure you want to cancel the cooking process?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            // TODO: Send MQTT cancel message
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/robot-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Cooking Status</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Image 
            source={require('../assets/menu.png')}
            style={styles.menuIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.statusTitle}>Current Status:</Text>

        {/* MQTT Connection Status */}
        <View style={styles.mqttStatusContainer}>
          <Text style={styles.mqttStatusText}>
            MQTT: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>

        {/* Cooking Status */}
        <View style={styles.cookingStatusContainer}>
          <Text style={[styles.cookingStatusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={[styles.progressFill, { height: `${cookingProgress}%` }]} />
            <View style={styles.progressInner}>
              <Text style={styles.progressText}>{cookingProgress}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.stagesContainer}>
          <View style={[styles.stageItem, cookingStatus === 'washing' && styles.activeStage]}>
            <Image source={require('../assets/check.png')} style={styles.stageIcon} />
            <Text style={styles.stageText}>Wash</Text>
          </View>
          <View style={[styles.stageItem, cookingStatus === 'soaking' && styles.activeStage]}>
            <Image source={require('../assets/soaking.png')} style={styles.stageIcon} />
            <Text style={styles.stageText}>Soak</Text>
          </View>
          <View style={[styles.stageItem, cookingStatus === 'cooking' && styles.activeStage]}>
            <Image source={require('../assets/cooking.png')} style={styles.stageIcon} />
            <Text style={styles.stageText}>Cooking</Text>
          </View>
        </View>

        {/* Quantity Info */}
        {selectedQuantity && (
          <View style={styles.quantityInfoContainer}>
            <Text style={styles.quantityInfoText}>
              Cooking: {selectedQuantity} of rice
            </Text>
          </View>
        )}

        {/* Next Schedule */}
        {nextSchedule ? (
          <Text style={[styles.estimatedTime, { fontSize: 16, color: '#178ea3' }]}>
            {nextSchedule}
          </Text>
        ) : null}

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.alertsTitle}>Recent Alerts:</Text>
            {alerts.slice(-3).map((alert, index) => (
              <Text key={index} style={styles.alertText}>
                • {alert.message || JSON.stringify(alert)}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancelCooking}
        >
          <Text style={styles.cancelButtonText}>Cancel Cooking</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#178ea3',
    marginBottom: 20,
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
  cookingStatusContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#096171',
  },
  cookingStatusText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#178ea3',
  },
  progressInner: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    bottom: 15,
    borderRadius: 85,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#178ea3',
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
  },
  stageItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  activeStage: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#178ea3',
  },
  stageIcon: {
    width: 28,
    height: 28,
    tintColor: '#096171',
    marginBottom: 5,
  },
  stageText: {
    color: '#178ea3',
    fontSize: 16,
  },
  quantityInfoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 0.5,
    borderColor: '#096171',
  },
  quantityInfoText: {
    textAlign: 'center',
    color: '#178ea3',
    fontSize: 16,
    fontWeight: '500',
  },
  estimatedTime: {
    fontSize: 18,
    color: '#666',
    marginVertical: 15,
  },
  alertsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 0.5,
    borderColor: '#FF9800',
    width: '100%',
  },
  alertsTitle: {
    color: '#E65100',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  alertText: {
    color: '#E65100',
    fontSize: 14,
    marginBottom: 2,
  },
  cancelButton: {
    backgroundColor: '#178ea3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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

export default CookingStatus;
