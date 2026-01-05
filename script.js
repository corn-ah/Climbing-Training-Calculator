document.addEventListener('DOMContentLoaded', () => {
    
    // References
    const anaerobicRadios = document.querySelectorAll('input[name="doYouAnaerobic"]');
    const anaerobicFieldset = document.getElementById('anaerobicCategory');
    const peakRadios = document.querySelectorAll('input[name="peakRadios"]');
    const peakTimingSection = document.getElementById('peakTimingSection');
    const anaerobicRate = document.getElementById('anaerobicRate');
    const weeksOutFromPeak = document.getElementById('weeksOutFromPeak');

    // Utility helper functions
    const show = el => { if (el) el.style.display = 'block'; };
    const hide = el => { if (el) el.style.display = 'none'; };
    const questionRequired = (el, req) => {
        if (!el) return;
        if (req) el.setAttribute('required', 'required');
        else el.removeAttribute('required');
    };
    const clearValue = el => { if (!el) return; if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = ''; };

    // Update functions
    function updateAnaerobicVisibility() {
        const selected = document.querySelector('input[name="doYouAnaerobic"]:checked');
        if (selected && selected.value === 'yes') {
            show(anaerobicFieldset);
            questionRequired(anaerobicRate, true);
        } else {
            hide(anaerobicFieldset);
            questionRequired(anaerobicRate, false);
        // hide nested peak section
        const selectedPeakRadio = document.querySelector('input[name="peakRadios"]:checked');
        if (selectedPeakRadio) selectedPeakRadio.checked = false;
        }
    }

    function updatePeakTimingVisibility() {
        const selected = document.querySelector('input[name="peakRadios"]:checked');
        if (selected && selected.value === 'yes') {
            show(peakTimingSection);
            questionRequired(weeksOutFromPeak, true);
        } else {
            hide(peakTimingSection);
            questionRequired(weeksOutFromPeak, false);
            clearValue(weeksOutFromPeak);
        }
    }

    // Strength and Power Input Number Validation Restrictors
    document.getElementById('fingersOffWallPercentage').addEventListener('input', function () {
        if (this.value > 100) this.value = 100;
        if (this.value < 0) this.value = 0;
    });

    document.getElementById('ubpOffWallPercentage').addEventListener('input', function () {
        if (this.value > 100) this.value = 100;
        if (this.value < 0) this.value = 0;
    });


    
    // Visibility Listeners
    anaerobicRadios.forEach(r => r.addEventListener('change', updateAnaerobicVisibility));
    peakRadios.forEach(r => r.addEventListener('change', updatePeakTimingVisibility));

    // Score Listeners
    document.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', updateScoreDisplay);
    });
    document.querySelectorAll('input[type="radio"]').forEach(r => {
        r.addEventListener('change', updateScoreDisplay);
    });

    // Stop Form Refreshing
    document.getElementById('calculateButton').addEventListener('click', function (event) {
        event.preventDefault();

        const score = calculateScore();

        if (score > 10) {
            alert('Your training load exceeds the limit. Reduce intensity before continuing.');
            return;
        }
        
        const fingers = calculateFingers();
        const ubp = calculateUBP();
        const aerobic = calculateAerobic();
        const anaerobic = calculateAnaerobic();
        const peak = anaerobic ? calculatePeakAnaerobic(anaerobic) : null;
        const gaf = calculateGAF();

        const anaerobicLT2 = peak ? peak.lt2 : anaerobic;
        const anaerobicLT3 = peak ? peak.lt3 : null;

        displayResults(fingers, ubp, aerobic, anaerobicLT2, anaerobicLT3, gaf);

        document.getElementById('formView').classList.add('hidden');
        document.getElementById('resultsView').classList.remove('hidden');
    });

    document.getElementById('backButton').addEventListener('click', () => {
        document.getElementById('resultsView').classList.add('hidden');
        document.getElementById('formView').classList.remove('hidden');
    })

    // Initialize UI on load
    updateAnaerobicVisibility();
    updatePeakTimingVisibility();
    updateScoreDisplay();
});

// CALCULATIONS

// Helper: Off-wall % + Improvement Rate
function calculateSplitCategory(rate, percentage, defaults, slow, fast) {
  let [min, max] = defaults;
  if (rate === 'slow') [min, max] = slow;
  if (rate === 'fast') [min, max] = fast;

  const offWallSetsMin = Math.round(min * (percentage / 100));
  const offWallSetsMax = Math.ceil(max * (percentage / 100));
  const onWallSetsMin = Math.round(1.5 * (min - offWallSetsMin));
  const onWallSetsMax = Math.ceil(1.5 * (max - offWallSetsMax));

  return { offWallSetsMin, offWallSetsMax, onWallSetsMin, onWallSetsMax };
}

// Helper: Improvement Rate
function calculateCategory(rate, defaults, slow, fast) {
  let [min, max] = defaults;
  if (rate === 'slow') [min, max] = slow;
  if (rate === 'fast') [min, max] = fast;
  return { min, max };
}

// Fingers
function calculateFingers() {
  const percentage = parseInt(document.getElementById('fingersOffWallPercentage').value, 10);
  const rate = document.getElementById('fingersRate').value;
  if (isNaN(percentage) || !rate) return false;

  return calculateSplitCategory(rate, percentage, [6,9], [10,14], [15,24]);
}

