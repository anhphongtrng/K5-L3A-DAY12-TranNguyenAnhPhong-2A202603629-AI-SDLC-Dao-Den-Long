const notes = {
  mote_picked: [660, 880], lantern_lit: [523, 659, 784], pulse: [392, 784, 1047],
  player_hit: [220, 147], jump: [330, 494], dash: [293, 590], won: [523, 659, 784, 1047],
  lost: [392, 329, 262], shade_spawned: [110, 165], countdown: [590],
  wind: [280, 400, 320], charm_picked: [784, 988],
};

export function createAudio() {
  let context;
  let master;
  let background;
  let level = 0.5;
  function volume(value) {
    level = value;
    if (master) master.gain.setTargetAtTime(level, context.currentTime, 0.03);
  }
  function start() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = level;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
  }
  function music(playing) {
    if (!context || playing === Boolean(background)) return;
    if (!playing) {
      for (const oscillator of background) oscillator.stop();
      background = null;
      return;
    }
    const soft = context.createGain();
    soft.gain.value = 0.012;
    soft.connect(master);
    background = [130.81, 196, 261.63].map((frequency) => {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency;
      oscillator.connect(soft);
      oscillator.start();
      return oscillator;
    });
    background[0].onended = () => soft.disconnect();
  }
  function play(name) {
    if (!context || !notes[name]) return;
    notes[name].forEach((frequency, index) => {
      const at = context.currentTime + index * 0.09;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = name === 'player_hit' ? 'triangle' : 'sine';
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.001, at);
      envelope.gain.exponentialRampToValueAtTime(0.12, at + 0.015);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.23);
      tone.connect(envelope).connect(master);
      tone.start(at);
      tone.stop(at + 0.24);
      tone.onended = () => envelope.disconnect();
    });
  }
  return { start, volume, music, play };
}
