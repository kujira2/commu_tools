export class FlowChartManager {
    constructor() {
        this.chart = null;
        this.flowData = [];
        this.startTime = null;
        this.chartInitialized = false;
    }

    async initialize() {
        if (this.chartInitialized) return;

        try {
            // Chart.jsが利用可能になるまで待機
            while (typeof Chart === 'undefined') {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const canvas = document.getElementById('flowChart');
            if (!canvas) {
                console.error('Canvas element not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Canvas context not available');
                return;
            }

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: '流量',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        pointRadius: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '8700 20％刻み動作確認'
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            title: {
                                display: true,
                                text: '経過時間 (秒)'
                            },
                            min: 0,
                            max: 60
                        },
                        y: {
                            title: {
                                display: true,
                                text: '流量'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });

            this.chartInitialized = true;
            console.log('Chart initialized successfully');
        } catch (error) {
            console.error('Chart initialization error:', error);
        }
    }

    async startNewTest() {
        if (!this.chartInitialized) {
            await this.initialize();
        }
        this.startTime = Date.now();
        this.flowData = [];
        if (this.chart) {
            this.chart.data.datasets[0].data = [];
            this.chart.update('none');
        }
    }

    async updateChart(value) {
        if (!this.chartInitialized || !this.startTime || !this.chart) {
            console.log('Chart not ready for update');
            return;
        }

        const elapsed = (Date.now() - this.startTime) / 1000;
        this.flowData.push({
            x: elapsed,
            y: value
        });

        // 60秒を超えるデータを削除
        this.flowData = this.flowData.filter(point => point.x <= 60);

        this.chart.data.datasets[0].data = this.flowData;
        this.chart.update('none');
    }

    async setYAxisUnit(unit) {
        if (!this.chartInitialized || !this.chart) return;

        this.chart.options.scales.y.title.text = `流量 (${unit})`;
        this.chart.update('none');
    }

    async clear() {
        if (!this.chartInitialized || !this.chart) return;

        this.flowData = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update('none');
    }
}