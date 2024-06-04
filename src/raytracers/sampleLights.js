import {sampleBlackbody} from "./blackbody.js"


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

function sampleDirectionalLight(entity, lightSamples, uniform=false)
{
    const offsetX = Math.cos(entity.transform.rotate+Math.PI/2);
    const offsetY = Math.sin(entity.transform.rotate+Math.PI/2);
    const centerX = entity.transform.translate.x;
    const centerY = entity.transform.translate.y;

    return Array.from({length: lightSamples}).map((_, i)=>{
        const randomRayOffset = entity.light.width*Math.random()-entity.light.width/2;
        const uniformOffset = entity.light.width*(i/(lightSamples-1))-entity.light.width/2;
        const rayOffset = uniform ? uniformOffset : randomRayOffset; 
        return {
            x: centerX + offsetX * rayOffset,
            y: centerY + offsetY * rayOffset, 
            dx: Math.cos(entity.transform.rotate),
            dy: Math.sin(entity.transform.rotate),
            intensity: entity.light.intensity/lightSamples,
            wavelength: sampleBlackbody(entity.light.temperature)
        };
    });
}

export {samplePointLight, sampleLaserLight, sampleDirectionalLight}