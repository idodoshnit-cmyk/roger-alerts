// Curated motion-capture clip list (Microsoft Rocketbox, MIT).  Each entry: [rocketboxName, options]
//   kind: 'cycle' (looping locomotion, 24 fps, gait-analysed) | 'trans' (start/stop with distance curve) | 'turn' (root yaw curve)
//         | 'loop' (looping stand/sit clip) | 'once' (gesture that starts and ends in the neutral pose)
//   fps:  stored sample rate (default 12 for loop/once, 24 for locomotion);  trim: longest stored duration in seconds (loop is closed by blending)
//   mirror: also store a left/right mirrored copy named <name>_mir
'use strict';
const L = [];
const add = (names, opt) => names.split(/\s+/).filter(Boolean).forEach(n => L.push([n, Object.assign({}, opt)]));
for (const s of ['m', 'f']) {
  // ---- locomotion
  add(`${s}_walk_neutral_01 ${s}_walk_neutral_02 ${s}_walk_stroll_01 ${s}_walk_slow_01 ${s}_walk_fast_01 ${s}_walk_cool_01 ${s}_run_slow_01 ${s}_run_neutral_01 ${s}_run_fast_01`, { kind: 'cycle' });
  add(s === 'm' ? 'm_walk_neutral_03 m_walk_fast_02 m_run_neutral_02 m_walk_stroll_02' : 'f_walk_self-assured f_walk_neutral_03 f_walk_stroll_02', { kind: 'cycle' });
  add(`${s}_walk_start ${s}_run_start`, { kind: 'trans' });
  add(`${s}_walk_stop ${s}_run_stop`, { kind: 'trans', mirror: true });
  add(`${s}_turn_left_90 ${s}_turn_right_90`, { kind: 'turn', fps: 24 });
  // ---- standing idles (loops) and fidgets (one-shots)
  add(`${s}_idle_neutral_01 ${s}_idle_neutral_02 ${s}_idle_neutral_03 ${s}_idle_waiting_01`, { kind: 'loop', trim: 15 });
  add(`${s}_idle_breathe_01`, { kind: 'loop' });
  add(`${s}_idle_look_around_01 ${s}_idle_look_around_02 ${s}_idle_scratch_head_01 ${s}_idle_yawn_01 ${s}_idle_stretch_arms_01 ${s}_idle_roll_head_01`, { kind: 'once' });
  add(s === 'm' ? 'm_idle_touch_face_01 m_idle_shake_leg_01' : 'f_idle_touch_hair_01 f_idle_move_leg_01', { kind: 'once' });
  // ---- conversation
  add(`${s}_gestic_talk_neutral_01 ${s}_gestic_talk_relaxed_01 ${s}_gestic_talk_excited_01 ${s}_gestic_listen_neutral_01`, { kind: 'loop', trim: 15 });
  add(`${s}_gestic_listen_accept_01 ${s}_gestic_laugh_low ${s}_gestic_shrug_01`, { kind: 'once' });
  add(`${s}_gestic_thoughtful_01`, { kind: 'once', trim: 10 });
  add(`${s}_wave_01`, { kind: 'once', fps: 24 });
  add(`${s}_wave_02`, { kind: 'once' });
  // ---- things in the hands
  add(`${s}_cell_phone_talk_01 ${s}_cell_phone_textmessage ${s}_drink_drinking`, { kind: 'loop', trim: 15 });
  add(s === 'm' ? 'm_newspaper_arm_idle m_hold_bag_idle m_trolley_idle' : 'f_newspaper_hand_idle f_hold_bag_idle_01 f_trolley_idle', { kind: 'loop', trim: 11 });
  add(`${s}_take_picture`, { kind: 'once' });
  // ---- sitting
  add(`${s}_sit_chair_idle_neutral_01 ${s}_sit_chair_idle_relaxed_01 ${s}_sit_table_idle_neutral_01 ${s}_sit_table_idle_relaxed_01`, { kind: 'loop', trim: 14 });
  add(`${s}_sit_chair_idle_look_around ${s}_sit_table_gestic_thoughtful`, { kind: 'once', trim: 12 });
  // ---- misc
  add(`${s}_crouch_in ${s}_crouch_out`, { kind: 'once', fps: 24, hold: true });
  add(`${s}_crouch_idle`, { kind: 'loop' });
  add(`${s}_dancing_cool`, { kind: 'loop', trim: 10, fps: 24 });
  add(`${s}_claphands_01`, { kind: 'loop', trim: 6, fps: 24 });
  add(s === 'm' ? 'm_cheer_01' : 'f_cheer_03', { kind: 'once', fps: 24, trim: 6 });
  add(`${s}_knock_door`, { kind: 'once', trim: 6 });
}
module.exports = L;
