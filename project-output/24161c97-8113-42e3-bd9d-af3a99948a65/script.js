function checkDecibelLevel() {
    // Simulate checking the decibel level
    const level = Math.floor(Math.random() * 100);
    document.getElementById('level-output').innerText = `Current dB Level: ${level} dB`;
}