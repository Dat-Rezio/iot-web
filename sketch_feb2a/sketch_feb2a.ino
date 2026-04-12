#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ================= WIFI =================
const char* ssid = "BaGiaThep";
const char* password = "vannhucu";

// IP máy tính chạy Mosquitto
const char* mqtt_server = "172.20.10.2";
const int port = 1884;

// ================= PHẦN CỨNG =================
#define DHTPIN 4
#define DHTTYPE DHT11
#define LIGHT_SENSOR_PIN 32

#define LED1_PIN 18
#define LED2_PIN 19
#define LED3_PIN 21

DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

// ================= TIMER =================
unsigned long previousSensorMillis = 0;
const long sensorInterval = 3000; // 3 giây

// Reconnect attempt
unsigned long lastReconnectAttempt = 0;

// ======================================================
// HÀM GỬI RESULT VỀ device/status
void publishStatus(const char* device, const char* state, const char* result) {

  StaticJsonDocument<200> statusDoc;

  statusDoc["device"] = device;
  statusDoc["state"] = state;
  statusDoc["result"] = result;

  char statusBuffer[200];
  serializeJson(statusDoc, statusBuffer);

  client.publish("device/status", statusBuffer);

  Serial.println(">> GUI DEVICE STATUS:");
  Serial.println(statusBuffer);
}

// ======================================================
// MQTT CALLBACK - Nhận lệnh điều khiển
void callback(char* topic, byte* payload, unsigned int length) {

  Serial.print("Topic: ");
  Serial.println(topic);

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("JSON loi: ");
    Serial.println(error.f_str());
    publishStatus("unknown", "unknown", "failed");
    return;
  }

  const char* device = doc["device"];
  const char* state  = doc["state"];

  if (!device || !state) {
    Serial.println("Thieu truong device/state");
    publishStatus("unknown", "unknown", "failed");
    return;
  }

  bool outputState;
  bool validDevice = true;
  bool validState = true;

  // Kiểm tra state
  if (String(state) == "ON") {
    outputState = HIGH;
  } 
  else if (String(state) == "OFF") {
    outputState = LOW;
  } 
  else {
    validState = false;
  }

  // Kiểm tra device
  if (String(device) == "led1") {
    if (validState) digitalWrite(LED1_PIN, outputState);
  }
  else if (String(device) == "led2") {
    if (validState) digitalWrite(LED2_PIN, outputState);
  }
  else if (String(device) == "led3") {
    if (validState) digitalWrite(LED3_PIN, outputState);
  }
  else {
    validDevice = false;
  }

  // Gửi kết quả
  if (validDevice && validState) {
    publishStatus(device, state, "success");
  } 
  else {
    publishStatus(device, state, "failed");
  }
}

// ======================================================
// MQTT RECONNECT
void reconnect() {
  Serial.print("Dang ket noi MQTT...");

  // 1. TẠO TÊN NGẪU NHIÊN ĐỂ TRÁNH LỖI GHOST CONNECTION
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);

  if (client.connect(clientId.c_str(), "admin", "123456")) {

    Serial.println(" Da ket noi!");
    client.subscribe("device/control");
    
    // Đọc trạng thái thực tế từ các chân Pin trước khi báo cáo
    // Giả sử led1 gắn chân 18, led2 chân 19, led3 chân 21
    String status1 = (digitalRead(18) == HIGH) ? "ON" : "OFF";
    String status2 = (digitalRead(19) == HIGH) ? "ON" : "OFF";
    String status3 = (digitalRead(21) == HIGH) ? "ON" : "OFF";

    // Gửi bản tin sync với dữ liệu THỰC TẾ
    client.publish("device/status", ("{\"device\":\"led1\", \"state\":\"" + status1 + "\", \"result\":\"sync\"}").c_str());
    client.publish("device/status", ("{\"device\":\"led2\", \"state\":\"" + status2 + "\", \"result\":\"sync\"}").c_str());
    client.publish("device/status", ("{\"device\":\"led3\", \"state\":\"" + status3 + "\", \"result\":\"sync\"}").c_str());
    
  } else {

    Serial.print(" That bai, rc=");
    Serial.println(client.state());
    delay(2000);
  }
}

// ======================================================
// SETUP
void setup() {

  Serial.begin(115200);
  dht.begin();

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  // WiFi connect
  WiFi.begin(ssid, password);

  Serial.print("Dang ket noi WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi da ket noi!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, port);
  client.setCallback(callback);
}

// ======================================================
// LOOP
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Mat WiFi! Dang doi ket noi lai...");
    WiFi.disconnect(); // Ngắt hẳn kết nối cũ để xóa cache lỗi
    WiFi.begin(ssid, password);
    delay(1000);
  }

  if (!client.connected()) {
    reconnect();
  } else {
    client.loop();
  }

  unsigned long currentMillis = millis();

  if (currentMillis - previousSensorMillis >= sensorInterval) {

    previousSensorMillis = currentMillis;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    int rawLight = analogRead(LIGHT_SENSOR_PIN);

    const float GAMMA = 0.7;    // Đặc tính của LDR
    const float RL10 = 50;     // Điện trở của LDR ở 10 Lux (đơn vị kOhm, thường là 50)
    const float R_FIXED = 10.0; // Điện trở cố định bạn dùng (10kOhm)

    // 1. Chuyển ADC sang điện áp
    float voltage = rawLight / 4095.0 * 3.3;
    // Tránh để voltage quá gần 3.3V (gây lỗi chia cho 0)
    if (voltage > 3.25) voltage = 3.25; 
    // 2. Tính điện trở LDR
    float resistance = R_FIXED * voltage / (3.3 - voltage);
    // 3. Tính Lux
    float lux_raw = pow(RL10 * pow(10, GAMMA) / resistance, 1 / GAMMA);
    // 4. Giới hạn Lux trong khoảng thực tế (ví dụ tối đa 50,000)
    // Hàm constrain(giá trị, thấp nhất, cao nhất)
    int lux_final = constrain(round(lux_raw), 0, 2000);

    StaticJsonDocument<200> doc;
    doc["temperature"] = t;
    doc["humidity"] = h;
    doc["light"] = lux_final;

    char buffer[200];
    serializeJson(doc, buffer);

    client.publish("sensor/data", buffer);

    Serial.println("\n--- GUI SENSOR DATA ---");
    Serial.println(buffer);
  }
}