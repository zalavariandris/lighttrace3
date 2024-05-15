import {sampleBlackbody} from "./blackbody.js"
/**
 * Cast rays from lightsources
 * @param {Object} params - The options object
 * @param {number} params.lightSamples - The number of light samples
 * @param {Array} params.lightEntities - The array of light entities
 * @param {Texture} params.outputRayDataTexture - The texture to write rayData as rgba(originX, originY, directionX, directionY)
 * @returns {number} The total count of rays
 */
function castRaysFromLights({
    lightSamples,
    lightEntities,
    outputRayDataTexture,
    outputLightDataTexture
})
{   
    const lightsCount =  lightEntities.length;
    const RaysCount = lightSamples*lightsCount;

    // calc output texture resolution to hold rays data
    const [dataWidth, dataHeight] = [Math.ceil(Math.sqrt(RaysCount)),Math.ceil(Math.sqrt(RaysCount))];

    // generate rays
    let rays = lightEntities.map( ([key, entity])=>{
        switch (entity.light.type) {
            case "point":
                return Array.from({length: lightSamples}).map((_, k)=>{
                    const angle = k/lightSamples*Math.PI*2+Math.PI/8.0;
                    return {
                        x:entity.transform.translate.x, 
                        y:entity.transform.translate.y, 
                        dx:Math.cos(angle), 
                        dy:Math.sin(angle),
                        intensity: 1.0/lightSamples,
                        wavelength: sampleBlackbody(entity.light.temperature)
                    };
                });
            case "laser":
                return Array.from({length: lightSamples}).map((_, k)=>{
                    const angle = entity.transform.rotate;
                    return {
                        x:entity.transform.translate.x, 
                        y:entity.transform.translate.y, 
                        dx:Math.cos(angle), 
                        dy:Math.sin(angle),
                        intensity: 1.0/lightSamples,
                        wavelength: sampleBlackbody(entity.light.temperature)
                    };
                });
            case "directional":
                return Array.from({length: lightSamples}).map((_, k)=>{
                    const angle = k/lightSamples*Math.PI*2+Math.PI/8.0;
                    return {
                        x:entity.transform.translate.x, 
                        y:entity.transform.translate.y, 
                        dx:Math.cos(angle), 
                        dy:Math.sin(angle),
                        intensity: 1.0/lightSamples,
                        wavelength: sampleBlackbody(entity.light.temperature)
                    };
                });
        
            default:
                break;
        }

    }).flat(1);

    // generate wavelength data for
    
    // upload data to an RGBA float texture
    outputRayDataTexture({
        width: dataWidth,
        height: dataHeight,
        format: "rgba",
        type: "float",
        data: rays.map(ray=>[ray.x, ray.y, ray.dx, ray.dy])
    });

    outputLightDataTexture({
        width: dataWidth,
        height: dataHeight,
        format: "rgba",
        type: "float",
        data: rays.map(ray=>[ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity])
    });

    return RaysCount;
}

export default castRaysFromLights;