#rm -rf build && mkdir build && cd build
#cmake .. 
#cmake --build .

.PHONY: libmdash
build: libmdash

all: build flash monitor

build:
	idf.py build

flash:
	idf.py flash

monitor:
	idf.py monitor

libmdash:
	test -d mDash || git clone https://github.com/cesanta/mDash.git
	cd mDash && git pull


#PROJECT_NAME := mdash-smart-light
#EXTRA_LDFLAGS = -L$(CURDIR)/mDash/src/esp32 -lmDash

#COMPONENTS = app_trace app_update bootloader bootloader_support cxx driver \
						 esp_adc_cal esp_event esp32 esp_ringbuf esptool_py ethernet expat \
						 freertos heap log lwip main micro-ecc mbedtls newlib nvs_flash \
						 partition_table pthread soc spi_flash spiffs tcpip_adapter vfs \
						 smartconfig_ack wpa_supplicant xtensa-debug-module

#V=0



#rm:
#	rm -rf sdkconfig.old sdkconfig build

include $(IDF_PATH)/make/project.mk
