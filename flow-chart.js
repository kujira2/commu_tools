export class FlowChartManager {
    constructor() {
        this.chart = null;
        this.flowData = [];
        this.startTime = null;
        this.chartInitialized = false;
        this.maxRange = 0;  // 最大レンジを保持する変数を追加
    }

    async initialize() {
        if (this.chartInitialized) return;

        try {
            while (typeof Chart === 'undefined') {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const canvas = document.getElementById('flowChart');
            if (!canvas) {
                console.error('Canvas element not found');
                return;
            }

            this.chart = new Chart(canvas, {
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
                            text: '流量モニタ'
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
                            max: 70
                        },
                        y: {
                            title: {
                                display: true,
                                text: '流量'
                            },
                            beginAtZero: true,
                            max: this.maxRange * 1.2  // 最大レンジの1.2倍を設定
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

    // 新しいテストを開始するメソッド
    async resetChart() {
        if (this.chart) {
            this.flowData = [];
            this.startTime = Date.now();
            this.chart.data.datasets[0].data = [];
            this.chart.update('none');
        }
    }
    async updateChart(value) {
        if (!this.chartInitialized || !this.chart) {
            await this.initialize();
        }

        if (!this.startTime) {
            this.startTime = Date.now();
        }

        const elapsed = (Date.now() - this.startTime) / 1000;
        this.flowData.push({
            x: elapsed,
            y: value
        });

        // 70秒を超えるデータを削除
        this.flowData = this.flowData.filter(point => point.x <= 70);

        this.chart.data.datasets[0].data = this.flowData;
        this.chart.update('none');
        console.log(`Updated chart with value: ${value} at time: ${elapsed}`);  // デバッグ用ログ
    }

    // 流量レンジを設定するメソッドを追加
    setMaxRange(range) {
        this.maxRange = range;
        if (this.chart && this.chart.options.scales.y) {
            this.chart.options.scales.y.max = range * 1.2;
            this.chart.update('none');
        }
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