// calendar.js - Calendar Widget Management
// Displays 7-day calendar view with weather and events

import { getConfig } from './config.js';
import { fetchCalendarEvents } from './api.js';
import { fetchWeatherData, getWeatherEmoji } from './weather.js';

/**
 * Format event date for display
 * @param {string} isoString - ISO date string
 * @param {boolean} allDay - Whether event is all-day
 * @returns {string} Formatted date string
 */
export function formatEventDate(isoString, allDay) {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (allDay) {
        return dateStr;
    }

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Check if today or tomorrow
    if (date.toDateString() === today.toDateString()) {
        return `Today ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tom ${timeStr}`;
    }

    return `${dateStr} ${timeStr}`;
}

/**
 * Update calendar widget display - 7-day view with weather and events
 */
export async function updateCalendar() {
    const CONFIG = getConfig();
    const calendarWidget = document.getElementById('calendarWidget');

    // Fetch weather and calendar data in parallel
    const [weatherData, events] = await Promise.all([
        fetchWeatherData(),
        CONFIG.calendar && CONFIG.calendar.enabled ? fetchCalendarEvents() : Promise.resolve(null)
    ]);

    if (!weatherData) {
        calendarWidget.innerHTML = '<div style="text-align: center; color: #999; font-size: 12px; padding: 10px;">Weather unavailable<br><small>Update CONFIG.weather</small></div>';
        return;
    }

    // Build 7-day view
    const today = new Date();
    const daysHtml = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dateStr = date.toDateString();

        // Get weather for this day
        const weatherCode = weatherData.daily.weather_code[i];
        const tempMax = Math.round(weatherData.daily.temperature_2m_max[i]);
        const tempMin = Math.round(weatherData.daily.temperature_2m_min[i]);
        const weatherEmoji = getWeatherEmoji(weatherCode);

        // Get events for this day
        const dayEvents = events ? events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === dateStr;
        }) : [];

        // Check if any event is a holiday (contains common holiday keywords)
        const holidayKeywords = ['holiday', 'christmas', 'thanksgiving', 'easter', 'new year', 'memorial', 'independence', 'labor day', 'veterans', 'mlk', 'presidents', 'halloween', 'valentines'];
        const hasHoliday = dayEvents.some(event =>
            holidayKeywords.some(keyword => event.title.toLowerCase().includes(keyword))
        );

        // Build events HTML for this day
        let eventsHtml = '';
        if (dayEvents.length > 0) {
            const eventsList = dayEvents.slice(0, 3).map(event => {
                const title = event.title.length > 18 ? event.title.substring(0, 18) + '...' : event.title;
                const timeStr = event.allDay ? '' : new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                return `<div class="day-event">${timeStr ? timeStr + ' ' : ''}${title}</div>`;
            }).join('');

            if (dayEvents.length > 3) {
                eventsHtml = eventsList + `<div class="day-event-more">+${dayEvents.length - 3} more</div>`;
            } else {
                eventsHtml = eventsList;
            }
        }

        const isToday = i === 0;
        const dayClass = isToday ? 'calendar-day today' : 'calendar-day';

        daysHtml.push(`
            <div class="${dayClass}">
                <div class="day-header">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${monthDay}</div>
                    ${hasHoliday ? '<div class="holiday-indicator">🎉</div>' : ''}
                </div>
                <div class="day-weather">
                    <div class="day-weather-emoji">${weatherEmoji}</div>
                    <div class="day-weather-temp">${tempMax}° / ${tempMin}°</div>
                </div>
                <div class="day-events">
                    ${eventsHtml || '<div class="no-events">No events</div>'}
                </div>
            </div>
        `);
    }

    const html = `
        <div class="calendar-header">This Week</div>
        <div class="calendar-week">
            ${daysHtml.join('')}
        </div>
    `;

    calendarWidget.innerHTML = html;

    // Parse emojis in calendar widget
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(calendarWidget, {
            folder: 'svg',
            ext: '.svg'
        });
    }
}
