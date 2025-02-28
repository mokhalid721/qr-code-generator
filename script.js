// Select elements
const qrForm = document.getElementById('qrForm');
const qrInput = document.getElementById('qrInput');
const qrDisplay = document.getElementById('qrDisplay');
const darkColor = document.getElementById('darkColor');
const lightColor = document.getElementById('lightColor');
const downloadBtn = document.getElementById('downloadBtn');

// Track the last generated QR element
let lastQRCode = null;

// Generate button event
qrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  generateQRCode();
});

// Download button event
downloadBtn.addEventListener('click', downloadQRCode);

/**
 * Generates a new QR Code with custom colors
 */
function generateQRCode() {
  // Clear display and reset download button
  qrDisplay.innerHTML = '';
  downloadBtn.disabled = true;
  lastQRCode = null;

  const url = qrInput.value.trim();
  if (!url) {
    alert('Please enter a valid URL');
    return;
  }

  // Create QR Code
  const qrCode = new QRCode(qrDisplay, {
    text: url,
    width: 250,
    height: 250,
    colorDark: darkColor.value,
    colorLight: lightColor.value,
    correctLevel: QRCode.CorrectLevel.H
  });

  // Store reference (helps in download)
  lastQRCode = qrCode;

  // Enable download button once QR is rendered
  // We might need a small delay to ensure the <img> or <canvas> is actually generated
  setTimeout(() => {
    downloadBtn.disabled = false;
  }, 500);
}

/**
 * Downloads the generated QR Code as an image
 */
function downloadQRCode() {
  // Grab the QR code <img> or <canvas> from the container
  const qrImg = qrDisplay.querySelector('img') || qrDisplay.querySelector('canvas');
  if (!qrImg) {
    alert('No QR code to download!');
    return;
  }

  // If it's a canvas, convert to data URL
  let dataUrl;
  if (qrImg.tagName.toLowerCase() === 'canvas') {
    dataUrl = qrImg.toDataURL('image/png');
  } else {
    // It's an <img>, just get its src
    dataUrl = qrImg.src;
  }

  // Create a temporary link to download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'qr-code.png';
  link.click();
  link.remove();
}