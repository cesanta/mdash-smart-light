PROJECT_NAME := smartlight
EXTRA_LDFLAGS = -L$(CURDIR)/mDash/src/esp32 -lmDash
CFLAGS += -DAPPVERSION=20191009

COMPONENTS = app_trace app_update bootloader bootloader_support cxx driver \
						 esp_common esp_adc_cal esp_event esp32 esp_ringbuf esptool_py \
						 ethernet freertos heap log lwip main micro-ecc mbedtls esp_rom \
						 newlib nvs_flash partition_table pthread soc spi_flash spiffs \
						 tcpip_adapter vfs wpa_supplicant efuse xtensa esp_wifi esp_eth \
						 espcoredump \
						 xtensa-debug-module smartconfig smartconfig_ack

V=0
.PHONY: mdash
build: mdash

mdash:
	test -d mDash || git clone https://github.com/cesanta/mDash.git
	cd mDash && git pull

include $(IDF_PATH)/make/project.mk
