# AI-Jam

MIDI pattern generator that converts natural language descriptions into drum patterns playable via WebMIDI.

## Quick Start

1. Open Anaconda Command Line and launch `python -m http.server 8000` from `web` Directory
2. Open `http://localhost:8000/index.html` in a WebMIDI-capable browser (Chrome recommended, Firefox also ok)
3. Select your Bonjour/rtpMIDI output port
4. Click "Load fixture" to load the demo pattern
5. Click "Play" to hear the pattern on your drum machine

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
