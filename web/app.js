// AI-Jam MVP Player - WebMIDI drum pattern player

const DEFAULT_VOICES = [
  { name: 'kick', midi_note: 36, channel: 10 },
  { name: 'snare', midi_note: 38, channel: 10 },
  { name: 'hat_closed', midi_note: 42, channel: 10 }
];

const SCHEDULER_INTERVAL_MS = 50;
const LOOKAHEAD_MS = 120;
const GATE_MS = 50;

let midiAccess = null;
let midiOutput = null;
let playing = false;
let currentStep = 0;
let nextStepTimeMs = 0;
let schedulerId = null;
let artifact = null;

const elements = {
  midiOutputSelect: document.getElementById('midi-output'),
  refreshMidi: document.getElementById('refresh-midi'),
  bpm: document.getElementById('bpm'),
  channelMode: document.querySelectorAll('input[name="channel-mode"]'),
  channelOverride: document.getElementById('channel-override'),
  jsonInput: document.getElementById('json-input'),
  loadJson: document.getElementById('load-json'),
  loadFixture: document.getElementById('load-fixture'),
  play: document.getElementById('play'),
  stop: document.getElementById('stop'),
  status: document.getElementById('status')
};

const EMBEDDED_FIXTURE = {
  bpm: 120,
  time_signature: '4/4',
  length_bars: 1,
  voices: [
    { name: 'kick', midi_note: 36, channel: 10, steps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    { name: 'snare', midi_note: 38, channel: 10, steps: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
    { name: 'hat_closed', midi_note: 42, channel: 10, steps: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] }
  ]
};

function setStatus(text) {
  elements.status.textContent = text;
}

function requestMIDI() {
  if (!navigator.requestMIDIAccess) {
    setStatus('WebMIDI not supported');
    return;
  }

  navigator.requestMIDIAccess({ sysex: false })
    .then(access => {
      midiAccess = access;
      populateOutputs();
      midiAccess.onstatechange = populateOutputs;
      setStatus('MIDI ready');
    })
    .catch(() => {
      setStatus('MIDI access denied');
    });
}

function populateOutputs() {
  if (!midiAccess) return;
  const outputs = Array.from(midiAccess.outputs.values());
  elements.midiOutputSelect.innerHTML = '';

  if (outputs.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No MIDI outputs';
    elements.midiOutputSelect.appendChild(option);
    midiOutput = null;
    return;
  }

  outputs.forEach(output => {
    const option = document.createElement('option');
    option.value = output.id;
    option.textContent = output.name;
    elements.midiOutputSelect.appendChild(option);
  });

  midiOutput = outputs[0];
}

function getSelectedOutput() {
  if (!midiAccess) return null;
  const id = elements.midiOutputSelect.value;
  midiOutput = Array.from(midiAccess.outputs.values()).find(o => o.id === id) || null;
  return midiOutput;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSteps(steps) {
  const normalized = new Array(16).fill(0);
  if (!Array.isArray(steps)) return normalized;
  for (let i = 0; i < 16; i++) {
    const raw = steps[i];
    const num = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    normalized[i] = clamp(Math.round(num), 0, 127);
  }
  return normalized;
}

function normalizeVoice(voice) {
  const defaults = DEFAULT_VOICES.find(v => v.name === voice.name);
  return {
    name: voice.name || 'voice',
    midi_note: clamp(voice.midi_note ?? defaults?.midi_note ?? 36, 0, 127),
    channel: clamp(voice.channel ?? defaults?.channel ?? 10, 1, 16),
    steps: normalizeSteps(voice.steps)
  };
}

function parseArtifact(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }

  const bpm = typeof parsed.bpm === 'number' ? parsed.bpm : 120;

  if (parsed.time_signature && parsed.time_signature !== '4/4') {
    throw new Error('Only 4/4 time supported');
  }

  if (parsed.length_bars && parsed.length_bars !== 1) {
    throw new Error('Only 1-bar patterns supported');
  }

  let voices = Array.isArray(parsed.voices) ? parsed.voices : [];
  voices = voices.map(normalizeVoice);

  return { bpm, time_signature: '4/4', length_bars: 1, voices };
}

function applyArtifact(newArtifact) {
  artifact = newArtifact;
  elements.bpm.value = artifact.bpm;
  setStatus('Artifact loaded');
}

function loadJsonFromTextarea() {
  try {
    const normalized = parseArtifact(elements.jsonInput.value);
    applyArtifact(normalized);
  } catch (err) {
    setStatus(err.message);
  }
}

async function loadFixture() {
  const paths = [
    '../fixtures/basic_groove.json',
    './fixtures/basic_groove.json',
    '/fixtures/basic_groove.json'
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const data = await res.json();
      elements.jsonInput.value = JSON.stringify(data, null, 2);
      applyArtifact(parseArtifact(elements.jsonInput.value));
      setStatus('Fixture loaded');
      return;
    } catch {
      // try next
    }
  }

  // Fall back to embedded fixture
  elements.jsonInput.value = JSON.stringify(EMBEDDED_FIXTURE, null, 2);
  applyArtifact(parseArtifact(elements.jsonInput.value));
  setStatus('Embedded fixture loaded');
}

