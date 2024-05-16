import {sampleBlackbody} from "./blackbody.js"
/**
 * Cast rays from lightsources
 * @param {Object} params - The options object
 * @param {number} params.lightSamples - The number of light samples
 * @param {Array} params.lightEntities - The array of light entities
 * @param {Texture} params.outputRayDataTexture - The texture to write rayData as rgba(originX, originY, directionX, directionY)
 * @returns {number} The total count of rays
 */

Array.prototype.extend = function(value, newLength)
{
    const oldLength = this.length;
    this.length = newLength
    this.fill(value, oldLength, newLength);
    return this
}

function castRaysFromLights({
    lightSamples,
    lightEntities,
    outputRayDataTexture,
    outputLightDataTexture
})
{   
    const RaysCount = lightSamples*lightEntities.length;

    // calc output texture resolution to hold rays data
    const dataWidth = Math.ceil(Math.sqrt(RaysCount));
    const dataHeight = dataWidth;
    console.log("ray data shape:", dataWidth, dataHeight)

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
                const dirX = Math.cos(entity.transform.rotate);
                const dirY = Math.sin(entity.transform.rotate);
                const offsetX = Math.cos(entity.transform.rotate+Math.PI/2);
                const offsetY = Math.sin(entity.transform.rotate+Math.PI/2);
                const centerX = entity.transform.translate.x;
                const centerY = entity.transform.translate.y;
                return Array.from({length: lightSamples}).map((_, i)=>{
            
                    const randomRayOffset = entity.light.width*Math.random()-entity.light.width/2
            
                    const originX = centerX + offsetX * randomRayOffset;
                    const originY = centerY + offsetY * randomRayOffset;
                    
                    return {
                        x: originX,
                        y: originY, 
                        dx: dirX,
                        dy: dirY,
                        intensity: entity.light.intensity/lightSamples,
                        wavelength: sampleBlackbody(entity.light.temperature)
                    };
                });
            default:
                break;
        }
        return RaysCount;
    }).flat(1);

    // generate wavelength data for
    
    // upload data to an RGBA float texture
    
    outputRayDataTexture({
        width: dataWidth,
        height: dataHeight,
        format: "rgba",
        type: "float",
        data: rays.map(ray=>[ray.x, ray.y, ray.dx, ray.dy]).fill([0,0,0,0], RaysCount, dataWidth*dataHeight).extend([0,0,0,0], dataWidth*dataHeight)
    });

    const lightData = rays.map(ray=>[ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity]).extend([0,0,0,0], dataWidth*dataHeight)
    outputLightDataTexture({
        width: dataWidth,
        height: dataHeight,
        format: "rgba",
        type: "float",
        data: rays.map(ray=>[ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity]).extend([0,0,0,0], dataWidth*dataHeight)
    });

    return RaysCount;
}

export default castRaysFromLights;