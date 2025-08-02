#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- WiFi Credentials ----------
const char* ssid = "YOUR_WIFI_SSID"; // Replace with your Wi-Fi SSID
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your Wi-Fi password

// ---------- MQTT Configuration ----------
const char* mqtt_server = "broker.hivemq.com"; // HiveMQ public broker
const int mqtt_port = 1883; // TCP port for ESP32
const char* mqtt_user = ""; // Optional, replace if needed
const char* mqtt_pass = ""; // Optional, replace if needed

// ---------- MQTT Topics (matching React Native app) ----------
const char* TOPIC_START = "ricebot/start_cooking";
const char* TOPIC_PROGRESS = "ricebot/cooking_progress";
const char* TOPIC_ALERTS = "ricebot/alerts";
const char* TOPIC_STATUS = "ricebot/device_status";

// ---------- Pin Definitions ----------
#define STEPPER_DIR_PIN   2   // TMC2209 DIR
#define STEPPER_STEP_PIN  3   // TMC2209 STEP
#define IR_SENSOR_PIN     4   // IR sensor for rice level
#define VALVE1_PIN        5   // Relay 1: Water inlet (washing & soaking)
#define VALVE2_PIN        6   // Relay 2: Final drain (after cooking)
#define DRAIN_VALVE       7   // Relay 3: Drain dirty water (after washing)
#define MOTOR_WASH        8   // Relay 4: Water motor for washing
#define COOK_VALVE        9   // Relay 5: Transfer valve to cooking chamber
#define HEATER_RELAY      10  // Relay 6: Heater
#define ONE_WIRE_BUS      11  // DS18B20 temperature sensor
#define FLOW_SENSOR_PIN   12  // Water flow sensor
#define OLED_SDA          17  // OLED I2C SDA
#define OLED_SCL          18  // OLED I2C SCL
#define BUTTON_UP         19  // Increase quantity button
#define BUTTON_DOWN       20  // Decrease quantity button
#define BUTTON_ENTER      21  // Enter/Confirm button

// ---------- OLED Configuration ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1 // No reset pin
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------- Time Constants ----------
#define STEPS_PER_TURN    200  // Steps per turn for NEMA17 (full-step)
#define TURNS_PER_CUP     5    // 5 turns per cup
#define WATER_FILL_LITERS 2.0  // 2 liters for washing/soaking
#define FLOW_PULSES_PER_LITER 500 // Calibrate based on flow sensor
#define WASH_CYCLE_MS     5000 // 5s ON for washing
#define WASH_PAUSE_MS     2000 // 2s OFF for washing
#define WASH_CYCLES       24   // (5s ON + 2s OFF) × 24 ≈ 2 minutes
#define DRAIN_TIME_MS     120000 // 2 minutes
#define SOAK_TIME_MS      1200000 // 20 minutes
#define TRANSFER_TIME_MS  300000 // 5 minutes
#define COOK_TIME_MS      600000 // 10 minutes
#define FINAL_DRAIN_MS    480000 // 8 minutes
#define WATER_FILL_TIMEOUT_MS 10000 // 10s max for filling
#define WIFI_RETRY_MAX    5   // Max Wi-Fi retries
#define MQTT_RETRY_MAX    5   // Max MQTT retries
#define SENSOR_RETRY_MAX  3   // Max sensor read retries
#define BUTTON_DEBOUNCE_MS 50 // Debounce time for buttons
#define DEVICE_DISCONNECTED_C -127.0 // DS18B20 disconnected
#define INVALID_TEMP      85.0 // DS18B20 invalid reset value
#define STATUS_UPDATE_MS  10000 // Update every 10s during cooking