// Upper Body Pull (ubp)
function calculateUBP() {
  const percentage = parseInt(document.getElementById('ubpOffWallPercentage').value, 10);
  const rate = document.getElementById('ubpRate').value;
  if (isNaN(percentage) || !rate) return false;

  return calculateSplitCategory(rate, percentage, [6,8], [9,11], [12,18]);
}

// Climbing Specific Aerobic Endurance
function calculateAerobic() {
  const rate = document.getElementById('aerobicRate').value;
  if (!rate) return false;
  return calculateCategory(rate, [40,60], [60,150], [150,300]);
}

// Climbing Specific Anaerobic Endurance
function calculateAnaerobic() {
  if (document.getElementById('anaerobicCategory').style.display === 'none') return null;

  const rate = document.getElementById('anaerobicRate').value;
  if (!rate) return false;

  let [min, max] = [20,40];
  if (rate === 'slow') [min, max] = [40,90];
  if (rate === 'fast') [min, max] = [90,120];

  return { min, max };
}

// Peak Modifier (LT3)
function calculatePeakAnaerobic(base) {
  const peakChoice = document.querySelector('input[name="peakRadios"]:checked');
  if (!peakChoice || peakChoice.value !== 'yes') return null;

  const weeks = parseInt(document.getElementById('weeksOutFromPeak').value, 10);
  if (isNaN(weeks)) return { lt2: base, lt3: null };

  let lt3Factor = 0.2;
  if (weeks === 5) lt3Factor = 0.8;

  const lt3 = {
    min: Math.ceil((base.min * lt3Factor) / 10),
    max: Math.ceil((base.max * lt3Factor) / 10)
  };

  const lt2 = {
    min: base.min - lt3.min,
    max: base.max - lt3.max
  };

  return { lt2, lt3 };
}

function calculateGAF() {
  const rate = document.getElementById('gafRate').value;
  if (!rate) return false;
  return calculateCategory(rate, [60,90], [90,150]);
}

// Score Map
const scoreMap = {
    strengthPowerRate: { maintain: 1, slow: 3, fast: 6 },
    aerobicRate: { maintain: 1, slow: 2, fast: 5 },
    anaerobicRate: { maintain: 3, slow: 5, fast: 7},
    gafRate: { maintain: 0, slow: 1 }
};

// S & P = Higher of Fingers and UBP
const rateRank = { maintain: 1, slow: 2, fast: 3 };

function getStrengthPowerRate() {
    const fingers= document.getElementById('fingersRate').value;
    const ubp= document.getElementById('ubpRate').value;

    return rateRank[fingers] >= rateRank[ubp] ? fingers : ubp;
};

function calculateScore() {
    let total = 0;

    // Strength & Power (combined)
    const spRate = getStrengthPowerRate();
    total += scoreMap.strengthPowerRate[spRate];

    // Aerobic
    const aerobicRate = document.getElementById('aerobicRate').value;
    total += scoreMap.aerobicRate[aerobicRate];

    // Anaerobic Rate
    const anaerobicVisible = document.getElementById('anaerobicCategory').style.display !== 'none';
    if (anaerobicVisible) {
        const anaerobicRate = document.getElementById('anaerobicRate').value;
        total += scoreMap.anaerobicRate[anaerobicRate];
    }

    // GAF
    const gafRate = document.getElementById('gafRate').value;
    total += scoreMap.gafRate[gafRate];

    return total;
}

function updateScoreDisplay() {
    const score = calculateScore();
    const box = document.getElementById('scoreDisplay');
    box.textContent = `Score: ${score} / 10`;
    box.classList.toggle('warning', score > 10);
}

// Display Results
function displayResults(fingers, ubp, aerobic, anaerobicLT2, anaerobicLT3, gaf) {
  let html = `
    <h3>Finger Training</h3>
    <p>Off-wall sets: ${fingers.offWallSetsMin}-${fingers.offWallSetsMax}</p>
    <p>On-wall sets: ${fingers.onWallSetsMin}-${fingers.onWallSetsMax}</p>

    <h3>Upper Body Pull Training</h3>
    <p>Off-wall sets: ${ubp.offWallSetsMin}-${ubp.offWallSetsMax}</p>
    <p>On-wall sets: ${ubp.onWallSetsMin}-${ubp.onWallSetsMax}</p>

    <h3>Aerobic Endurance</h3>
    <p>Minutes: ${aerobic.min}-${aerobic.max}</p>
  `;

  if (anaerobicLT2) {
    html += `
      <h3>Anaerobic Endurance (LT2)</h3>
      <p>Minutes: ${anaerobicLT2.min}-${anaerobicLT2.max}</p>
    `;
  }

  if (anaerobicLT3) {
    html += `
      <h3>Anaerobic Endurance (LT3)</h3>
      <p>Sets: ${anaerobicLT3.min}-${anaerobicLT3.max}</p>
    `;
  }

  html += `
    <h3>General Aerobic Fitness</h3>
    <p>Minutes: ${gaf.min}-${gaf.max}</p>
  `;

  document.getElementById('results').innerHTML = html;
}
