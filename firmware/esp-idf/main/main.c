// Copyright (c) Cesanta Software Limited
// All rights reserved

// Instructions:
// 1. make defconfig flash simple_monitor ESPPORT=/dev/whatever
// 2. Press Ctrl-T Ctrl-E to enable serial echo
// 3. Type the following device provisionin commands into serial console
//    (done only once. Those settings persist reboots, reflashes and OTA)
//
// 		set wifi.sta.ssid WIFI_NETWORK_NAME
// 		set wifi.sta.pass WIFI_PASSWORD
// 		set device.pass DEVICE_MDASH_TOKEN
// 		reboot

#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "driver/gpio.h"
#include "esp_wifi.h"

#define MDASH_APP_NAME "mdash-smart-light"
#include "../mDash/src/mDash.h"

#define RESET_PIN 0
#define LED_PIN 5

struct device_state {
  bool on;     // If true, LED is on. If false, LED is off
  char *name;  // Device name. If null, a default name is used
};

static void init_wifi(const char *wifi_network_name, const char *wifi_pass) {
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  ESP_ERROR_CHECK(esp_wifi_init(&cfg));
  ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
  wifi_config_t wc = {};
  if (wifi_network_name != NULL) {
    strncpy((char *) wc.sta.ssid, wifi_network_name, sizeof(wc.sta.ssid));
    strncpy((char *) wc.sta.password, wifi_pass, sizeof(wc.sta.password));
    MLOG(LL_INFO, "Connecting to WiFi network %s...", wc.sta.ssid);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_STA, &wc));
  } else {
    uint8_t mac[6];
    esp_wifi_get_mac(WIFI_IF_STA, mac);
    wc.ap.ssid_len = snprintf((char *) wc.ap.ssid, sizeof(wc.ap.ssid),
                              "%s-%02X%02X", MDASH_APP_NAME, mac[4], mac[5]);
    wc.ap.max_connection = 5;
    memset(wc.ap.password, 0, sizeof(wc.ap.password));
    wc.ap.authmode = WIFI_AUTH_OPEN;
    MLOG(LL_INFO, "Starting WiFi network %s...", wc.ap.ssid);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_AP, &wc));
  }
  ESP_ERROR_CHECK(esp_wifi_start());
}

static void reportShadowState(struct device_state *state) {
  mDashShadowUpdate("{\"state\":{\"reported\":{\"on\":%B,\"name\":%Q}}}",
                    state->on, state->name == NULL ? "My Light" : state->name);
}

// "Shadow.Delta" RPC handler
// Called by the mDash when it generates shadow delta
static void onShadowDelta(void *ctx, void *userdata) {
  struct device_state *state = (struct device_state *) userdata;
  const char *params = mDashGetParams(ctx);
  char buf[50];
  int iv;
  if (mDashGetBool(params, "$.state.on", &iv)) state->on = iv;
  if (mDashGetStr(params, "$.state.app.name", buf, sizeof(buf)) > 0) {
    free(state->name);
    state->name = strdup(buf);
  }
  gpio_set_level(LED_PIN, state->on);  // Synchronise with the shadow
  reportShadowState(state);            // And report to mDash
}

// When we're reconnected, report our current state to shadow
static void onConnStateChange(void *event_data, void *user_data) {
  struct device_state *state = (struct device_state *) user_data;
  long connection_state = (long) event_data;
  if (connection_state == MDASH_CONNECTED) reportShadowState(state);
}

static void setup(void) {
  gpio_pad_select_gpio(LED_PIN);
  gpio_pad_select_gpio(RESET_PIN);
  gpio_set_direction(LED_PIN, GPIO_MODE_OUTPUT);
  gpio_set_direction(RESET_PIN, GPIO_MODE_INPUT);
}

static void reset_on_long_press(int reset_pin, int duration_ms) {
  static unsigned long t;
  unsigned long uptime_ms = esp_timer_get_time() / 1000;
  if (t > 0 && uptime_ms - t > duration_ms) {
    mDashConfigReset();
    esp_restart();
  }
  t = gpio_get_level(reset_pin) > 0 ? 0 : t == 0 ? uptime_ms : t;
}

static void loop(void) {
  reset_on_long_press(RESET_PIN, 3000);  // Reset device on button press
  mDashCLI(getchar());                   // Handle CLI input
  vTaskDelay(10 / portTICK_PERIOD_MS);   // Sleep 10ms
}

static void pause_then_reboot(int sleep_seconds) {
  MLOG(LL_CRIT, "Restarting after crash. Sleeping for %ds", sleep_seconds);
  vTaskDelay(sleep_seconds * 1000 / portTICK_PERIOD_MS);
  esp_restart();
}

void app_main() {
  struct device_state state = {.on = false, .name = NULL};
  mDashBeginWithWifi(init_wifi, NULL, NULL, NULL);
  mDashExport("Shadow.Delta", onShadowDelta, &state);
  mDashRegisterEventHandler(MDASH_EVENT_CONN_STATE, onConnStateChange, &state);

  // If a device recovered after a crash, do not start firmware logic
  // because it could crash again, thus fall into a crash-loop and make
  // a device unusable and un-recoverable.
  // Instead, wait for a possible recovery action.
  // Then reboot (this will change the crash reason) to try the firmware again.
  if (esp_reset_reason() == ESP_RST_PANIC) pause_then_reboot(600);

  setup();
  for (;;) loop();
}
