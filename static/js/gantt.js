// 1. 차트 인스턴스를 저장할 전역 변수를 만듭니다. (초기값은 null)
let ganttChartInstance = null;

// 2. DOMContentLoaded 이벤트는 최초 한 번만 차트를 그리도록 합니다.
document.addEventListener('DOMContentLoaded', () => {
    // 최초 차트 그리기를 drawChart 함수에 맡깁니다.
    drawChart();
});

// 3. drawChart 함수를 수정하여 기존 차트를 파괴하도록 합니다.
function drawChart() {
    const chartCanvas = document.getElementById('gantt_chart_div');
    if (!chartCanvas) return;

    const projectId = chartCanvas.dataset.projectId;

    fetch(`/api/project/${projectId}/chartjs-data`)
        .then(response => response.json())
        .then(chartData => {
            if (chartData.error || chartData.labels.length === 0) {
                chartCanvas.parentElement.innerHTML = '<p>차트를 표시할 데이터가 없습니다.</p>';
                console.error(chartData.error || "No data");
                return;
            }

            const numberOfItems = chartData.labels.length;
            const newHeight = Math.max(150, numberOfItems * 40); 
            chartCanvas.style.height = `${newHeight}px`;
            
            // --- 바로 이 부분이 핵심입니다! ---
            // 만약 기존에 그려진 차트(ganttChartInstance)가 있다면,
            if (ganttChartInstance) {
                // 먼저 파괴합니다.
                ganttChartInstance.destroy();
            }
            // --- 여기까지 ---

            const ctx = chartCanvas.getContext('2d');
            
            // 새로 그린 차트를 전역 변수에 저장합니다.
            ganttChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: chartData.datasets
                },
                options: {
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                tooltipFormat: 'yyyy년 MM월 dd일 HH:mm',
                                displayFormats: { day: 'MM월 dd일' }
                            },
                            min: chartData.datasets[0].data[0].x[0],
                            max: chartData.datasets[0].data[0].x[1],
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            title: { display: true, text: '기간' },
                            ticks: { maxRotation: 0, minRotation: 0 }
                        },
                        y: {
                            grid: { display: false },
                            barPercentage: 0.9,
                            categoryPercentage: 0.8,
                            ticks: { font: { weight: 'bold' } }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const startDate = new Date(context.raw.x[0]);
                                    const endDate = new Date(context.raw.x[1]);
                                    return `${context.dataset.label}: ${startDate.toLocaleString()} ~ ${endDate.toLocaleString()}`;
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('차트 데이터 로딩 실패:', error));
}