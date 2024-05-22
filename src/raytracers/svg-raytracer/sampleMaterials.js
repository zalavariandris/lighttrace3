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

function sampleDielectric(vx, vy, ior, randomNumber) 
{
    const eta = vy < 0.0 ? ior : 1.0/ior;

    /* calculate dielectric reflectance */
    // const Fr = dielectricReflectance(eta, abs(wi.y), cosThetaT);
    
    const sinThetaTSq = eta*eta*(1.0 - Math.abs(vy)*Math.abs(vy));

    let cosThetaT;
    let fresnell;
    if (sinThetaTSq > 1.0)
    {
        cosThetaT = 0.0;
        fresnell = 1.0;
    }else{
        const cosThetaI = Math.abs(vy);
        cosThetaT = Math.sqrt(1.0 - sinThetaTSq); 
        const Rs = (eta*cosThetaI - cosThetaT)/(eta*cosThetaI + cosThetaT);
        const Rp = (eta*cosThetaT - cosThetaI)/(eta*cosThetaT + cosThetaI);
    
        fresnell =  (Rs*Rs + Rp*Rp)*0.5;
    }

    if (randomNumber < fresnell)
    {
        return [-vx, vy];
    }
    else
    {
        return [-vx*eta, -cosThetaT*Math.sign(vy)];
    }
}

export {sampleMirror, sampleDiffuse, sampleDielectric};