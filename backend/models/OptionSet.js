const mongoose = require('mongoose');

/**
 * OptionSet — a single, generic home for every configurable dropdown list in the
 * app (blood groups, guardian relationships, payment methods, departments, book
 * categories, event types, expense categories …). One model powers them all so
 * new dynamic lists never need a new collection.
 *
 *   key     – stable identifier the code references (e.g. "bloodGroups")
 *   label   – human name shown in Settings (e.g. "Blood Groups")
 *   options – the selectable values
 */
const optionSetSchema = new mongoose.Schema({
  school:  { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  key:     { type: String, required: true, trim: true },
  label:   { type: String, required: true, trim: true },
  options: [{ type: String, trim: true }],
  order:   { type: Number, default: 0 },
}, { timestamps: true });

// One set per key per school
optionSetSchema.index({ school: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('OptionSet', optionSetSchema);
