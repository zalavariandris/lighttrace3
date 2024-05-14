// Create packed lightraydata for each light [[Cx,Cy,Dx,Dy]...]
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
})
{   
    const lightsCount =  lightEntities.length;
    const RaysCount = lightSamples*lightsCount;

    // calc output texture resolution to hold rays data
    const [dataWidth, dataHeight] = [Math.ceil(Math.sqrt(RaysCount)),Math.ceil(Math.sqrt(RaysCount))];

    let rayData = lightEntities.map( ([key, entity])=>{
        return Array.from({length: lightSamples}).map((_, k)=>{
            const angle = k/lightSamples*Math.PI*2+Math.PI/8.0;
            return [entity.pos.x, entity.pos.y, Math.cos(angle), Math.sin(angle)];
        })
    }).flat(1);
    
    // upload data to an RGBA float texture
    outputRayDataTexture({
        width: dataWidth,
        height: dataHeight,
        format: "rgba",
        type: "float",
        data: rayData
    });

    return RaysCount;
}

export default castRaysFromLights;