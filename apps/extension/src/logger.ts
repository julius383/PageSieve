import { configure, getConsoleSink, getLogger, type LogRecord } from '@logtape/logtape';
import { logStore } from '@/ui/sidebar/stores/logs';

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

function serializeRecord(record: LogRecord) {
    return {
        level: record.level,
        category: record.category,
        message: record.message,
        properties: record.properties,
        timestamp: Number(record.timestamp),
    };
}

export const initExtensionLogger = async () => {
    const isBackground =
        typeof window === 'undefined' ||
        (typeof browser !== 'undefined' && browser.extension?.getBackgroundPage?.() === window);

    if (isBackground) {
        try {
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
                                .catch(() => {
                                    // ignore errors
                                });
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
                        } catch {
                            // ignore errors
                        }
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
                            .catch(() => {
                                // ignore errors
                            });
                    }
                },
                console: getConsoleSink(),
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