// ---------- Global Variables ----------
WiFiClient espClient; // Use regular WiFiClient for TCP MQTT
PubSubClient mqtt(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
bool cooking = false;
float riceQuantity = 1.0; // Default: 1 cup
static volatile int flowPulses = 0; // Flow sensor pulse count
static const char* TAG = "SmartRiceCooker";
int cookingProgress = 0; // Track cooking progress percentage
unsigned long cookingStartTime = 0; // Track cooking start time

// ---------- Flow Sensor Interrupt ----------
void IRAM_ATTR flowSensorISR() {
  flowPulses++;
}

// ---------- Reset Hardware to Safe State ----------
void resetHardware() {
  digitalWrite(STEPPER_DIR_PIN, LOW);
  digitalWrite(STEPPER_STEP_PIN, LOW);
  digitalWrite(VALVE1_PIN, LOW);
  digitalWrite(VALVE2_PIN, LOW);
  digitalWrite(DRAIN_VALVE, LOW);
  digitalWrite(MOTOR_WASH, LOW);
  digitalWrite(COOK_VALVE, LOW);
  digitalWrite(HEATER_RELAY, LOW);
  Serial.println("Hardware reset to safe state");
  updateDisplay("Hardware Reset", -1, -1, -1);
  publishStatus("Hardware reset to safe state");
}

// ---------- Update OLED Display ----------
void updateDisplay(String status, float quantity = -1, int percentage = -1, int remainingTime = -1) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Smart Rice Cooker");
  display.println(status);
  if (quantity >= 0) {
    display.print("Qty: ");
    display.print(quantity, 1);
    display.println(" cups");
  }
  if (percentage >= 0) {
    display.print("Progress: ");
    display.print(percentage);
    display.println("%");
  }
  if (remainingTime >= 0) {
    display.print("Time: ");
    display.print(remainingTime / 60);
    display.println(" min");
  }
  display.display();
}

// ---------- MQTT Publishing Functions ----------
void publishProgress(int progress, String status) {
  DynamicJsonDocument doc(256);
  doc["progress"] = progress;
  doc["status"] = status;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.connected()) {
    mqtt.publish(TOPIC_PROGRESS, payload.c_str());
    Serial.print("Published progress: ");
    Serial.println(payload);
  } else {
    Serial.print("Failed to publish progress: ");
    Serial.println(payload);
  }
}

void publishAlert(String type, String message) {
  DynamicJsonDocument doc(256);
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.connected()) {
    mqtt.publish(TOPIC_ALERTS, payload.c_str());
    Serial.print("Published alert: ");
    Serial.println(payload);
  } else {
    Serial.print("Failed to publish alert: ");
    Serial.println(payload);
  }
}

void publishStatus(String msg, float temp = -1, int percentage = -1, int remainingTime = -1) {
  DynamicJsonDocument doc(256);
  doc["message"] = msg;
  doc["timestamp"] = millis();
  doc["isCooking"] = cooking;
  doc["currentProgress"] = cookingProgress;
  if (temp >= 0) doc["temperature"] = temp;
  if (percentage >= 0) doc["percentage"] = percentage;
  if (remainingTime >= 0) doc["remainingTime"] = remainingTime;

  String payload;
  serializeJson(doc, payload);
  if (mqtt.connected()) {
    mqtt.publish(TOPIC_STATUS, payload.c_str());
    Serial.print("Published device status: ");
    Serial.println(payload);
  } else {
    Serial.print("Failed to publish device status: ");
    Serial.println(payload);
  }
}

// ---------- WiFi Connection ----------
bool connectWiFi() {
  Serial.print("Connecting to WiFi");
  updateDisplay("Connecting WiFi...");
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_RETRY_MAX) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection failed");
    publishStatus("Error: WiFi connection failed");
    updateDisplay("WiFi Failed");
    return false;
  }
  Serial.println("\nConnected to WiFi");
  updateDisplay("WiFi Connected");
  return true;
}

