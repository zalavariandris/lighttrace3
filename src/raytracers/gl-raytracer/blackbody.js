/**
 * Samples a wavelength based on the blackbody radiation spectrum for a given temperature.
 * This function uses Planck's law to calculate the spectral radiance for wavelengths in the visible spectrum
 * and then samples a wavelength based on the calculated radiance distribution.
 * 
 * @param {number} temperature - The temperature of the blackbody in Kelvin.
 * @param {number} samplesStep - The step size for sampling wavelengths within the visible spectrum. Default is 10 nm.
 * @returns {number} The sampled wavelength in nanometers.
 */

function sampleBlackbody(temperature, random_number, samplesStep=10)
{
    // Constants for Planck's law calculation
    const h = 6.62607015e-34; // Planck constant in m^2 kg / s
    const c = 2.99792458e8; // Speed of light in m / s
    const k = 1.380649e-23; // Boltzmann constant in m^2 kg s^-2 K^-1

    /**
     * Calculates the spectral radiance of a blackbody at a given wavelength and temperature using Planck's law.
     * 
     * @param {number} wavelength - The wavelength in nanometers.
     * @param {number} temperature - The temperature of the blackbody in Kelvin.
     * @returns {number} The spectral radiance in W/sr m^2 m.
     */
    function plancksLaw(wavelength, temperature) {
        wavelength *= 1e-9; // Convert wavelength from nanometers to meters for calculation
        const numerator = 2 * h * c**2;
        const denominator = (wavelength**5) * (Math.exp((h * c) / (wavelength * k * temperature)) - 1);
        return numerator / denominator;
    }

    // Define the visible spectrum range
    const minWavelength = 380; // 380 nm, start of visible spectrum
    const maxWavelength = 780; // 780 nm, end of visible spectrum

    // Calculate radiance for sampled wavelengths within the visible spectrum
    let totalRadiance = 0;
    const radianceMap = [];
    for (let wavelength = minWavelength; wavelength <= maxWavelength; wavelength += samplesStep) {
        const radiance = plancksLaw(wavelength, temperature);
        radianceMap.push({wavelength, radiance});
        totalRadiance += radiance;
    }

    // Normalize radiance values to get probabilities for each wavelength
    const probabilities = radianceMap.map(item => item.radiance / totalRadiance);

    // Calculate cumulative probabilities for sampling
    const cumulativeProbabilities = probabilities.reduce((acc, prob, i) => {
        if (i === 0) {
            acc.push(prob);
        } else {
            acc.push(prob + acc[i - 1]);
        }
        return acc;
    }, []);

    // Sample a wavelength based on the cumulative probabilities
    const sampledIndex = cumulativeProbabilities.findIndex(cumProb => random_number < cumProb);
    const sampledWavelength = radianceMap[sampledIndex].wavelength;

    return sampledWavelength;
}

export {sampleBlackbody};