import {myrandom} from "../utils.js"

/**
 * Samples a wavelength based on the blackbody radiation spectrum for a given temperature.
 * This function uses Planck's law to calculate the spectral radiance for wavelengths in the visible spectrum
 * and then samples a wavelength based on the calculated radiance distribution.
 * 
 * @param {number} temperature - The temperature of the blackbody in Kelvin.
 * @param {number} samplesStep - The step size for sampling wavelengths within the visible spectrum. Default is 10 nm.
 * @returns {number} The sampled wavelength in nanometers.
 */
function sampleBlackbody(temperature, random_number, samplesStep=100)
{
    // return getRandomWavelength(temperature)
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
    const minWavelength = 300; // 400 nm, start of visible spectrum
    const maxWavelength = 700; // 700 nm, end of visible spectrum

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
    let sampledWavelength = radianceMap[sampledIndex].wavelength;
    // since probability sample steps will return discreet wavelength values. spread the waveleneth between this steps with a random number
    sampledWavelength+=Math.random()*samplesStep;

    //
    return sampledWavelength;
}

function sampleWhite(){
    return Math.random()*400+300 //[300, 700]
}

function sampleWavelength(lightComponent)
{
    // return sampleWhite();
    return sampleBlackbody(lightComponent.temperature, Math.random());
}

function samplePointLight(entity, lightSamples)
{
    return Array.from({length: lightSamples}).map((_, k)=>{
        const angle = Math.random()*Math.PI*2+Math.PI/8.0;
        return {
            x:entity.transform.translate.x, 
            y:entity.transform.translate.y, 
            dx:Math.cos(angle), 
            dy:Math.sin(angle),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleWavelength(entity.light) 
        };
    });
};

function sampleLaserLight(entity, lightSamples)
{
    return Array.from({length: lightSamples}).map((_, k)=>{
        const angle = entity.transform.rotate;//+(Math.random()-0.5)*Math.PI/600.0;
        return {
            x:entity.transform.translate.x, 
            y:entity.transform.translate.y, 
            dx:Math.cos(angle), 
            dy:Math.sin(angle),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleWavelength(entity.light) 
        };
    });
};

function sampleDirectionalLight(entity, lightSamples, uniform=false)
{
    const offsetX = Math.cos(entity.transform.rotate+Math.PI/2);
    const offsetY = Math.sin(entity.transform.rotate+Math.PI/2);
    const centerX = entity.transform.translate.x;
    const centerY = entity.transform.translate.y;

    return Array.from({length: lightSamples}).map((_, i)=>{
        const randomRayOffset = entity.light.width*myrandom()-entity.light.width/2;
        const uniformOffset = entity.light.width*(i/(lightSamples-1))-entity.light.width/2;
        const rayOffset = uniform ? uniformOffset : randomRayOffset; 
        return {
            x: centerX + offsetX * rayOffset,
            y: centerY + offsetY * rayOffset, 
            dx: Math.cos(entity.transform.rotate),
            dy: Math.sin(entity.transform.rotate),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleWavelength(entity.light) 
        };
    });
}

export {samplePointLight, sampleLaserLight, sampleDirectionalLight}