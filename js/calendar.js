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
 * Get nth weekday of a month (e.g. 3rd Monday of January)
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} weekday - 0=Sun, 1=Mon ... 6=Sat
 * @param {number} n - 1-indexed (use -1 for last)
 */
function getNthWeekday(year, month, weekday, n) {
    if (n === -1) {
        // Last occurrence: start from end of month
        const lastDay = new Date(year, month + 1, 0);
        const diff = (lastDay.getDay() - weekday + 7) % 7;
        return new Date(year, month, lastDay.getDate() - diff);
    }
    const first = new Date(year, month, 1);
    const diff = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + diff + (n - 1) * 7);
}

/**
 * Returns a Map of dateString → holiday name for US federal holidays in the given year
 */
function getUSHolidays(year) {
    const holidays = new Map();
    const add = (date, name) => holidays.set(date.toDateString(), name);

    // Fixed-date holidays
    add(new Date(year, 0, 1), "New Year's Day 🎉");
    add(new Date(year, 6, 4), "Independence Day 🇺🇸");
    add(new Date(year, 10, 11), "Veterans Day 🎖️");
    add(new Date(year, 11, 25), "Christmas Day 🎄");

    // Floating holidays
    add(getNthWeekday(year, 0, 1, 3), "MLK Day ✊");          // 3rd Monday of Jan
    add(getNthWeekday(year, 1, 1, 3), "Presidents Day 🏛️");   // 3rd Monday of Feb
    add(getNthWeekday(year, 4, 1, -1), "Memorial Day 🎗️");    // Last Monday of May
    add(getNthWeekday(year, 8, 1, 1), "Labor Day 👷");         // 1st Monday of Sep
    add(getNthWeekday(year, 9, 1, 2), "Columbus Day ⛵");      // 2nd Monday of Oct
    add(getNthWeekday(year, 10, 4, 4), "Thanksgiving 🦃");     // 4th Thursday of Nov

    return holidays;
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

    // Pre-build US holiday map for the years covered by our 7-day window
    const usHolidays = new Map([
        ...getUSHolidays(today.getFullYear()),
        ...getUSHolidays(today.getFullYear() + 1)
    ]);

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

        // Check for US federal holiday
        const usHolidayName = usHolidays.get(dateStr);

        // Check if any calendar event is a holiday (contains common holiday keywords)
        const holidayKeywords = ['holiday', 'christmas', 'thanksgiving', 'easter', 'new year', 'memorial', 'independence', 'labor day', 'veterans', 'mlk', 'presidents', 'halloween', 'valentines'];
        const hasCalendarHoliday = dayEvents.some(event =>
            holidayKeywords.some(keyword => event.title.toLowerCase().includes(keyword))
        );
        const hasHoliday = usHolidayName || hasCalendarHoliday;
        const holidayLabel = usHolidayName || '';

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
                    ${hasHoliday ? `<div class="holiday-indicator" title="${holidayLabel}">🎉</div>` : ''}
                </div>
                ${holidayLabel ? `<div class="holiday-name">${holidayLabel}</div>` : ''}
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
