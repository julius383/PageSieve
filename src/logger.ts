import { configure, getConsoleSink, getLogger, type LogRecord } from '@logtape/logtape';

let nativePort: browser.runtime.Port | null = null;

function getNativePort() {
    if (!nativePort) {
        try {
            nativePort = browser.runtime.connectNative('dev_relay');
            nativePort.onDisconnect.addListener(() => {
                nativePort = null;
            });
        } catch (e) {
            console.error('Failed to connect to native relay:', e);
        }
    }
    return nativePort;
}

/**
 * Serializes a LogRecord for browser.runtime.sendMessage
 * Converts bigints to numbers and ensures everything is serializable
 */
function serializeRecord(record: LogRecord) {
    return {
        level: record.level,
        category: record.category,
        message: record.message,
        properties: record.properties,
        timestamp: Number(record.timestamp),
    };
}

/**
 * Initializes the logger based on the current context.
 * This is wrapped in a function to avoid top-level await, which is incompatible with IIFE bundling.
 */
const initLogger = async () => {
            const isBackground = typeof window === 'undefined' || browser?.extension?.getBackgroundPage?.() === window;

    if (isBackground) {
        try {
            const { logStore } = await import('./sidebar/stores/logs');

            await configure({
                sinks: {
                    console: getConsoleSink(),
                    store: (record) => {
                        logStore.sink(record);
                        if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
                            browser.runtime
                                .sendMessage({
                                    action: 'log',
                                    record: serializeRecord(record),
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
                                    ...serializeRecord(record),
                                    category: record.category.join('/'),
                                });
                            }
                        } catch (_) {}
                    },
                },
                loggers: [
                    {
                        category: ['ext'],
                        lowestLevel: 'debug',
                        sinks: ['console', 'store', 'relay'],
                    },
                ],
            });

            // Listen for logs from other contexts
            if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
                browser.runtime.onMessage.addListener((message) => {
                    if (message.action === 'LOG_RAW' && message.record) {
                        const record = message.record;
                        const logger = getLogger(record.category);
                        const messageText = Array.isArray(record.message)
                            ? record.message.join('')
                            : String(record.message);
                        logger[record.level as 'debug'](messageText, record.properties);
                    }
                });
            }
        } catch (e) {
            console.error('Failed to initialize background logger:', e);
        }
    } else {
        await configure({
            sinks: {
                forwarder: (record) => {
                    if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
                        browser.runtime
                            .sendMessage({
                                action: 'LOG_RAW',
                                record: serializeRecord(record),
                            })
                            .catch(() => {});
                    }
                },
                console: getConsoleSink(), // Still log to local console for debugging
            },
            loggers: [
                {
                    category: ['ext'],
                    lowestLevel: 'debug',
                    sinks: ['forwarder', 'console'],
                },
            ],
        });
    }
};

// Fire and forget initialization
initLogger().catch((err) => console.error('Logger initialization failed:', err));

export { getLogger };
