/**
 * Gate C (Pre-Score Filtering) Configuration
 */
export const GATE_C_CONFIG = {
  // Master switch for the entire Gate C
  get enabled(): boolean {
    return process.env.GATE_C_ENABLED !== 'false';
  },

  // Check 1: Duplicate source URL / FB Post ID (default: true)
  get check1DuplicateUrlEnabled(): boolean {
    return process.env.GATE_C_CHECK_1_DUPLICATE_URL !== 'false';
  },

  // Check 2: Insufficient content length (default: true)
  get check2MinLengthEnabled(): boolean {
    return process.env.GATE_C_CHECK_2_MIN_LENGTH !== 'false';
  },

  // Check 3: Resolution/non-event language (default: false for staggered rollout)
  get check3ResolvedUpdateEnabled(): boolean {
    return process.env.GATE_C_CHECK_3_RESOLVED_UPDATE === 'true';
  },

  // Check 4: Pure mainstream-reshare detection (default: true)
  get check4MainstreamShareEnabled(): boolean {
    return process.env.GATE_C_CHECK_4_MAINSTREAM_SHARE !== 'false';
  },

  // Threshold in Thai characters for Check 2 (default: 50)
  get minCharThreshold(): number {
    const threshold = parseInt(process.env.GATE_C_MIN_CHAR_THRESHOLD || '50', 10);
    return isNaN(threshold) ? 50 : threshold;
  }
};
