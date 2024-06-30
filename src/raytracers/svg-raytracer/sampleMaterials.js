/**
 * Reflects a vector across the Y-axis. Works in tangent space.
 * surface rangent is along the Y axis.
 * @param {number} vx - The x-component of the incident vector.
 * @param {number} vy - The y-component of the incident vector.
 * @returns {vec2} - The reflected vector.
 */
function sampleMirror(vx, vy)
{
    return [-vx, vy]; 
}

/**
 * Reflects a vector across the Y-axis. Works in tangent space.
 * surface rangent is along the Y axis.
 * @param {number} vx - The x-component of the incident vector.
 * @param {number} vy - The y-component of the incident vector.
 * @returns {vec2} - The reflected vector.
 */
function sampleDiffuse(vx, vy, randomNumber)
{
    const x = randomNumber*2.0 - 1.0;
    const y = Math.sqrt(1.0 - x*x);
    return [x, y*Math.sign(vy)];
}

// function dielectricReflectance(eta, cosThetaI, out float cosThetaT) {
//     float sinThetaTSq = eta*eta*(1.0 - cosThetaI*cosThetaI);
//     if (sinThetaTSq > 1.0) {
//         cosThetaT = 0.0;
//         return 1.0;
//     }
//     cosThetaT = sqrt(1.0 - sinThetaTSq);

//     float Rs = (eta*cosThetaI - cosThetaT)/(eta*cosThetaI + cosThetaT);
//     float Rp = (eta*cosThetaT - cosThetaI)/(eta*cosThetaT + cosThetaI);

//     return (Rs*Rs + Rp*Rp)*0.5;
// }

/**
 * Calculates the refractive index using Cauchy's equation.
 * @param {number} A - The first Cauchy coefficient.
 * @param {number} B - The second Cauchy coefficient.
 * @param {number} lambda - The wavelength of light in micrometers: nm*1e-3.
 * @returns {number} - The refractive index.
 */
function cauchyEquation(A, B, lambda) {
    return A + (B / (lambda * lambda));
}

/**
 * Calculates the refractive index using the Sellmeier equation.
 * @param {number[]} b - The Sellmeier coefficients for the numerator.
 * @param {number[]} c - The Sellmeier coefficients for the denominator.
 * @param {number} lambda - The wavelength of light in micrometers: nm*1e-3.
 * @returns {number} - The refractive index.
 */
function sellmeierEquation(b, c, lambda) {
    // Calculate the square of the wavelength
    const lambdaSq = lambda * lambda;

    // Calculate the refractive index using the Sellmeier equation
    let nSq = 1.0;
    nSq += (b[0] * lambdaSq) / (lambdaSq - c[0]);
    nSq += (b[1] * lambdaSq) / (lambdaSq - c[1]);
    nSq += (b[2] * lambdaSq) / (lambdaSq - c[2]);

    // Return the square root of the refractive index squared
    return Math.sqrt(nSq);
}

/**
 * Samples a dielectric material to determine the direction of the reflected or refracted ray.
 * @param {number} vx - The x component of the incident ray direction.
 * @param {number} vy - The y component of the incident ray direction.
 * @param {number} ior - The index of refraction of the material.
 * @param {number} randomNumber - A random number between 0 and 1 used for probabilistic decisions.
 * @returns {number[]} - The direction of the reflected or refracted ray as an array [vx, vy].
 */
function sampleDielectric(vx, vy, ior, randomNumber) 
{
    // Determine the relative index of refraction
    const eta = vy > 0.0 ? ior : 1.0 / ior;
    
    // Calculate the square of the sine of the transmission angle
    // to determine if total internal reflection occurs
    const sinThetaTSq = eta**2 * (1.0 - Math.abs(vy)**2);

    let cosThetaT;
    let fresnell;
    if (sinThetaTSq > 1.0) // Total internal reflection occurs when sinThetaTSq > 1.0
    {
        cosThetaT = 0.0; // No transmission, so cosThetaT is set to 0
        fresnell = 1.0; // Total internal reflection means 100% reflectance
    } else {
        const cosThetaI = Math.abs(vy); // Cosine of the incident angle
        cosThetaT = Math.sqrt(1.0 - sinThetaTSq); // Cosine of the transmission angle
        
        // Calculate the Fresnel reflectance using the Schlick approximation
        const Rs = (eta * cosThetaI - cosThetaT) / (eta * cosThetaI + cosThetaT); // Reflectance for s-polarized light
        const Rp = (eta * cosThetaT - cosThetaI) / (eta * cosThetaT + cosThetaI); // Reflectance for p-polarized light
    
        fresnell = (Rs * Rs + Rp * Rp) * 0.5; // Average reflectance
    }

    // Determine whether to reflect or refract based on the random number
    if (randomNumber < fresnell) // Reflect if the random number is less than the Fresnel reflectance
    {
        return [-vx, vy]; // Reflect the ray
    }
    else // Refract if the random number is greater than or equal to the Fresnel reflectance
    {
        return [-vx * eta, -cosThetaT * Math.sign(vy)]; // Refract the ray
    }
}

function snellsLaw(vx, vy, ior) 
{
    const eta = vy > 0.0 ? ior : 1.0 / ior;
    const sinThetaTSq = eta * eta * (1.0 - vy * vy);

    if (sinThetaTSq > 1.0) 
    {
        // Total internal reflection
        return [-vx, vy];
    } 
    else 
    {
        const cosThetaT = Math.sqrt(1.0 - sinThetaTSq);
        return [-vx * eta, -cosThetaT * Math.sign(vy)];
    }
}

export {sampleMirror, sampleDiffuse, sampleDielectric, snellsLaw, sellmeierEquation, cauchyEquation};