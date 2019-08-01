// See full documentation at https://mdash.net/docs/examples/smart-light.md

#define MDASH_APP_NAME "SmartLight"
#include <mDash.h>

static int ledStatus = 0;  // Initially, LED is off. Mapped to shadow key `led`.
static int ledPin = 5;     // Default LED pin. Mapped to shadow key `pin`.

static void reportShadowState() {
  mDashShadowUpdate(
      "{\"state\":{\"reported\":{\"led\":%B,\"pin\":%d,\"ram\":%lu}}}",
      ledStatus, ledPin, mDashGetFreeRam());
}

static void onShadowDelta(const char *topic, const char *message) {
  double dv;
  printf("Topic: %s, message: %s\n", topic, message);
  if (mDashGetNum(message, "$.state.pin", &dv)) ledPin = dv;
  mDashGetBool(message, "$.state.led", &ledStatus);
  pinMode(ledPin, OUTPUT);          // Synchronise
  digitalWrite(ledPin, ledStatus);  // the hardware
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
  reportShadowState();  // Report current shadow state
}
