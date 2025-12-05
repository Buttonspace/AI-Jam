# Pattern Artifact Schema (MVP)

A JSON structure for drum patterns. One-bar, 16-step 4/4 grid with fixed voices and predictable defaults.

## Top-level fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `bpm` | number | 120 | Tempo in beats per minute |
| `time_signature` | string | "4/4" | Only 4/4 supported in MVP |
| `length_bars` | integer | 1 | Only 1-bar patterns in MVP |
| `voices` | array | required | List of voice objects |

## Voice object fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | required | Voice label (e.g., "kick") |
| `midi_note` | integer | varies | MIDI note number (0-127) |
| `channel` | integer | 10 | MIDI channel (1-16) |
| `steps` | array | required | 16 integers for 16th notes |

### Default voice notes
- kick: 36
- snare: 38
- hat_closed: 42

### Step values
- `0` = no note
- `1` = note at default velocity (100)
- `2-127` = explicit velocity for that step

## Validation rules

1. `steps` arrays must have exactly 16 values
2. Step values outside 0-127 are clamped
3. Missing `channel` defaults to 10
4. Only 4/4 time signature allowed
5. Only 1-bar patterns allowed

## Example artifact

```json
{
  "bpm": 120,
  "time_signature": "4/4",
  "length_bars": 1,
  "voices": [
    {
      "name": "kick",
      "midi_note": 36,
      "channel": 10,
      "steps": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    },
    {
      "name": "snare",
      "midi_note": 38,
      "channel": 10,
      "steps": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
    },
    {
      "name": "hat_closed",
      "midi_note": 42,
      "channel": 10,
      "steps": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    }
  ]
}
```
