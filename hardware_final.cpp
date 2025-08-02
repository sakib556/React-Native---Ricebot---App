#include <Wire.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>

// === OLED Display ===
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// === I2C Pins ===
#define I2C_SDA 17
#define I2C_SCL 18

// === Button Pins ===
#define BTN_INC 19
#define BTN_DEC 20
#define BTN_ENTER 21

// === Stepper Motor ===
#define STEP_PIN 3
#define DIR_PIN 2

// === Relay Pins ===
#define RELAY_WASH 5
#define RELAY_FINAL_DRAIN 6
#define RELAY_DRAIN 7
#define RELAY_PUMP 8
#define RELAY_COOK_VALVE 9
#define RELAY_HEATER 10

// === Sensor Pins ===
#define IR_SENSOR_PIN 4
#define FLOW_SENSOR_PIN 12
#define TEMP_SENSOR_PIN 11

OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature sensors(&oneWire);

// ---------- Wifi MQTT Configuration ----------
const char *ssid = "HUAWEI Y5 2019";           // Replace with your Wi-Fi SSID
const char *password = "1234567kk";            // Replace with your Wi-Fi password
const char *mqtt_server = "broker.hivemq.com"; // HiveMQ public broker
const int mqtt_port = 1883;                    // TCP port for ESP32
const char *mqtt_user = "";                    // Optional, replace if needed
const char *mqtt_pass = "";                    // Optional, replace if needed
const char *TOPIC_START = "ricebot/start_cooking";
const char *TOPIC_PROGRESS = "ricebot/cooking_progress";
const char *TOPIC_ALERTS = "ricebot/alerts";
const char *TOPIC_STATUS = "ricebot/device_status";
WiFiClient espClient; // Use regular WiFiClient for TCP MQTT
PubSubClient mqtt(espClient);
bool mqttStartReceived = false;
bool cooking = false;

// ---------- Constants ----------
const int STEPS_PER_PORTION = 800;
const int MAX_PORTIONS = 5;
const unsigned long SOAK_DURATION = 300000;  // 5 mins
const unsigned long COOK_DURATION = 1200000; // 20 mins
const unsigned long DRAIN_DURATION = 15000;  // 15 sec
const int FLOW_THRESHOLD_PULSES = 900;       // ~2 liters

int ricePortions = 1;
bool selectionConfirmed = false;
volatile unsigned long flowPulses = 0;

void IRAM_ATTR flowISR()
{
  flowPulses++;
}

int totalSteps = 5;
int currentStep = 0;

void displayMessage(const char *msg)
{
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(msg);
  display.display();
}

void displayMessageWithProgress(const char *msg, int step, int total)
{
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(msg);

  int barWidth = map(step, 0, total, 0, SCREEN_WIDTH);
  display.drawRect(0, 24, SCREEN_WIDTH, 6, SSD1306_WHITE);
  display.fillRect(0, 24, barWidth, 6, SSD1306_WHITE);

  display.display();
  // Publish progress to MQTT
  if (mqtt.connected())
  {
    Serial.print("Publishing progress: %d/%d - ", step, total);
    Serial.println(msg);
    publishProgress(step, msg);
    Serial.println("Progress published to MQTT.");
  }
  else
  {
    Serial.println("MQTT not connected, cannot publish progress.");
  }
}

// ---------- Wifi & MQTT Connection ----------
#define WIFI_RETRY_MAX 5 // Max Wi-Fi retries
#define MQTT_RETRY_MAX 5 // Max MQTT retries
bool connectWiFi()
{
  Serial.print("Connecting to WiFi");
  // displayMessage("Connecting WiFi...");
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_RETRY_MAX)
  {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("\nWiFi connection failed");
    //   publishStatus("Error: WiFi connection failed");
    displayMessage("WiFi Failed");
    return false;
  }
  Serial.println("\nConnected to WiFi");
  //  displayMessage("WiFi Connected");
  return true;
}
// ---------- Handle MQTT Commands ----------
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  Serial.print("Message arrived on topic: ");
  Serial.println(topic);
  String message = "";
  for (int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }
  Serial.print("Payload: ");
  Serial.println(message);
  if (String(topic) == TOPIC_START)
  {
    handleStartCooking(message);
  }
}

