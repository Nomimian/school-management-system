const School  = require('../models/School');
const challan = require('../services/challanService');
const engine  = require('../services/notificationEngine');

/**
 * Monthly-challan automation — deliberately dependency-free (no node-cron) so it
 * works anywhere, including hosts that sleep (e.g. Render free tier).
 *
 * Strategy: idempotent "ensure current month" for every opted-in school, run
 *   • once shortly after boot, and
 *   • on a periodic interval (default every 6h).
 * Because generation is idempotent (a student who already has this month's
 * challan is skipped), running often is harmless — and it SELF-HEALS: if the box
 * was asleep on the 1st, the first tick after it wakes creates that month's
 * challans. No exact-midnight cron needed.
 */

let timer = null;

async function runOnce(reason = 'tick') {
  try {
    // All active tenants; each task is internally gated by the school's own
    // toggle (autoGenerateChallans / notifications.feeReminder), so it's safe
    // to iterate every school here.
    const schools = await School.find({ isActive: true })
      .select('_id name feeDay autoGenerateChallans notifications').lean();
    if (!schools.length) return;
    let created = 0, reminded = 0;
    for (const s of schools) {
      try { created  += (await challan.ensureCurrentMonth(s))?.created || 0; }
      catch (e) { console.error(`⚠️  Challan automation failed for school ${s._id}:`, e.message); }
      try { reminded += (await engine.runFeeReminders(s))?.sent || 0; }
      catch (e) { console.error(`⚠️  Fee reminders failed for school ${s._id}:`, e.message); }
    }
    if (created || reminded) console.log(`🧾 [${reason}] ${created} challan(s) generated · ${reminded} fee reminder(s) sent`);
  } catch (e) {
    console.error('⚠️  Scheduler error:', e.message);
  }
}

function startScheduler() {
  if (process.env.ENABLE_SCHEDULER === 'false') {
    console.log('⏸️  Challan scheduler disabled (ENABLE_SCHEDULER=false)');
    return;
  }
  const HOURS = Number(process.env.CHALLAN_INTERVAL_HOURS) || 6;
  const intervalMs = HOURS * 60 * 60 * 1000;

  // First run a little after boot so it never blocks the HTTP listener starting.
  setTimeout(() => runOnce('boot'), 20 * 1000);
  timer = setInterval(() => runOnce('interval'), intervalMs);
  if (timer.unref) timer.unref();   // don't keep the process alive just for this
  console.log(`⏱️  Challan scheduler active (every ${HOURS}h + boot)`);
}

module.exports = { startScheduler, runOnce };
