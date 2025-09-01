// Elements
const qrForm = document.getElementById('qrForm');
const qrInput = document.getElementById('qrInput');
const qrDisplay = document.getElementById('qrDisplay');
const darkColor = document.getElementById('darkColor');
const lightColor = document.getElementById('lightColor');
const downloadBtn = document.getElementById('downloadBtn');

let lastQRCode = null;

// ---- Color contrast helpers (keeps QR scannable) ----
const hexToRgb = (hex) => {
  const h = hex.replace('#','');
  const [r,g,b] = h.length === 3
    ? [h[0]+h[0], h[1]+h[1], h[2]+h[2]]
    : [h.slice(0,2), h.slice(2,4), h.slice(4,6)];
  return [r,g,b].map(v => parseInt(v, 16) / 255);
};

const relLuminance = (hex) => {
  const [r,g,b] = hexToRgb(hex).map(c => (
    c <= 0.03928 ? c/12.92 : Math.pow((c + 0.055)/1.055, 2.4)
  ));
  return 0.2126*r + 0.7152*g + 0.0722*b;
};

const contrastRatio = (hex1, hex2) => {
  const L1 = relLuminance(hex1);
  const L2 = relLuminance(hex2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

const isProbablyScannable = (fg, bg) => {
  return contrastRatio(fg, bg) >= 4.5 && relLuminance(fg) < relLuminance(bg);
};

// ---- Core ----
function generateQRCode() {
  qrDisplay.textContent = ''; // clear container
  downloadBtn.disabled = true;
  lastQRCode = null;

  const text = qrInput.value.trim();
  if (!text) {
    alert('Please enter a URL.');
    return;
  }

  const fg = darkColor.value;
  const bg = lightColor.value;

  if (!isProbablyScannable(fg, bg)) {
    alert('Foreground and background are too similar. Pick higher-contrast colors.');
    return;
  }

  // Create QR
  const qrCode = new QRCode(qrDisplay, {
    text,
    width: 256,
    height: 256,
    colorDark: fg,
    colorLight: bg,
    correctLevel: QRCode.CorrectLevel.H
  });
  lastQRCode = qrCode;

  // Enable download when the actual node is ready
  const enableWhenReady = () => {
    const node = qrDisplay.querySelector('canvas, img');
    if (!node) return false;

    if (node.tagName === 'IMG') {
      if (node.complete && node.naturalWidth > 0) {
        downloadBtn.disabled = false;
        qrDisplay.setAttribute('aria-label', 'QR code ready');
        return true;
      }
      node.addEventListener('load', () => {
        downloadBtn.disabled = false;
        qrDisplay.setAttribute('aria-label', 'QR code ready');
      }, { once: true });
      return true;
    } else {
      // canvas is immediate
      downloadBtn.disabled = false;
      qrDisplay.setAttribute('aria-label', 'QR code ready');
      return true;
    }
  };

  if (!enableWhenReady()) {
    const obs = new MutationObserver(() => {
      if (enableWhenReady()) obs.disconnect();
    });
    obs.observe(qrDisplay, { childList: true, subtree: true });
  }
}

function downloadQRCode() {
  const node = qrDisplay.querySelector('img, canvas');
  if (!node) {
    alert('No QR code to download!');
    return;
  }

  let dataUrl;
  if (node.tagName === 'CANVAS') {
    dataUrl = node.toDataURL('image/png');
  } else {
    dataUrl = node.src; // data URL from the lib
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'MKs QR Code.png'; // <- requested filename
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---- Events ----
qrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  generateQRCode();
});

// Live re-generate on color change (nice UX)
[darkColor, lightColor].forEach(inp => {
  inp.addEventListener('input', () => {
    if (qrInput.value.trim()) generateQRCode();
  });
});

downloadBtn.addEventListener('click', downloadQRCode);
