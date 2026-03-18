// weather.js - Weather Data & Display Management
// Fetches and displays current weather conditions and hourly forecast

import { getConfig } from './config.js';

/**
 * Fetch weather data from Open-Meteo API
 * @returns {Object|null} Weather data or null if unavailable
 */
export async function fetchWeatherData() {
    const CONFIG = getConfig();
    if (!CONFIG.weather || !CONFIG.weather.latitude || !CONFIG.weather.longitude) {
        console.log('Weather location not configured');
        return null;
    }

    try {
        const { latitude, longitude, timezone } = CONFIG.weather;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=${timezone}&temperature_unit=fahrenheit&forecast_days=7`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

/**
 * Map weather code to emoji
 * @param {number} code - Weather code from API
 * @returns {string} Weather emoji
 */
export function getWeatherEmoji(code) {
    const weatherCodes = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌦️', 53: '🌦️', 55: '🌦️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        71: '🌨️', 73: '🌨️', 75: '🌨️',
        80: '🌦️', 81: '🌦️', 82: '🌦️',
        95: '⛈️', 96: '⛈️', 99: '⛈️'
    };
    return weatherCodes[code] || '🌤️';
}

/**
 * Update weather widget display (current conditions + hourly forecast)
 */
export async function updateWeather() {
    const weatherData = await fetchWeatherData();
    if (!weatherData) {
        document.getElementById('weatherWidget').innerHTML = '<div style="text-align: center; color: #999; font-size: 12px;">Weather unavailable<br><small>Update CONFIG.weather</small></div>';
        return;
    }

    const current = weatherData.current;
    const hourly = weatherData.hourly;
    const currentHour = new Date().getHours();

    // Get next 6 hours of forecast
    const forecastHtml = [];
    for (let i = 0; i < 6; i++) {
        const hour24 = (currentHour + i) % 24;
        const hour12 = hour24 % 12 || 12; // Convert 0 to 12
        const ampm = hour24 < 12 ? 'AM' : 'PM';
        const temp = Math.round(hourly.temperature_2m[currentHour + i]);
        const emoji = getWeatherEmoji(hourly.weather_code[currentHour + i]);
        forecastHtml.push(`
            <div class="hourly-forecast-item">
                <div class="forecast-hour">${hour12} ${ampm}</div>
                <div class="forecast-emoji">${emoji}</div>
                <div class="forecast-temp">${temp}°</div>
            </div>
        `);
    }

    const html = `
        <div class="weather-current">
            <div class="weather-emoji-large">${getWeatherEmoji(current.weather_code)}</div>
            <div class="weather-temp-large">${Math.round(current.temperature_2m)}°</div>
            <div class="weather-humidity">${current.relative_humidity_2m}% humidity</div>
            <div class="weather-label">Right Now</div>
        </div>
        <div class="hourly-forecast">
            ${forecastHtml.join('')}
        </div>
    `;

    document.getElementById('weatherWidget').innerHTML = html;

    // Parse emojis in weather widget
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(document.getElementById('weatherWidget'), {
            folder: 'svg',
            ext: '.svg'
        });
    }
}