// ---------- MQTT Connection ----------
void setupMQTT() {
  Serial.print("Setting MQTT server to: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);
  Serial.println("MQTT callback set.");
}

void reconnectMQTT() {
  Serial.println("Attempting MQTT connection...");
  while (!mqtt.connected()) {
    String clientId = "ESP32RiceCooker-";
    clientId += String(random(0xffff), HEX);
    Serial.print("Attempting to connect with Client ID: ");
    Serial.println(clientId);

    if (mqtt.connect(clientId.c_str())) {
      Serial.println("MQTT connected!");
      mqtt.subscribe(TOPIC_START);
      Serial.print("Subscribed to topic: ");
      Serial.println(TOPIC_START);
      publishAlert("info", "ESP32 connected to MQTT broker.");
      updateDisplay("MQTT Connected");
    } else {
      Serial.print("MQTT connection failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ---------- Check Rice Level ----------
bool checkRiceLevel() {
  for (int i = 0; i < SENSOR_RETRY_MAX; i++) {
    if (digitalRead(IR_SENSOR_PIN) == HIGH) { // HIGH = sufficient rice
      return true;
    }
    delay(100);
  }
  publishStatus("Error: Rice level low");
  updateDisplay("Rice Level Low");
  return false;
}

// ---------- Check Water Flow ----------
bool checkWaterFlow(float targetLiters) {
  flowPulses = 0;
  unsigned long startTime = millis();
  while (millis() - startTime < WATER_FILL_TIMEOUT_MS) {
    if (digitalRead(FLOW_SENSOR_PIN) == HIGH) { // Flow detected
      if (flowPulses >= targetLiters * FLOW_PULSES_PER_LITER) {
        return true;
      }
    }
    delay(10);
  }
  publishStatus("Error: Water flow error");
  updateDisplay("Water Flow Error");
  return false;
}

// ---------- Dispense Rice Quantity ----------
bool dispenseRice(float quantity) {
  if (quantity != 1.0 && quantity != 1.5 && quantity != 2.0) {
    publishStatus("Error: Invalid rice quantity");
    updateDisplay("Invalid Quantity");
    return false;
  }
  int steps = (int)(quantity * TURNS_PER_CUP * STEPS_PER_TURN); // 5 turns = 1000 steps per cup
  digitalWrite(STEPPER_DIR_PIN, LOW); // Adjust direction as needed
  for (int i = 0; i < steps; i++) {
    digitalWrite(STEPPER_STEP_PIN, HIGH);
    delayMicroseconds(800);
    digitalWrite(STEPPER_STEP_PIN, LOW);
    delayMicroseconds(800);
  }
  publishStatus("Rice dispensed");
  updateDisplay("Rice Dispensed", quantity);
  return true;
}

// ---------- Cooking Process ----------
bool startCookingProcess(float quantity) {
  publishStatus("Starting rice cooker...");
  publishProgress(0, "starting");
  updateDisplay("Starting...", quantity);

  // 1. Check Rice Level
  if (!checkRiceLevel()) {
    resetHardware();
    publishAlert("error", "Rice level too low");
    return false;
  }
  publishProgress(5, "checking_rice");

  // 2. Dispense Rice
  if (!dispenseRice(quantity)) {
    resetHardware();
    publishAlert("error", "Failed to dispense rice");
    return false;
  }
  publishProgress(10, "rice_dispensed");

  // 3. Washing
  publishProgress(15, "washing");
  publishStatus("Starting washing process...");
  updateDisplay("Washing: Water Filling", quantity);
  
  digitalWrite(VALVE1_PIN, HIGH);
  if (!checkWaterFlow(WATER_FILL_LITERS)) {
    digitalWrite(VALVE1_PIN, LOW);
    resetHardware();
    publishAlert("error", "Water flow error during washing");
    return false;
  }
  digitalWrite(VALVE1_PIN, LOW);
  publishStatus("Water filled for washing");
  updateDisplay("Washing: Water Filled", quantity);

  for (int i = 0; i < WASH_CYCLES; i++) {
    digitalWrite(MOTOR_WASH, HIGH);
    unsigned long startTime = millis();
    while (millis() - startTime < WASH_CYCLE_MS) {
      delay(10);
    }
    digitalWrite(MOTOR_WASH, LOW);
    startTime = millis();
    while (millis() - startTime < WASH_PAUSE_MS) {
      delay(10);
    }
    // Update progress during washing
    int washProgress = 15 + (i * 10 / WASH_CYCLES);
    publishProgress(washProgress, "washing");
  }

  digitalWrite(DRAIN_VALVE, HIGH);
  unsigned long startTime = millis();
  while (millis() - startTime < DRAIN_TIME_MS) {
    delay(10);
  }
  digitalWrite(DRAIN_VALVE, LOW);
  publishProgress(25, "washing_complete");
  publishStatus("Washing complete");
  updateDisplay("Washing Complete", quantity);

  // 4. Soaking
  publishProgress(30, "soaking");
  publishStatus("Starting soaking process...");
  updateDisplay("Soaking: Water Filling", quantity);
  
  digitalWrite(VALVE1_PIN, HIGH);
  if (!checkWaterFlow(WATER_FILL_LITERS)) {
    digitalWrite(VALVE1_PIN, LOW);
    resetHardware();
    publishAlert("error", "Water flow error during soaking");
    return false;
  }
  digitalWrite(VALVE1_PIN, LOW);
  publishStatus("Soaking rice...");
  updateDisplay("Soaking...", quantity);
  
  startTime = millis();
  unsigned long lastSoakUpdate = startTime;
  while (millis() - startTime < SOAK_TIME_MS) {
    delay(1000);
    // Update progress every 30 seconds during soaking
    if (millis() - lastSoakUpdate >= 30000) {
      int soakProgress = 30 + (int)((millis() - startTime) * 20 / SOAK_TIME_MS);
      publishProgress(soakProgress, "soaking");
      lastSoakUpdate = millis();
    }
  }
  publishProgress(50, "soaking_complete");

  // 5. Transfer to Cooking Chamber
  publishProgress(55, "transferring");
  publishStatus("Transferring rice to cooking chamber...");
  updateDisplay("Transferring...", quantity);
  
  digitalWrite(COOK_VALVE, HIGH);
  digitalWrite(VALVE1_PIN, HIGH);
  startTime = millis();
  while (millis() - startTime < TRANSFER_TIME_MS) {
    delay(10);
  }
  digitalWrite(COOK_VALVE, LOW);
  digitalWrite(VALVE1_PIN, LOW);
  publishProgress(60, "transfer_complete");
  publishStatus("Rice transferred to cooking chamber");
  updateDisplay("Rice Transferred", quantity);

  // 6. Steam Cooking
  publishProgress(65, "cooking");
  publishStatus("Starting steam cooking...");
  updateDisplay("Cooking...", quantity);
  
  digitalWrite(HEATER_RELAY, HIGH);
  startTime = millis();
  unsigned long lastUpdate = startTime;
  while (millis() - startTime < COOK_TIME_MS) {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    if (tempC == DEVICE_DISCONNECTED_C || tempC == INVALID_TEMP) {
      publishAlert("error", "Temperature sensor failure");
      updateDisplay("Temp Sensor Error");
      digitalWrite(HEATER_RELAY, LOW);
      resetHardware();
      return false;
    }
    if (tempC >= 100.0) {
      break;
    }
    if (millis() - lastUpdate >= STATUS_UPDATE_MS) {
      int percentage = 65 + (int)((millis() - startTime) * 30 / COOK_TIME_MS);
      int remainingTime = (COOK_TIME_MS - (millis() - startTime)) / 1000;
      cookingProgress = percentage;
      publishProgress(percentage, "cooking");
      publishStatus("Cooking in progress", tempC, percentage, remainingTime);
      updateDisplay("Cooking: " + String(tempC, 1) + "C", quantity, percentage, remainingTime);
      lastUpdate = millis();
    }
    delay(1000);
  }
  digitalWrite(HEATER_RELAY, LOW);
  if (millis() - startTime >= COOK_TIME_MS) {
    publishAlert("error", "Cooking timeout");
    updateDisplay("Cooking Timeout");
    resetHardware();
    return false;
  }
  publishProgress(95, "cooking_complete");
  publishStatus("Cooking complete");
  updateDisplay("Cooking Complete", quantity);

  // 7. Drain Boiled Water
  publishProgress(98, "draining");
  publishStatus("Draining boiled water...");
  updateDisplay("Draining...", quantity);
  
  digitalWrite(VALVE2_PIN, HIGH);
  startTime = millis();
  while (millis() - startTime < FINAL_DRAIN_MS) {
    delay(10);
  }
  digitalWrite(VALVE2_PIN, LOW);
  publishProgress(100, "done");
  publishStatus("Rice cooking completed successfully!");
  updateDisplay("Cooking Done!", quantity);
  
  // Reset cooking state
  cooking = false;
  cookingProgress = 0;
  publishAlert("success", "Rice is ready! Cooking process completed.");

  return true;
}

// ---------- Handle Button Inputs ----------
void handleButtons() {
  static unsigned long lastUp = 0, lastDown = 0, lastEnter = 0;
  if (digitalRead(BUTTON_UP) == LOW && millis() - lastUp > BUTTON_DEBOUNCE_MS) {
    if (!cooking) {
      if (riceQuantity == 1.0) riceQuantity = 1.5;
      else if (riceQuantity == 1.5) riceQuantity = 2.0;
      updateDisplay("Select Quantity", riceQuantity);
    }
    lastUp = millis();
  }
  if (digitalRead(BUTTON_DOWN) == LOW && millis() - lastDown > BUTTON_DEBOUNCE_MS) {
    if (!cooking) {
      if (riceQuantity == 2.0) riceQuantity = 1.5;
      else if (riceQuantity == 1.5) riceQuantity = 1.0;
      updateDisplay("Select Quantity", riceQuantity);
    }
    lastDown = millis();
  }
  if (digitalRead(BUTTON_ENTER) == LOW && millis() - lastEnter > BUTTON_DEBOUNCE_MS) {
    if (!cooking) {
      cooking = true;
      riceQuantity = riceQuantity; // Update display quantity
      cookingProgress = 0;
      cookingStartTime = millis();
      updateDisplay("Starting...", riceQuantity);
      publishProgress(0, "starting");
      publishStatus("Cooking started via button: Initializing...");
      
      if (!startCookingProcess(riceQuantity)) {
        cooking = false;
        publishAlert("error", "Cooking process failed to start via button.");
      }
    } else {
      publishAlert("warning", "Cooking already in progress");
      updateDisplay("Cooking in Progress");
    }
    lastEnter = millis();
  }
}

// ---------- Handle MQTT Commands ----------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.println(topic);
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Payload: ");
  Serial.println(message);

  if (String(topic) == TOPIC_START) {
    handleStartCooking(message);
  }
}

void handleStartCooking(String message) {
  Serial.println("Handling start cooking command...");
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    publishAlert("error", "Failed to parse start cooking command JSON.");
    return;
  }

  if (doc["action"] == "start_cooking") {
    if (!cooking) {
      float quantity = doc["quantity"].as<float>();
      if (quantity == 1.0 || quantity == 1.5 || quantity == 2.0) {
        cooking = true;
        riceQuantity = quantity;
        cookingProgress = 0;
        cookingStartTime = millis();
        Serial.println("Cooking process initiated.");
        publishProgress(0, "starting");
        publishStatus("Cooking started: Initializing...");
        updateDisplay("Starting...", quantity);
        
        // Start the actual cooking process
        if (!startCookingProcess(quantity)) {
          cooking = false;
          publishAlert("error", "Cooking process failed to start.");
        }
      } else {
        publishAlert("error", "Invalid quantity specified.");
      }
    } else {
      Serial.println("Cooking already in progress, ignoring new command.");
      publishAlert("warning", "Cooking already in progress.");
    }
  } else {
    Serial.println("Unknown action in start cooking command.");
    publishAlert("error", "Invalid action in start cooking command.");
  }
}

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);

  // Initialize pins
  pinMode(STEPPER_DIR_PIN, OUTPUT);
  pinMode(STEPPER_STEP_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(VALVE1_PIN, OUTPUT);
  pinMode(VALVE2_PIN, OUTPUT);
  pinMode(DRAIN_VALVE, OUTPUT);
  pinMode(MOTOR_WASH, OUTPUT);
  pinMode(COOK_VALVE, OUTPUT);
  pinMode(HEATER_RELAY, OUTPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT);
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
  pinMode(BUTTON_ENTER, INPUT_PULLUP);

  // Initialize flow sensor interrupt
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowSensorISR, RISING);

  // Ensure safe state
  resetHardware();

  // Initialize OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED initialization failed");
    for (;;); // Halt if OLED fails
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  updateDisplay("Booting...");

  // Initialize sensors and connectivity
  sensors.begin();
  if (!connectWiFi()) {
    Serial.println("Setup failed: WiFi connection");
    updateDisplay("Setup Failed: WiFi");
    return;
  }
  setupMQTT();
  reconnectMQTT();
  updateDisplay("Ready - Select Quantity", riceQuantity);
}

// ---------- Loop ----------
void loop() {
  static unsigned long lastStatusUpdate = 0;
  
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();
  handleButtons();
  
  // Send periodic status updates every 30 seconds
  if (millis() - lastStatusUpdate >= 30000) {
    if (!cooking) {
      publishStatus("Device idle and ready");
    } else {
      // Status is already being sent during cooking process
    }
    lastStatusUpdate = millis();
  }
}