// See full documentation at https://mdash.net/docs/examples/smart-light.md

#define MDASH_APP_NAME "SmartLight"
#include <mDash.h>

static int ledOn = 0;      // LED status. Mapped to `reported.app.on`
static int ledPin = 5;     // LED pin
static char *name = NULL;  // Device name

static void reportShadowState() {
  mDashShadowUpdate(
      "{\"state\":{\"reported\":"
      "{\"app\":{\"on\":%B,\"pin\":%d,\"name\":%Q}}}}",
      ledOn, ledPin, name == NULL ? "My Light" : name);
}

static void onShadowDelta(const char *topic, const char *message) {
  char buf[50];
  double dv;
  printf("Topic: %s, message: %s\n", topic, message);
  if (mDashGetNum(message, "$.state.app.pin", &dv)) ledPin = dv;
  if (mDashGetStr(message, "$.state.app.name", buf, sizeof(buf)) > 0) {
    free(name);
    name = strdup(buf);
  }
  mDashGetBool(message, "$.state.app.on", &ledOn);
  pinMode(ledPin, OUTPUT);          // Synchronise
  digitalWrite(ledPin, ledOn);      // the hardware
  reportShadowState();              // And report, clearing the delta
}

void setup() {
  Serial.begin(115200);
  mDashBegin();
  mDashShadowDeltaSubscribe(onShadowDelta);  // Handle delta

  // Until connected to the cloud, enable provisioning over serial
  while (mDashGetState() != MDASH_CONNECTED)
    if (Serial.available() > 0) mDashCLI(Serial.read());

  reportShadowState();  // When connected, report current shadow state
}

void loop() {
  delay(5 * 1000);  // Report every 5 seconds
  String topic = String("db/") + mDashGetDeviceID() + "/ram";  // Save free RAM
  mDashPublish(topic.c_str(), "%lu", mDashGetFreeRam());       // to the DB
}
