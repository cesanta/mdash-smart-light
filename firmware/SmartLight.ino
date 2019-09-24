// See full documentation at https://mdash.net/docs/examples/smart-light.md

#define MDASH_APP_NAME "SmartLight"
#include <mDash.h>

static int ledStatus = 0;  // Initially, LED is off. Mapped to shadow key `led`.
static int ledPin = 5;     // Default LED pin. Mapped to shadow key `pin`.
static char *name = NULL;  // Device name

static void reportShadowState() {
  mDashShadowUpdate(
      "{\"state\":{\"reported\":"
      "{\"led\":%B,\"pin\":%d,\"name\":%Q}}}",
      ledStatus, ledPin, name == NULL ? "My Light" : name);
}

// Called by the mDash when shadow delta is generated
static void onShadowDelta(void *ctx, void *userdata) {
  char buf[50];
  const char *params = mDashGetParams(ctx);
  double dv;
  if (mDashGetNum(params, "$.state.pin", &dv)) ledPin = dv;
  mDashGetBool(params, "$.state.led", &ledStatus);
  if (mDashGetStr(params, "$.state.app.name", buf, sizeof(buf)) > 0) {
    free(name);
    name = strdup(buf);
  }
  pinMode(ledPin, OUTPUT);          // Synchronise
  digitalWrite(ledPin, ledStatus);  // the hardware
  reportShadowState();              // And report, clearing the delta
}

// When we're reconnected, report our current state to shadow
static void onConnStateChange(void *event_data, void *user_data) {
  long connection_state = (long) event_data;
  if (connection_state == MDASH_CONNECTED) reportShadowState();
}

void setup() {
  Serial.begin(115200);
  mDashBegin();
  mDashExport("Shadow.Delta", onShadowDelta, NULL);
  mDashRegisterEventHandler(MDASH_EVENT_CONN_STATE, onConnStateChange, NULL);

  // Until connected to the cloud, enable provisioning over serial
  while (mDashGetState() != MDASH_CONNECTED)
    if (Serial.available() > 0) mDashCLI(Serial.read());
}

void loop() {
  delay(5 * 1000);
  mDashShadowUpdate("{\"state\":{\"reported\":{\"ram_free\":%lu}}}",
                    mDashGetFreeRam());  // Report free RAM periodically
}
