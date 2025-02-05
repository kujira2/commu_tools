// グローバル変数
let port = null;
let charts = {};
let isRunning = false;
let measurementInterval = 60;
let receivedBuffer = '';
let isConnected = false;
let isMeasuring = false;
let currentReader = null;

// シリアル通信の設定
const serialOptions = {
    baudRate: 19200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none"
};

// 初期化
function initialize() {
    createLineSelectors();
    createGraphContainer();

    // イベントリスナーの設定
    document.getElementById('connectBtn').addEventListener('click', toggleSerialConnection);
    document.getElementById('measureBtn').addEventListener('click', toggleMeasurement);
    document.getElementById('intervalInput').addEventListener('input', function(e) {
        measurementInterval = parseInt(e.target.value) || 60;
    });
}

// Line選択UIの生成
function createLineSelectors() {
    const container = document.getElementById('lineSelectors');
    container.innerHTML = '';
    
    for (let line = 1; line <= 5; line++) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `line-${line}`;
        checkbox.value = line;
        checkbox.checked = false;
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` Line ${line}`));
        container.appendChild(label);
    }
}

// グラフコンテナの作成
function createGraphContainer() {
    const container = document.getElementById('graphContainer');
    container.innerHTML = '';

    for (let line = 1; line <= 5; line++) {
        const lineContainer = document.createElement('div');
        lineContainer.id = `line-${line}-graphs`;
        lineContainer.className = 'graph-card';
        lineContainer.innerHTML = `<h3>Line ${line}</h3>`;
        
        const sensorContainer = document.createElement('div');
        sensorContainer.className = 'sensor-grid';
        
        for (let sensor = 1; sensor <= 10; sensor++) {
            const sensorDiv = document.createElement('div');
            sensorDiv.className = 'sensor-graph';
            
            const canvas = document.createElement('canvas');
            canvas.id = `chart-line${line}-sensor${sensor}`;
            sensorDiv.appendChild(canvas);
            
            charts[`line${line}-sensor${sensor}`] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: `センサー${sensor}`,
                        data: [],
                        borderColor: `hsl(${sensor * 36}, 70%, 50%)`,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            sensorContainer.appendChild(sensorDiv);
        }
        
        lineContainer.appendChild(sensorContainer);
        container.appendChild(lineContainer);
    }
}

// 16進数文字列をデコード
function atoh(str) {
    const c = str.charCodeAt(0);
    if (c >= 0x30 && c <= 0x39) return c - 0x30;
    if (c >= 0x41 && c <= 0x46) return c - 0x37;
    if (c >= 0x61 && c <= 0x66) return c - 0x57;
    return 0;
}