void handleStartCooking(String message)
{
  Serial.println("Handling start cooking command...");
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);

  if (error)
  {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    publishAlert("error", "Failed to parse start cooking command JSON.");
    return;
  }

  if (doc["action"] == "start_cooking")
  {
    if (!cooking)
    {
      float quantity = doc["quantity"].as<float>();
      if (quantity == 1.0 || quantity == 1.5 || quantity == 2.0)
      {
        Serial.println("Cooking process initiated.");
        ricePortions = quantity;
        mqttStartReceived = true;
        publishAlert("error", "Cooking process failed to start.");
      }
      else
      {
        publishAlert("error", "Invalid quantity specified.");
      }
    }
    else
    {
      Serial.println("Cooking already in progress, ignoring new command.");
      publishAlert("warning", "Cooking already in progress.");
    }
  }
  else
  {
    Serial.println("Unknown action in start cooking command.");
    publishAlert("error", "Invalid action in start cooking command.");
  }
}

void setupMQTT()
{
  Serial.print("Setting MQTT server to: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);
  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);
  Serial.println("MQTT callback set.");
}
void publishAlert(String type, String message)
{
  DynamicJsonDocument doc(256);
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.connected())
  {
    mqtt.publish(TOPIC_ALERTS, payload.c_str());
    Serial.print("Published alert: ");
    Serial.println(payload);
  }
  else
  {
    Serial.print("Failed to publish alert: ");
    Serial.println(payload);
  }
}
void reconnectMQTT()
{
  Serial.println("Attempting MQTT connection...");
  while (!mqtt.connected())
  {
    String clientId = "ESP32RiceCooker-";
    clientId += String(random(0xffff), HEX);
    Serial.print("Attempting to connect with Client ID: ");
    Serial.println(clientId);

    if (mqtt.connect(clientId.c_str()))
    {
      Serial.println("MQTT connected!");
      mqtt.subscribe(TOPIC_START);
      Serial.print("Subscribed to topic: ");
      Serial.println(TOPIC_START);
      publishAlert("info", "ESP32 connected to MQTT broker.");
      displayMessage("MQTT Connected");
    }
    else
    {
      Serial.print("MQTT connection failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup()
{
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println("OLED init failed");
    while (true)
      ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  pinMode(BTN_INC, INPUT_PULLUP);
  pinMode(BTN_DEC, INPUT_PULLUP);
  pinMode(BTN_ENTER, INPUT_PULLUP);

  for (int pin = RELAY_WASH; pin <= RELAY_HEATER; pin++)
  {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  digitalWrite(DIR_PIN, HIGH);

  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT);
  sensors.begin();

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowISR, RISING);

  showSelectionScreen();
  if (!connectWiFi())
  {
    Serial.println("Setup failed: WiFi connection");
    // displayMessage("Setup Failed: WiFi");
    return;
  }
  setupMQTT();
  reconnectMQTT();
}

void loop()
{
  if (!selectionConfirmed && !mqttStartReceived)
  {
    handleButtons();
  }
  else if (!cooking)
  {
    displayMessageWithProgress("Starting...", currentStep, totalSteps);
    delay(1000); // Simulate some delay before starting
    selectionConfirmed = false;
    mqttStartReceived = true;
  }
  {
    currentStep = 0;
    runRiceCookingCycle();
    selectionConfirmed = false;
    mqttStartReceived = false;
    ricePortions = 1;
    showSelectionScreen();
  }
  static unsigned long lastReconnectAttempt = 0;

  if (!mqtt.connected())
  {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000)
    {
      lastReconnectAttempt = now;
      reconnectMQTT();
    }
  }
  else
  {
    mqtt.loop();
  }
}
// ---------- MQTT Publishing Functions ----------
void publishProgress(int progress, String status)
{
  DynamicJsonDocument doc(256);
  doc["progress"] = progress;
  doc["status"] = status;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  if (mqtt.connected())
  {
    mqtt.publish(TOPIC_PROGRESS, payload.c_str());
    Serial.print("Published progress: ");
    Serial.println(payload);
  }
  else
  {
    Serial.print("Failed to publish progress: ");
    Serial.println(payload);
  }
}

void handleButtons()
{
  static bool lastInc = HIGH, lastDec = HIGH, lastEnt = HIGH;

  bool inc = digitalRead(BTN_INC) == LOW;
  bool dec = digitalRead(BTN_DEC) == LOW;
  bool ent = digitalRead(BTN_ENTER) == LOW;

  if (inc && lastInc == HIGH && ricePortions < MAX_PORTIONS)
  {
    ricePortions++;
    showSelectionScreen();
    delay(200);
  }
  if (dec && lastDec == HIGH && ricePortions > 1)
  {
    ricePortions--;
    showSelectionScreen();
    delay(200);
  }
  if (ent && lastEnt == HIGH)
  {
    selectionConfirmed = true;
    displayMessageWithProgress("Starting...", currentStep, totalSteps);
    delay(1000);
  }

  lastInc = inc;
  lastDec = dec;
  lastEnt = ent;
}

void showSelectionScreen()
{
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Select Rice Amount");
  display.setCursor(0, 16);
  display.print(ricePortions);
  display.println(" portion(s)");
  display.display();
}

void runRiceCookingCycle()
{
  cooking = true;
  dispenseRice();
  washRice();
  soakRice();
  cookRice();
  finalDrain();
  displayMessageWithProgress("Cooking done!", totalSteps, totalSteps);
  cooking = false;
  delay(5000);
}

void dispenseRice()
{
  displayMessageWithProgress("Checking rice...", currentStep, totalSteps);
  if (digitalRead(IR_SENSOR_PIN) == HIGH)
  {
    displayMessageWithProgress("Rice level is low!", currentStep, totalSteps);
    while (digitalRead(IR_SENSOR_PIN) == HIGH)
    {
      delay(500);
    }
    displayMessageWithProgress("Rice OK. Dispensing...", currentStep, totalSteps);
  }
  else
  {
    displayMessageWithProgress("Dispensing rice...", currentStep, totalSteps);
  }

  int steps = ricePortions * STEPS_PER_PORTION;
  for (int i = 0; i < steps; i++)
  {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(800);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(800);
  }
  delay(500);
  currentStep++;
}

void washRice()
{
  displayMessageWithProgress("Washing rice...", currentStep, totalSteps);
  flowPulses = 0;
  digitalWrite(RELAY_WASH, HIGH);
  digitalWrite(RELAY_PUMP, HIGH);

  while (flowPulses < FLOW_THRESHOLD_PULSES)
  {
    delay(100);
  }

  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_WASH, LOW);

  digitalWrite(RELAY_DRAIN, HIGH);
  delay(DRAIN_DURATION);
  digitalWrite(RELAY_DRAIN, LOW);
  currentStep++;
}

void soakRice()
{
  displayMessageWithProgress("Filling for soak...", currentStep, totalSteps);
  flowPulses = 0;
  digitalWrite(RELAY_COOK_VALVE, HIGH);
  digitalWrite(RELAY_PUMP, HIGH);

  while (flowPulses < FLOW_THRESHOLD_PULSES)
  {
    delay(100);
  }

  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_COOK_VALVE, LOW);

  displayMessageWithProgress("Soaking rice...", currentStep, totalSteps);
  delay(SOAK_DURATION);
  currentStep++;
}

void cookRice()
{
  displayMessageWithProgress("Cooking rice...", currentStep, totalSteps);
  digitalWrite(RELAY_HEATER, HIGH);
  delay(COOK_DURATION);
  digitalWrite(RELAY_HEATER, LOW);
  currentStep++;
}

void finalDrain()
{
  displayMessageWithProgress("Draining rice...", currentStep, totalSteps);
  digitalWrite(RELAY_FINAL_DRAIN, HIGH);
  delay(DRAIN_DURATION);
  digitalWrite(RELAY_FINAL_DRAIN, LOW);
  currentStep++;
}
