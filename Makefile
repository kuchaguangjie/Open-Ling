# Ling Android 打包入口。
#
# 构建逻辑本体放在 package.json 的 mobile:* / android:* 脚本里，这里只负责编排，
# 以及为 Gradle 解析本机可用的 JDK。

SHELL := /bin/bash

PNPM ?= pnpm
ADB ?= adb

ANDROID_DIR := android
DEBUG_APK := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk

# Capacitor 8 要求 JDK 21，而本机全局 JAVA_HOME 指向 JDK 25，Gradle 8.14.3 不支持 Java 25。
# 默认借用 Android Studio 自带的 JBR 21；换机器时用 make ANDROID_JBR=... 覆盖。
ANDROID_JBR ?= /mnt/star/program/android/android-studio/jbr

ifeq ($(wildcard $(ANDROID_JBR)/bin/java),)
GRADLE_JAVA_HOME := $(JAVA_HOME)
GRADLE_JAVA_WARNING := 未找到 $(ANDROID_JBR)，回退到当前 JAVA_HOME=$(JAVA_HOME)。Capacitor 8 需要 JDK 21，构建可能失败。
else
GRADLE_JAVA_HOME := $(ANDROID_JBR)
GRADLE_JAVA_WARNING :=
endif

.DEFAULT_GOAL := help

.PHONY: help apk apk-install android-add android-open clean

help: ## 显示可用目标
	@echo "Ling Android 打包目标："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

apk: ## 构建 debug APK（web 构建 + cap sync + gradlew assembleDebug）
	@if [ -n "$(GRADLE_JAVA_WARNING)" ]; then echo "警告：$(GRADLE_JAVA_WARNING)" >&2; fi
	$(PNPM) mobile:sync
	cd $(ANDROID_DIR) && JAVA_HOME="$(GRADLE_JAVA_HOME)" ./gradlew assembleDebug
	@echo "APK: $(DEBUG_APK)"

apk-install: apk ## 构建并安装到已连接的设备/模拟器
	$(ADB) install -r $(DEBUG_APK)

android-add: ## 生成 android/ 原生工程（仅首次需要）
	$(PNPM) android:add

android-open: ## 用 Android Studio 打开 android/ 工程
	$(PNPM) android:open

clean: ## 清理 Gradle 构建产物与 web 构建输出
	-cd $(ANDROID_DIR) && JAVA_HOME="$(GRADLE_JAVA_HOME)" ./gradlew clean
	rm -rf dist $(ANDROID_DIR)/app/build
