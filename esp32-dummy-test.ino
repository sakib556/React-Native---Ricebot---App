#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Settings
const char* ssid = "Expensive Bachelor";
const char* password = "Mohona@2025";

// MQTT Settings (TCP - recommended for ESP32)
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// MQTT Topics
const char* TOPIC_START = "ricebot/start_cooking";
const char* TOPIC_PROGRESS = "ricebot/cooking_progress";
const char* TOPIC_ALERTS = "ricebot/alerts";
const char* TOPIC_STATUS = "ricebot/device_status";

WiFiClient espClient;
PubSubClient mqtt(espClient);

bool isCooking = false;
int progress = 0;
unsigned long cookingStartTime = 0; // To track the start of the cooking process

void setup() {
  Serial.begin(115200);
  Serial.println("Serial monitor initialized."); // Debug print
  setupWiFi();
  setupMQTT();
  // Initial status publish on boot
  publishStatus("Device booted and ready."); // Debug print
}

void loop() {
  if (!mqtt.connected()) {
    Serial.println("MQTT not connected, attempting to reconnect..."); // Debug print
    reconnectMQTT();
  }
  mqtt.loop();

  if (isCooking) {
    handleCooking();
  }

  delay(100);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi: "); // Debug print
  Serial.println(ssid); // Debug print
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) { // Added retry limit
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully!"); // Debug print
    Serial.print("IP Address: "); // Debug print
    Serial.println(WiFi.localIP()); // Debug print
  } else {
    Serial.println("\nFailed to connect to WiFi after multiple retries."); // Debug print
    // Consider adding a reset or more robust error handling here
  }
}

void setupMQTT() {
  Serial.print("Setting MQTT server to: "); // Debug print
  Serial.print(mqtt_server); // Debug print
  Serial.print(":"); // Debug print
  Serial.println(mqtt_port); // Debug print
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);
  Serial.println("MQTT callback set."); // Debug print
}

void reconnectMQTT() {
  Serial.println("Attempting MQTT connection..."); // Debug print
  while (!mqtt.connected()) {
    String clientId = "ESP32RiceCooker-";
    clientId += String(random(0xffff), HEX);
    Serial.print("Attempting to connect with Client ID: "); // Debug print
    Serial.println(clientId); // Debug print

    if (mqtt.connect(clientId.c_str())) {
      Serial.println("MQTT connected!"); // Debug print
      mqtt.subscribe(TOPIC_START);
      Serial.print("Subscribed to topic: "); // Debug print
      Serial.println(TOPIC_START); // Debug print
      publishAlert("info", "ESP32 connected to MQTT broker."); // Debug print
    } else {
      Serial.print("MQTT connection failed, rc="); // Debug print
      Serial.print(mqtt.state()); // Debug print
      Serial.println(" Retrying in 5 seconds..."); // Debug print
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: "); // Debug print
  Serial.println(topic); // Debug print
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Payload: "); // Debug print
  Serial.println(message); // Debug print

  if (String(topic) == TOPIC_START) {
    handleStartCooking(message);
  }
}

void handleStartCooking(String message) {
  Serial.println("Handling start cooking command..."); // Debug print
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: "); // Debug print
    Serial.println(error.c_str()); // Debug print
    publishAlert("error", "Failed to parse start cooking command JSON.");
    return;
  }

  if (doc["action"] == "start_cooking") {
    if (!isCooking) {
      isCooking = true;
      progress = 0;
      cookingStartTime = millis(); // Record the start time
      Serial.println("Cooking process initiated."); // Debug print
      publishProgress(0, "washing");
      publishStatus("Cooking started: Washing phase."); // Debug print
    } else {
      Serial.println("Cooking already in progress, ignoring new command."); // Debug print
      publishAlert("warning", "Cooking already in progress.");
    }
  } else {
    Serial.println("Unknown action in start cooking command."); // Debug print
    publishAlert("error", "Invalid action in start cooking command.");
  }
}

void handleCooking() {
  static unsigned long lastUpdate = 0;
  // Update progress every 2 seconds for demonstration
  if (millis() - lastUpdate > 2000) {
    progress += 10;
    Serial.print("Current cooking progress: "); // Debug print
    Serial.print(progress); // Debug print
    Serial.println("%"); // Debug print

    String status;
    if (progress <= 30) {
      status = "washing";
    } else if (progress <= 60) {
      status = "soaking";
    } else if (progress < 100) {
      status = "cooking";
    } else {
      progress = 100; // Ensure progress doesn't exceed 100
      isCooking = false;
      status = "done";
      Serial.println("Cooking process completed."); // Debug print
      publishStatus("Cooking finished. Rice is ready!"); // Debug print
    }
    publishProgress(progress, status);
    lastUpdate = millis();
  }
}

void publishProgress(int prog, String status) {
  DynamicJsonDocument doc(256);
  doc["progress"] = prog;
  doc["status"] = status;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.publish(TOPIC_PROGRESS, payload.c_str())) {
    Serial.print("Published progress: "); // Debug print
    Serial.println(payload); // Debug print
  } else {
    Serial.print("Failed to publish progress: "); // Debug print
    Serial.println(payload); // Debug print
  }
}

void publishAlert(String type, String message) {
  DynamicJsonDocument doc(256);
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.publish(TOPIC_ALERTS, payload.c_str())) {
    Serial.print("Published alert: "); // Debug print
    Serial.println(payload); // Debug print
  } else {
    Serial.print("Failed to publish alert: "); // Debug print
    Serial.println(payload); // Debug print
  }
}

// Function to publish general device status
void publishStatus(String message) {
  DynamicJsonDocument doc(256);
  doc["message"] = message;
  doc["timestamp"] = millis();
  doc["isCooking"] = isCooking;
  doc["currentProgress"] = progress;

  String payload;
  serializeJson(doc, payload);
  if (mqtt.publish(TOPIC_STATUS, payload.c_str())) {
    Serial.print("Published device status: "); // Debug print
    Serial.println(payload); // Debug print
  } else {
    Serial.print("Failed to publish device status: "); // Debug print
    Serial.println(payload); // Debug print
  }
}