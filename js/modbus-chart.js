export class ChartManager {
    constructor(canvasId, maxPoints = 60) {
        this.temperatureData = [];
        this.maxPoints = maxPoints;
        this.initChart(canvasId);
    }

    initChart(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '温度 (℃)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '時間'
                        },
                        ticks: {
                            maxTicksLimit: 12,  // 横軸の目盛りを最大15本に制限
                            source: 'auto',
                            autoSkip: true
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '温度 (℃)'
                        },
                        beginAtZero: false
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }

    updateChart(temperature) {
        const now = new Date();
        const timeString = now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0') + ':' +
            now.getSeconds().toString().padStart(2, '0');

        this.temperatureData.push({
            time: timeString,
            value: temperature
        });

        if (this.temperatureData.length > this.maxPoints) {
            this.temperatureData.shift();
        }

        const center = Math.round(temperature / 10) * 10;
        this.chart.options.scales.y.min = center - 15;
        this.chart.options.scales.y.max = center + 15;

        this.chart.data.labels = this.temperatureData.map(item => item.time);
        this.chart.data.datasets[0].data = this.temperatureData.map(item => item.value);
        this.chart.update();
    }

    clear() {
        this.temperatureData = [];
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update();
    }

    setMaxPoints(points) {
        this.maxPoints = points;
        this.clear();
    }
}
