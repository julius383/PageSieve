import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { logStore } from "./sidebar/stores/logs";

let nativePort: browser.runtime.Port | null = null;

function getNativePort() {
  if (!nativePort) {
    try {
      nativePort = browser.runtime.connectNative("dev_relay");
      nativePort.onDisconnect.addListener(() => {
        nativePort = null;
      });
    } catch (e) {
      console.error("Failed to connect to native relay:", e);
    }
  }
  return nativePort;
}

await configure({
  sinks: {
    console: getConsoleSink(),
    store: (record) => {
      logStore.sink(record);
      if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
        browser.runtime
          .sendMessage({
            action: 'log',
            record: {
              level: record.level,
              category: record.category,
              message: record.message,
              properties: record.properties,
              timestamp: Number(record.timestamp),
            },
          })
          .catch(() => {});
      }
    },
    relay: (record) => {
      try {
        const port = getNativePort();
        if (port) {
          port.postMessage({
            id: crypto.randomUUID(),
            level: record.level,
            category: record.category.join("/"),
            message: record.message,
            properties: record.properties,
            timestamp: Number(record.timestamp),
          });
        }
      } catch (_) {}
    },
  },
  loggers: [
    {
      category: ["ext"],          // root category; all children inherit
      lowestLevel: "debug",
      sinks: ["console", "store", "relay"],
    },
  ],
});

export { getLogger };
