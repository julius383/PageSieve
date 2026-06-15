#!/usr/bin/env python3
import sys
import json
import struct

def read_message():
    try:
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            return None
        length = struct.unpack("@I", raw_length)[0]
        message = sys.stdin.buffer.read(length).decode("utf-8")
        return json.loads(message)
    except (EOFError, struct.error, json.JSONDecodeError):
        return None

def main():
    import os
    debug_path = os.path.expanduser("~/relay_debug.json.log")
    
    # Simple way to clear the log on start or just keep it small
    # with open(debug_path, "w") as f:
    #     f.write("Relay started and waiting for messages...\n")

    print("[SYSTEM] Relay host started", file=sys.stderr, flush=True)

    while True:
        m = read_message()
        if m is None:
            with open(debug_path, "a") as f:
                f.write("Connection closed (EOF)\n")
            break
        
        try:
            # Write raw JSONL to file for machine parsing
            with open(debug_path, "a") as f:
                f.write(json.dumps(m) + "\n")

            # Keep human-readable output on stderr for real-time viewing
            level = m.get("level", "info").upper()
            category = m.get("category", "ext")
            ts = m.get("timestamp")
            time_str = ""
            if ts:
                from datetime import datetime
                # Handle both milliseconds and microseconds
                if ts > 1e12: # likely milliseconds
                    time_str = f" [{datetime.fromtimestamp(ts / 1000.0).strftime('%H:%M:%S.%f')[:-3]}]"
                else:
                    time_str = f" [{datetime.fromtimestamp(ts).strftime('%H:%M:%S.%f')[:-3]}]"
                
            message_parts = m.get("message", [])
            message = "".join(str(p) for p in message_parts)
            
            properties = m.get("properties", {})
            props_str = f" {json.dumps(properties)}" if properties else ""
            
            output = f"[{level:5}] [{category}]{time_str} {message}{props_str}"
            print(output, file=sys.stderr, flush=True)
                
        except Exception as e:
            with open(debug_path, "a") as f:
                f.write(f"Error processing message: {str(e)}\n")
            print(f"[ERROR] {str(e)}", file=sys.stderr, flush=True)

if __name__ == "__main__":
    main()
