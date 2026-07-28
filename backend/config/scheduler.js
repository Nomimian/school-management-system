const School  = require('../models/School');
const challan = require('../services/challanService');

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
    const schools = await School.find({ isActive: true, autoGenerateChallans: true })
      .select('_id feeDay autoGenerateChallans').lean();
    if (!schools.length) return;
    let created = 0;
    for (const s of schools) {
      try {
        const r = await challan.ensureCurrentMonth(s);
        created += r?.created || 0;
      } catch (e) {
        console.error(`⚠️  Challan automation failed for school ${s._id}:`, e.message);
      }
    }
    if (created > 0) console.log(`🧾 Auto-generated ${created} monthly challan(s) [${reason}]`);
  } catch (e) {
    console.error('⚠️  Challan scheduler error:', e.message);
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