function getChannelForVoice(voice) {
  const mode = Array.from(elements.channelMode).find(r => r.checked)?.value;
  if (mode === 'override') {
    return clamp(Number(elements.channelOverride.value) || 10, 1, 16);
  }
  return clamp(voice.channel, 1, 16);
}

function sendNote(midi_note, channel, velocity, timeMs) {
  if (!midiOutput) return;
  const noteOn = [0x90 + (channel - 1), clamp(midi_note, 0, 127), velocity];
  const noteOff = [0x80 + (channel - 1), clamp(midi_note, 0, 127), 0];
  midiOutput.send(noteOn, timeMs);
  midiOutput.send(noteOff, timeMs + GATE_MS);
}

function scheduleStep(stepIndex, timeMs) {
  if (!artifact) return;
  artifact.voices.forEach(voice => {
    const velocity = voice.steps[stepIndex];
    if (velocity > 0) {
      const vel = velocity === 1 ? 100 : velocity;
      sendNote(voice.midi_note, getChannelForVoice(voice), vel, timeMs);
    }
  });
}

function getStepDurationMs() {
  const bpm = Number(elements.bpm.value) || 120;
  return (60000 / bpm) / 4; // 16th notes
}

function tickScheduler() {
  const now = performance.now();
  while (nextStepTimeMs < now + LOOKAHEAD_MS) {
    scheduleStep(currentStep, nextStepTimeMs);
    nextStepTimeMs += getStepDurationMs();
    currentStep = (currentStep + 1) % 16;
  }
}

function startPlayback() {
  if (!artifact) {
    setStatus('Load JSON first');
    return;
  }
  if (!getSelectedOutput()) {
    setStatus('Select MIDI output');
    return;
  }

  playing = true;
  currentStep = 0;
  nextStepTimeMs = performance.now();
  schedulerId = setInterval(tickScheduler, SCHEDULER_INTERVAL_MS);
  elements.play.disabled = true;
  elements.stop.disabled = false;
  setStatus('Playing');
}

function stopPlayback() {
  playing = false;
  if (schedulerId) {
    clearInterval(schedulerId);
    schedulerId = null;
  }
  elements.play.disabled = false;
  elements.stop.disabled = true;
  sendAllNotesOff();
  setStatus('Stopped');
}

function sendAllNotesOff() {
  if (!midiOutput || !artifact) return;
  const channels = new Set(artifact.voices.map(v => getChannelForVoice(v)));
  channels.forEach(channel => {
    midiOutput.send([0xB0 + (channel - 1), 123, 0]); // All Notes Off
  });
}

function updateChannelOverrideState() {
  const mode = Array.from(elements.channelMode).find(r => r.checked)?.value;
  elements.channelOverride.disabled = mode !== 'override';
}

function wireEvents() {
  elements.refreshMidi.addEventListener('click', populateOutputs);
  elements.midiOutputSelect.addEventListener('change', getSelectedOutput);
  elements.loadJson.addEventListener('click', loadJsonFromTextarea);
  elements.loadFixture.addEventListener('click', loadFixture);
  elements.play.addEventListener('click', startPlayback);
  elements.stop.addEventListener('click', stopPlayback);
  elements.channelMode.forEach(radio => {
    radio.addEventListener('change', updateChannelOverrideState);
  });
}

function init() {
  wireEvents();
  updateChannelOverrideState();
  requestMIDI();
  loadFixture();
}

window.addEventListener('load', init);
