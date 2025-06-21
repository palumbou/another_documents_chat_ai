// General utility functions

// Check system memory
async function checkMemory() {
  try {
    const res = await fetch('/system/memory');
    const memory = await res.json();
    const memoryText = `💾 RAM: ${memory.used_gb}/${memory.total_gb}GB (${memory.percent_used.toFixed(1)}%)`;
    document.getElementById('memory-info').innerText = memoryText;
  } catch {
    document.getElementById('memory-info').innerText = '💾 Memory: Error';
  }
}

// Initialize utility functions
function initializeUtils() {
  checkMemory();
  setInterval(checkMemory, 30000);
}
