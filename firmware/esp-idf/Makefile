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

