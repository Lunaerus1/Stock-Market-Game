// Stock Prediction Game
// Uses Alpha Vantage TIME_SERIES_DAILY to drive real market data.

(function() {
  const API_KEY = '313I8530EIVO6DAQ';
  const AV_BASE = 'https://www.alphavantage.co/query';

  // DOM elements
  const form = document.getElementById('ticker-form');
  const input = document.getElementById('ticker-input');
  const loadBtn = document.getElementById('load-btn');
  const errorEl = document.getElementById('error');
  const gameEl = document.getElementById('game');
  const symbolEl = document.getElementById('symbol');
  const currentDateEl = document.getElementById('current-date');
  const currentCloseEl = document.getElementById('current-close');
  const scoreEl = document.getElementById('score');
  const roundMsgEl = document.getElementById('round-msg');
  const predictUpBtn = document.getElementById('predict-up');
  const predictDownBtn = document.getElementById('predict-down');
  const endGameBtn = document.getElementById('end-game');

  const ctx = document.getElementById('chart');
  let chart = null;

  // Game state
  let timeSeries = []; // [{date: 'YYYY-MM-DD', close: number}] sorted ascending by date
  let symbol = '';
  let score = 0;
  let currentIndex = -1; // index pointing to current date (latest shown)

  function setLoading(isLoading) {
    loadBtn.disabled = isLoading;
    input.disabled = isLoading;
    loadBtn.textContent = isLoading ? 'Loading…' : 'Load';
  }

  function showError(message) {
    errorEl.textContent = message || '';
  }

  function clearError() {
    showError('');
  }

  function formatDate(d) {
    const date = new Date(d + 'T00:00:00');
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async function fetchDailySeries(ticker) {
    const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error fetching data');
    const data = await res.json();

    if (data.Note) {
      throw new Error('API limit reached. Please wait a minute and try again.');
    }
    if (data['Error Message']) {
      throw new Error('Invalid symbol. Please try another.');
    }
    const series = data['Time Series (Daily)'];
    if (!series || typeof series !== 'object') {
      throw new Error('No data returned for this symbol.');
    }

    const points = Object.keys(series)
      .map(date => {
        const close = Number(series[date]['4. close']);
        return { date, close };
      })
      .filter(p => Number.isFinite(p.close))
      .sort((a, b) => a.date.localeCompare(b.date)); // ascending

    if (points.length < 30) {
      throw new Error('Insufficient history for this symbol. Try another.');
    }
    return points;
  }

  function isWeekday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    return day !== 0 && day !== 6; // Sun=0, Sat=6
  }

  function chooseRandomStartDate(points) {
    // Pick a start date between 7 and 100 calendar days ago inclusive, but ensure it's a trading day.
    const today = new Date();
    const minAgo = 7; // at least 1 week before today
    const maxAgo = 100; // not more than 100 days before today

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - maxAgo);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() - minAgo);

    const inRange = points.filter(p => {
      const d = new Date(p.date + 'T00:00:00');
      return d >= new Date(minDate.toDateString()) && d <= new Date(maxDate.toDateString());
    });

    // Filter to weekdays in case of special exchange holidays that removed all weekdays in a tiny symbol
    const candidates = inRange.filter(p => isWeekday(p.date));
    if (candidates.length === 0) {
      throw new Error('Could not find a valid start date. Try again.');
    }
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx].date;
  }

  function buildInitialWindow(points, startDate) {
    // Include 7 days before start date, but only trading days available in the series
    const startIdx = points.findIndex(p => p.date === startDate);
    if (startIdx < 0) throw new Error('Start date not found in series');

    const windowStart = Math.max(0, startIdx - 7);
    const initial = points.slice(windowStart, startIdx + 1); // includes start date
    return { initial, startIdx };
  }

  function initChart(labels, values) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Close',
            data: values,
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Date' },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: 'Close Price' },
            ticks: { callback: v => `$${Number(v).toFixed(2)}` },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Close: $${Number(ctx.parsed.y).toFixed(2)}`,
            },
          },
        },
      },
    });
  }

  function updateTopStats(index) {
    const point = timeSeries[index];
    currentDateEl.textContent = point ? point.date : '—';
    currentCloseEl.textContent = point ? `$${point.close.toFixed(2)}` : '—';
    scoreEl.textContent = String(score);
    symbolEl.textContent = symbol;
  }

  function enablePrediction(enabled) {
    predictUpBtn.disabled = !enabled;
    predictDownBtn.disabled = !enabled;
  }

  function appendNextPoint() {
    // Append next chronological day from series to chart
    const nextIdx = currentIndex + 1;
    if (nextIdx >= timeSeries.length) {
      roundMsgEl.textContent = 'No more data available.';
      enablePrediction(false);
      return false;
    }
    const next = timeSeries[nextIdx];
    chart.data.labels.push(next.date);
    chart.data.datasets[0].data.push(next.close);
    chart.update();
    currentIndex = nextIdx;
    updateTopStats(currentIndex);
    return true;
  }

  function startGameForSymbol(points, startDate) {
    timeSeries = points;
    score = 0;
    roundMsgEl.textContent = '';

    const { initial, startIdx } = buildInitialWindow(points, startDate);
    const labels = initial.map(p => p.date);
    const values = initial.map(p => p.close);
    initChart(labels, values);
    currentIndex = startIdx; // current date is the starting date
    updateTopStats(currentIndex);
    enablePrediction(true);
  }

  async function handleLoadTicker(evt) {
    evt.preventDefault();
    clearError();
    roundMsgEl.textContent = '';
    enablePrediction(false);

    const ticker = (input.value || '').trim().toUpperCase();
    if (!ticker) {
      showError('Please enter a ticker symbol.');
      return;
    }
    setLoading(true);
    try {
      const points = await fetchDailySeries(ticker);
      symbol = ticker;
      const startDate = chooseRandomStartDate(points);
      gameEl.classList.remove('hidden');
      startGameForSymbol(points, startDate);
    } catch (err) {
      showError(err.message || 'Failed to load data.');
      gameEl.classList.add('hidden');
    } finally {
      setLoading(false);
    }
  }

  function handlePrediction(direction) {
    // direction: 'up' | 'down'
    // We evaluate the move from currentIndex (start date) to next day.
    const baseline = timeSeries[currentIndex];
    const next = timeSeries[currentIndex + 1];
    if (!next) {
      roundMsgEl.textContent = 'No more future data to reveal.';
      enablePrediction(false);
      return;
    }

    const wentUp = next.close > baseline.close;
    const correct = (direction === 'up' && wentUp) || (direction === 'down' && !wentUp);
    if (correct) {
      score += 1;
      roundMsgEl.textContent = `Correct! Next close: $${next.close.toFixed(2)} (${next.date}).`;
    } else {
      roundMsgEl.textContent = `Wrong. Next close: $${next.close.toFixed(2)} (${next.date}).`;
    }

    // Reveal next point and advance current date
    appendNextPoint();
    enablePrediction(true);
  }

  function endGame() {
    enablePrediction(false);
    roundMsgEl.textContent = `Game ended. Final score: ${score}`;
  }

  // Event listeners
  form.addEventListener('submit', handleLoadTicker);
  predictUpBtn.addEventListener('click', () => handlePrediction('up'));
  predictDownBtn.addEventListener('click', () => handlePrediction('down'));
  endGameBtn.addEventListener('click', endGame);
})();

