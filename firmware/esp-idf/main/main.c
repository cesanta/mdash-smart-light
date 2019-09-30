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

#include "esp_gpio.h"
#include "esp_wifi.h"

#define MDASH_APP_NAME "mdash-smart-light"
#include "../mDash/src/mDash.h"

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

void app_main() {
  mDashBeginWithWifi(init_wifi, NULL, NULL, NULL);

  // If a device recovered after a crash, do not start firmware logic
  // because it could crash again, thus fall into a crash-loop and make
  // a device unusable and un-recoverable.
  // Instead, wait for a possible recovery action.
  // Then reboot (this will change the crash reason) to try the firmware again.
  if (esp_reset_reason() == ESP_RST_PANIC) {
    int sleep_seconds = 600;
    MLOG(LL_CRIT, "Restarting after crash. Sleeping for %ds", sleep_seconds);
    vTaskDelay(sleep_seconds * 1000 / portTICK_PERIOD_MS);  // Sleep
    esp_restart();                                      // And restart again
  }

  for (;;) {
    vTaskDelay(10 / portTICK_PERIOD_MS);  // Sleep 10ms
    mDashCLI(getchar());                  // Handle CLI input
  }
}
