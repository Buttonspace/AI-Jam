# AI-Jam

MIDI pattern generator that converts natural language descriptions into drum patterns playable via WebMIDI.

## Quick Start

1. Serve the `web` folder from a local web server (for example, with Python 3 run `python3 -m http.server 8000 --directory web`, then open `http://localhost:8000`)
2. Open the page in a WebMIDI-capable browser (Chrome recommended)
3. Select your Bonjour/rtpMIDI output port
4. Click "Load fixture" to load the demo pattern
5. Click "Play" to hear the pattern on your drum machine

> Note: Python 2 (`python.exe` from `C:\Python27`) does not include the `http.server` module. Use Python 3 or another static file server (e.g., `npx serve web` or `python -m SimpleHTTPServer 8000` on macOS/Linux).

## Project Structure

```
├── docs/
│   └── schema.md          # Pattern JSON schema documentation
├── fixtures/
│   └── basic_groove.json  # Example 16-step pattern
├── web/
│   ├── index.html         # Browser-based MIDI player
│   ├── app.js             # Player logic
│   └── style.css          # Styles
└── README.md
```

## Pattern Schema

Patterns are JSON files with:
- `bpm`: tempo (default 120)
- `time_signature`: only "4/4" supported in MVP
- `length_bars`: only 1 supported in MVP
- `voices`: array of voice objects with `name`, `midi_note`, `channel`, and `steps` (16 values 0-127)

See `docs/schema.md` for full specification.

## Requirements

- Modern browser with WebMIDI support (Chrome, Edge)
- Virtual MIDI port (rtpMIDI/Bonjour) or hardware MIDI interface
