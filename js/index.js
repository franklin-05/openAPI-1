document.addEventListener('DOMContentLoaded', () => {
    const temperatureBtn = document.getElementById('temperatureBtn');
    const conditionsBtn = document.getElementById('conditionsBtn');
    const weatherResultsDiv = document.getElementById('weatherResults');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Define coordinates for representative Tri-State cities
    const triStateCities = [
        { name: "New York City", lat: 40.7128, lon: -74.0060, timezone: "America/New_York" },
        { name: "Newark", lat: 40.7357, lon: -74.1724, timezone: "America/New_York" },
        { name: "Stamford", lat: 41.0534, lon: -73.5387, timezone: "America/New_York" }
    ];

    // Event Listeners for navigation buttons
    temperatureBtn.addEventListener('click', () => fetchAndDisplayWeather('temperature'));
    conditionsBtn.addEventListener('click', () => fetchAndDisplayWeather('conditions'));

    // Initial message
    weatherResultsDiv.innerHTML = '<p>Click a button above to see specific weather details for the Tri-State Area.</p>';

    async function fetchAndDisplayWeather(dataType) {
        weatherResultsDiv.innerHTML = '<p>Loading weather data for the Tri-State Area...</p>';
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';

        try {
            let allWeatherData = [];
            let apiParams = ''; // To hold the specific API parameters for the request

            if (dataType === 'temperature') {
                // Request current temp for "Today's Current" and daily max/min for forecast
                apiParams = 'current=temperature_2m&daily=temperature_2m_max,temperature_2m_min';
            } else if (dataType === 'conditions') {
                // Request current weather code for "Today's Current" and daily weather code for forecast
                apiParams = 'current=weather_code&daily=weather_code';
            } else {
                errorMessageDiv.textContent = 'Invalid data type requested.';
                errorMessageDiv.style.display = 'block';
                weatherResultsDiv.innerHTML = '<p>Click a button above to see specific weather details for the Tri-State Area.</p>';
                return;
            }

            for (const city of triStateCities) {
                // Construct URL with only the needed parameters
                // Always fetch 3 days for daily forecast regardless of current display type
                const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&${apiParams}&temperature_unit=fahrenheit&timezone=${city.timezone}&forecast_days=3`;

                const response = await fetch(weatherApiUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch weather for ${city.name} (${response.status})`);
                }
                const data = await response.json();
                allWeatherData.push({ city: city.name, data: data });
            }

            displayWeather(allWeatherData, dataType);

        } catch (error) {
            console.error('Error fetching weather data:', error);
            errorMessageDiv.textContent = `An error occurred: ${error.message}. Please try again later.`;
            errorMessageDiv.style.display = 'block';
            weatherResultsDiv.innerHTML = '<p>Click a button above to see specific weather details for the Tri-State Area.</p>';
        }
    }

    function displayWeather(allCityData, dataType) {
        let htmlContent = '';

        if (allCityData.length === 0) {
            weatherResultsDiv.innerHTML = '<p>No weather data available.</p>';
            return;
        }

        allCityData.forEach(cityData => {
            const { city, data } = cityData;

            if (!data || !data.current || !data.daily || data.daily.time.length === 0) {
                htmlContent += `<div class="city-weather">
                                    <h2>${city}</h2>
                                    <p>No ${dataType} data available.</p>
                                </div>`;
                return;
            }

            const current = data.current;
            const daily = data.daily;

            htmlContent += `
                <div class="city-weather">
                    <h2>${city}</h2>
            `;

            // --- Display CURRENT day's information (always using current object) ---
            htmlContent += `<h3>Today's ${dataType === 'temperature' ? 'Temperature' : 'Conditions'}:</h3>`;
            htmlContent += `<div class="weather-detail">`;
            if (dataType === 'temperature') {
                const currentTemp = current ? current.temperature_2m : 'N/A';
                // Also get today's daily min/max for a complete "Today" summary
                const todayMaxTemp = daily.temperature_2m_max ? daily.temperature_2m_max[0] : 'N/A';
                const todayMinTemp = daily.temperature_2m_min ? daily.temperature_2m_min[0] : 'N/A';
                htmlContent += `<p><strong>Current:</strong> ${currentTemp}°F</p>`;
                htmlContent += `<p><strong>Today's High:</strong> ${todayMaxTemp}°F</p>`;
                htmlContent += `<p><strong>Today's Low:</strong> ${todayMinTemp}°F</p>`;
            } else if (dataType === 'conditions') {
                const currentWeatherCode = current ? current.weather_code : null;
                const weatherDescription = currentWeatherCode !== null ? getWeatherDescription(currentWeatherCode) : 'N/A';
                 // Also get today's daily conditions for a complete "Today" summary
                const todayWeatherCode = daily.weather_code ? daily.weather_code[0] : null;
                const todayDescription = todayWeatherCode !== null ? getWeatherDescription(todayWeatherCode) : 'N/A';
                htmlContent += `<p><strong>Current:</strong> ${weatherDescription}</p>`;
                htmlContent += `<p><strong>Today's Forecast:</strong> ${todayDescription}</p>`;
            }
            htmlContent += `</div>`; // Close weather-detail div


            // --- Display NEXT 2 days' information (starting from daily[1]) ---
            htmlContent += `<h3>Next 2 Days Forecast:</h3>`;
            // Loop from index 1 to get tomorrow and the day after
            if (daily && daily.time && daily.time.length > 1) { // Ensure there's at least tomorrow's data
                for (let i = 1; i < Math.min(3, daily.time.length); i++) { // Loop for tomorrow and the day after (indices 1 and 2)
                    const date = new Date(daily.time[i]);
                    htmlContent += `<div class="daily-forecast-item">`;
                    htmlContent += `<p><strong>${date.toDateString()}:</strong></p>`;

                    if (dataType === 'temperature') {
                        const maxTemp = daily.temperature_2m_max ? daily.temperature_2m_max[i] : 'N/A';
                        const minTemp = daily.temperature_2m_min ? daily.temperature_2m_min[i] : 'N/A';
                        htmlContent += `<p>High: ${maxTemp}°F, Low: ${minTemp}°F</p>`;
                    } else if (dataType === 'conditions') {
                        const dailyWeatherCode = daily.weather_code ? daily.weather_code[i] : null;
                        const dailyDescription = dailyWeatherCode !== null ? getWeatherDescription(dailyWeatherCode) : 'N/A';
                        htmlContent += `<p>Conditions: ${dailyDescription}</p>`;
                    }
                    htmlContent += `</div>`;
                }
            } else {
                htmlContent += '<p>No further daily forecast available.</p>';
            }

            htmlContent += `</div>`; // Close city-weather div
        });

        weatherResultsDiv.innerHTML = htmlContent;
    }

    // Function to map Open-Meteo WMO Weather Codes to descriptions
    function getWeatherDescription(code) {
        switch (code) {
            case 0: return 'Clear sky';
            case 1: return 'Mainly clear';
            case 2: return 'Partly cloudy';
            case 3: return 'Overcast';
            case 45: return 'Fog';
            case 48: return 'Depositing rime fog';
            case 51: return 'Light drizzle';
            case 53: return 'Moderate drizzle';
            case 55: return 'Dense drizzle';
            case 56: return 'Light freezing drizzle';
            case 57: return 'Dense freezing drizzle';
            case 61: return 'Slight rain';
            case 63: return 'Moderate rain';
            case 65: return 'Heavy rain';
            case 66: return 'Light freezing rain';
            case 67: return 'Heavy freezing rain';
            case 71: return 'Light snow fall';
            case 73: return 'Moderate snow fall';
            case 75: return 'Heavy snow fall';
            case 77: return 'Snow grains';
            case 80: return 'Light rain showers';
            case 81: return 'Moderate rain showers';
            case 82: return 'Violent rain showers';
            case 85: return 'Light snow showers';
            case 86: return 'Heavy snow showers';
            case 95: return 'Thunderstorm';
            case 96: // Fallthrough
            case 99: return 'Thunderstorm with heavy hail';
            default: return 'Conditions unknown';
        }
    }
});