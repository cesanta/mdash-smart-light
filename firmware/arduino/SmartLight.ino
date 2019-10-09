// Smart Light reference project.
// See documentation at https://mdash.net/docs/

#define MDASH_APP_NAME "SmartLight"
#include <mDash.h>

#include <WiFi.h>

struct device_state {
  bool on;    // If true, LED is on. If false, LED is off
  char *name; // Device name. If null, a default name is used
};

#define RESET_PIN -1  // Set to your reset button pin
#define LED_PIN 5     // Set to your LED pin

static void reportShadowState(struct device_state *state) {
  mDashShadowUpdate("{\"state\":{\"reported\":{\"on\":%B,\"name\":%Q}}}",
                    state->on, state->name == NULL ? "My Light" : state->name);
}

// "Shadow.Delta" RPC handler
// Called by the mDash when it generates shadow delta
static void onShadowDelta(struct jsonrpc_request *r) {
  struct device_state *state = (struct device_state *) r->userdata;
  char buf[50];
  int iv;
  if (mjson_get_bool(r->params, r->params_len, "$.state.on", &iv)) {
    state->on = iv;
  }
  if (mjson_get_string(r->params, r->params_len, "$.state.app.name", buf,
                       sizeof(buf)) > 0) {
    free(state->name);
    state->name = strdup(buf);
  }
  digitalWrite(LED_PIN, state->on);      // Synchronise with the shadow
  reportShadowState(state);              // And report to mDash
}

// When we're reconnected, report our current state to shadow
static void onConnected(void *event_data, void *user_data) {
  struct device_state *state = (struct device_state *) user_data;
  reportShadowState(state);
}

// Wifi setup function. Called by the mDash library
static void init_wifi(const char *wifi_network_name, const char *wifi_pass) {
  if (wifi_network_name == NULL) {
    WiFi.softAP(MDASH_APP_NAME, "");
    MLOG(LL_INFO, "%s", "Starting access point ...");
  } else {
    MLOG(LL_INFO, "Joining WiFi network %s", wifi_network_name);
    WiFi.begin(wifi_network_name, wifi_pass);
    // while (WiFi.status() != WL_CONNECTED) delay(500);
  }
}

void setup() {
  static struct device_state state;
  Serial.begin(115200);

  // Start mDash library. Pass NULLs to read credentials from the config file
  mDashBeginWithWifi(init_wifi, NULL, NULL, NULL);
  jsonrpc_export("Shadow.Delta", onShadowDelta, &state);
  mDashRegisterEventHandler(MDASH_EVENT_CLOUD_CONNECTED, onConnected, &state);

  // Configure pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(RESET_PIN, INPUT);
}

void loop() {
  // If the reset button was pressed for > 3 seconds, reset device
  static unsigned long t;
  if (RESET_PIN >= 0 && t > 0 && millis() - t > 3000) mDashConfigReset();
  t = digitalRead(RESET_PIN) == HIGH ? 0 : t == 0 ? millis() : t;
  // MLOG(LL_INFO, "%lu %d", t, digitalRead(RESET_PIN));

  // Allow to set credentials over the serial line
  if (Serial.available() > 0) mDashCLI(Serial.read());

  delay(10);
}
