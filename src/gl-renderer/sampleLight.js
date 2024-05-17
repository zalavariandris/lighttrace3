import {sampleBlackbody} from "./blackbody.js"

function sampleLight(entity, lightSamples)
{
    switch (entity.light.type) {
        case "point":
            return samplePointLight(entity, lightSamples);
        case "laser":
            return sampleLaserLight(entity, lightSamples);
        case "directional":
            return sampleDirectionalLight(entity, lightSamples);
    }
}

function samplePointLight(entity, lightSamples)
{
    return Array.from({length: lightSamples}).map((_, k)=>{
        const angle = k/lightSamples*Math.PI*2+Math.PI/8.0;
        return {
            x:entity.transform.translate.x, 
            y:entity.transform.translate.y, 
            dx:Math.cos(angle), 
            dy:Math.sin(angle),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleBlackbody(entity.light.temperature)
        };
    });
};

function sampleLaserLight(entity, lightSamples)
{
    return Array.from({length: lightSamples}).map((_, k)=>{
        const angle = entity.transform.rotate;
        return {
            x:entity.transform.translate.x, 
            y:entity.transform.translate.y, 
            dx:Math.cos(angle), 
            dy:Math.sin(angle),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleBlackbody(entity.light.temperature)
        };
    });
};

function sampleDirectionalLight(entity, lightSamples)
{
    const offsetX = Math.cos(entity.transform.rotate+Math.PI/2);
    const offsetY = Math.sin(entity.transform.rotate+Math.PI/2);
    const centerX = entity.transform.translate.x;
    const centerY = entity.transform.translate.y;

    return Array.from({length: lightSamples}).map((_, i)=>{
        const randomRayOffset = entity.light.width*Math.random()-entity.light.width/2
        return {
            x: centerX + offsetX * randomRayOffset,
            y: centerY + offsetY * randomRayOffset, 
            dx: Math.cos(entity.transform.rotate),
            dy: Math.sin(entity.transform.rotate),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleBlackbody(entity.light.temperature)
        };
    });
}

export {sampleLight}