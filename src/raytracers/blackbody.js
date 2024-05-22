import React, {Children, useState} from "react"
import _ from "lodash"

const h = React.createElement;

function blackbodyIntensity(wavelength, temperature) {
    const h = 6.62607015e-34; // Planck's constant (m² kg / s)
    const c = 299792458; // Speed of light (m/s)
    const kB = 1.380649e-23; // Boltzmann constant (m² kg / s² K)

    const lambda = wavelength * 1e-9; // Convert wavelength from nm to meters
    const T = temperature; // Temperature in Kelvin

    const numerator = (2 * h * Math.pow(c, 2)) / Math.pow(lambda, 5);
    const denominator = Math.exp((h * c) / (lambda * kB * T)) - 1;

    const intensity = numerator / denominator;

    return intensity;
}

function blackbodyRadiationAtAllFrequencies(temperature, frequencyMin, frequencyMax, numSteps) {
    const h = 6.62607015e-34; // Planck's constant (m² kg / s)
    const c = 299_792_458; // Speed of light (m/s)
    const kB = 1.380649e-23; // Boltzmann constant (m² kg / s² K)

    const T = temperature; // Temperature in Kelvin
    const deltaNu = (frequencyMax - frequencyMin) / numSteps;

    let totalRadiance = 0;

    for (let i = 0; i < numSteps; i++)
    {
        const nu = frequencyMin + i * deltaNu;
        const lambda = c / nu; // Convert frequency to wavelength

        const numerator = 2 * h * Math.pow(nu, 3);
        const denominator = Math.exp((h * nu) / (kB * T)) - 1;

        const spectralRadiance = numerator / denominator;
        totalRadiance += spectralRadiance * deltaNu; // Numerical integration using the trapezoidal rule
    }

    return totalRadiance;
}

function sample(discrete_probability_distributions)
{
    // Generate a random number between 0 and 1
    const random_number = Math.random();
    
    // Initialize cumulative probability
    let cumulative_probability = 0;
    
    // Iterate through the distributions
    for (let i = 0; i < discrete_probability_distributions.length; i++) {
        // Add the probability of the current distribution to cumulative probability
        cumulative_probability += discrete_probability_distributions[i];
        
        // Check if the random number falls within the cumulative probability
        if (random_number < cumulative_probability) {
            // Return the value associated with the current distribution
            return i;
        }
    }
    
    // If no value has been returned yet, return the last value
    return discrete_probability_distributions.length - 1;
}


function Plot({
    y=[1,40,30,50,10], 
    x=null,
    minx=null,
    maxx=null,
    miny=null,
    maxy=null
}={})
{
    // x spacing
    x = x || y.map((_,i)=>i);

    // auto range
    minx = minx===null ? _.min(x) : minx;
    maxx = maxx===null ? _.max(x) : maxx;
    miny = miny===null ? _.min(y) : miny;
    maxy = maxy===null ? _.max(y) : maxy;

    const rangex = maxx-minx;
    const rangey = maxy-miny;
    const points = _.zip(x,y).map(([x,y])=>{
        return [(x-minx)/rangex*256,256-(y-miny)/rangey*256];
    });

    return h("svg", {
        width: 256, 
        height: 256,
        viewBox: "0 0 256 256",
        preserveAspectRatio:"none"
    },
        h("g", {
                // transform: `scale(${256/rangex},${-256/rangey}) translate(${-minx},${-miny-rangey})`
            },
            h("path", {
                d: `${points.map((p, i)=> (i>0?"L":"M")+`${p[0]},${p[1]}`).join(" ")}`,
                stroke: "blue",
                fill: "none",
                strokeWidth: 1,
                vectorEffect: "non-scaling-stroke"
            })
        ),
        // YAxis
        h("line", {
            x1:0, y1:0, x2:0,y2:256,
            stroke: "black",
            strokeWidth:3
        }),
        h("text", {
            x:4,y:250
        }, `${miny}`),
        h("text", {
            x:4,y:20
        }, `${maxy}`),
        //X Axis
        h("line", {
            x1:0, y1:256, x2:256,y2:256,
            stroke: "black",
            strokeWidth:3
        }),
    );
}


/**
 * Samples a wavelength based on the blackbody radiation spectrum for a given temperature.
 * This function uses Planck's law to calculate the spectral radiance for wavelengths in the visible spectrum
 * and then samples a wavelength based on the calculated radiance distribution.
 * 
 * @param {number} temperature - The temperature of the blackbody in Kelvin.
 * @param {number} samplesStep - The step size for sampling wavelengths within the visible spectrum. Default is 10 nm.
 * @returns {number} The sampled wavelength in nanometers.
 */
function sampleBlackbody(temperature, samplesStep=10)
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
    const random = Math.random();
    const sampledIndex = cumulativeProbabilities.findIndex(cumProb => random < cumProb);
    const sampledWavelength = radianceMap[sampledIndex].wavelength;

    return sampledWavelength;
}

function BlackBody()
{
    const [temperature, setTemperature] = React.useState(5200);

    // Example usage:
    const c = 299_792_458; // Speed of light (m/s)
    const frequencyMin = 1e14; // Minimum frequency in Hz
    const frequencyMax = 1e16; // Maximum frequency in Hz
    
    const numSteps = 10; // Number of steps for numerical integration
    // const overallRadiation = blackbodyRadiationAtAllFrequencies(temperature, frequencyMin, frequencyMax, numSteps);

    // Blackbody radiation in visible range
    const wavelengths = _.range(380-200,780+200,10);
    
    const visibleIntensities = wavelengths.map(wavelength => {
        const radianceAtFrequency = blackbodyIntensity(wavelength, temperature)
        return radianceAtFrequency;
    });

    // Sample radiation
    const sumIntensity = _.sum(visibleIntensities);
    const selectedCount = wavelengths.map(v=>0);
    const probabilities = visibleIntensities.map(intensity=>intensity/sumIntensity);
    for(let i=0;i<100000;i++)
    {
        const sampled_wavelength_index = sample(probabilities);
        selectedCount[sampled_wavelength_index]+=1;
    }

    return h("div", {}, 
        h("section", null,
            h("h3",null, "Blackbody Radiation"),
            h("label", {}, 
                "Temperature",
                h("input", {
                    type: "range", 
                    min:1000, max: 10000,
                    value: temperature,
                    onChange: (e)=>setTemperature(e.target.value)
                }),
                `${temperature}K`
            ),h("br"),

            h(Plot, {
                y: visibleIntensities,
                x: wavelengths,
                miny:0,
                // maxy:500000000000000//overallRadiation/50000000000
            })
        ),
        h("section",null,
            h("h3",null, "Sample Radiation"),
            h(Plot, {
                // y: visibleIntensities,
                y: selectedCount,
                miny:0,
                // maxy:500000000000000//overallRadiation/50000000000
            }),
        ),
    );
}

export default BlackBody;
export {sampleBlackbody};

