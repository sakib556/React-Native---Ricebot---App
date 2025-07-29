/**
 * @format
 */
// failed to connect: TypeError: _mqtt.default.connect is not a function (it is undefined)
// import {AppRegistry} from 'react-native';
// import App from './App';
// import {name as appName} from './app.json';

// AppRegistry.registerComponent(appName, () => App);

/**
 * @format
 */
 import { AppRegistry } from 'react-native';
 import App from './App';
 import { name as appName } from './app.json';
 
 import PushNotification from "react-native-push-notification";
 
 // ✅ Create the notification channel here
 PushNotification.createChannel(
   {
     channelId: "cooking-channel", // (required)
     channelName: "Cooking Notifications", // (required)
     channelDescription: "Notifications for cooking completion",
     soundName: "default",
     importance: 4,
     vibrate: true,
   },
   (created) => console.log(`createChannel returned '${created}'`) // (optional) callback
 );
 
 AppRegistry.registerComponent(appName, () => App);
 