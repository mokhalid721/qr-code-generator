// ==== Constants ====
const COOLDOWN_SECONDS = 3; // change this number if you want a different cooldown

// ==== Elements ====
const qrForm     = document.getElementById('qrForm');
const qrInput    = document.getElementById('qrInput');
const qrDisplay  = document.getElementById('qrDisplay');
const darkColor  = document.getElementById('darkColor');
const lightColor = document.getElementById('lightColor');
const sizeInput  = document.getElementById('size');
const sizeVal    = document.getElementById('sizeVal');
const ecLevel    = document.getElementById('ecLevel');
const downloadBtn= document.getElementById('downloadBtn');
const statusHint = document.getElementById('statusHint');

let lastQRCode   = null;
let isCoolingDown= false;
let cooldownTimer= null;

// ==== A11y/UX helpers ====
const hexToRgb = (hex) => {
  const h = hex.replace('#','');
  const [r,g,b] = h.length === 3
    ? [h[0]+h[0], h[1]+h[1], h[2]+h[2]]
    : [h.slice(0,2), h.slice(2,4), h.slice(4,6)];
  return [r,g,b].map(v => parseInt(v,16)/255);
};
const relLuminance = (hex) => {
  const [r,g,b] = hexToRgb(hex).map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4));
  return 0.2126*r + 0.7152*g + 0.0722*b;
};
const contrastRatio = (h1,h2) => {
  const L1 = relLuminance(h1), L2 = relLuminance(h2);
  const [hi,lo] = L1>L2 ? [L1,L2] : [L2,L1];
  return (hi+0.05)/(lo+0.05);
};
const isProbablyScannable = (fg,bg) =>
  contrastRatio(fg,bg) >= 4.5 && relLuminance(fg) < relLuminance(bg);

const mapEC = (val) => ({
  H: QRCode.CorrectLevel.H,
  Q: QRCode.CorrectLevel.Q,
  M: QRCode.CorrectLevel.M,
  L: QRCode.CorrectLevel.L
}[val] || QRCode.CorrectLevel.H);

const updateSizeLabel = () => sizeVal.textContent = `${sizeInput.value} px`;

const setStatus = (msg) => { statusHint.textContent = msg; };

const updateDownloadEnabled = () => {
  const hasQR = !!qrDisplay.querySelector('canvas, img');
  downloadBtn.disabled = !hasQR || isCoolingDown;
};

// ==== QR Generation ====
function generateQRCode() {
  qrDisplay.textContent = '';
  updateDownloadEnabled();
  setStatus('Generating…');

  const text = qrInput.value.trim();
  if (!text) {
    setStatus('Enter a URL then click Generate.');
    return;
  }

  const fg = darkColor.value;
  const bg = lightColor.value;

  if (!isProbablyScannable(fg, bg)) {
    setStatus('Colors too similar. Increase contrast or make foreground darker.');
    return;
  }

  const size = parseInt(sizeInput.value, 10) || 320;
  const ec   = mapEC(ecLevel.value);

  const qrCode = new QRCode(qrDisplay, {
    text: text,
    width: size,
    height: size,
    colorDark: fg,
    colorLight: bg,
    correctLevel: ec
  });
  lastQRCode = qrCode;

  // Enable download when node is actually ready
  const tryEnable = () => {
    const node = qrDisplay.querySelector('canvas, img');
    if (!node) return false;

    if (node.tagName === 'IMG') {
      if (node.complete && node.naturalWidth > 0) {
        setStatus('QR ready. You can download it.');
        updateDownloadEnabled();
        return true;
      }
      node.addEventListener('load', () => {
        setStatus('QR ready. You can download it.');
        updateDownloadEnabled();
      }, { once:true });
      return true;
    } else {
      setStatus('QR ready. You can download it.');
      updateDownloadEnabled();
      return true;
    }
  };

  if (!tryEnable()) {
    const obs = new MutationObserver(() => { if (tryEnable()) obs.disconnect(); });
    obs.observe(qrDisplay, { childList:true, subtree:true });
  }
}

// ==== Download with Cooldown ====
function startCooldown(seconds) {
  isCoolingDown = true;
  let remaining = seconds;

  const labelBase = 'Download';
  downloadBtn.textContent = `${labelBase} (${remaining})`;
  updateDownloadEnabled();

  cooldownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      isCoolingDown = false;
      downloadBtn.textContent = labelBase;
      updateDownloadEnabled();
      setStatus('Ready to download again.');
    } else {
      downloadBtn.textContent = `${labelBase} (${remaining})`;
    }
  }, 1000);
}

function downloadQRCode() {
  // Guard: if disabled or cooling down, just ignore
  if (downloadBtn.disabled || isCoolingDown) return;

  const node = qrDisplay.querySelector('canvas, img');
  if (!node) {
    setStatus('No QR code to download yet.');
    return;
  }

  // Disable immediately to prevent double-trigger
  isCoolingDown = true;
  updateDownloadEnabled();

  // Build data URL
  let dataUrl;
  if (node.tagName === 'CANVAS') {
    dataUrl = node.toDataURL('image/png');
  } else {
    dataUrl = node.src;
  }

  // Trigger download
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'MKs QR Code.png'; // required filename
  document.body.appendChild(a);
  a.click();
  a.remove();

  setStatus('Downloaded. Cooldown active…');
  startCooldown(COOLDOWN_SECONDS);
}

// ==== Debounced regen for sliders ====
let regenTimer = null;
const debounceRegen = (delay = 120) => {
  clearTimeout(regenTimer);
  regenTimer = setTimeout(() => {
    if (qrInput.value.trim()) generateQRCode();
  }, delay);
};

// ==== Events ====
qrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  generateQRCode();
});

[darkColor, lightColor].forEach(el => {
  el.addEventListener('input', () => debounceRegen(80));
});

sizeInput.addEventListener('input', () => {
  updateSizeLabel();
  debounceRegen(80);
});

ecLevel.addEventListener('change', () => debounceRegen(0));

downloadBtn.addEventListener('click', downloadQRCode);

// Init
updateSizeLabel();
setStatus('Enter a URL and click Generate to start.');
