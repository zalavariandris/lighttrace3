import {sampleBlackbody} from "./blackbody.js"
import {myrandom} from "../utils.js"

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
            wavelength: sampleBlackbody(entity.light.temperature, myrandom(k+1))
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
            wavelength: sampleBlackbody(entity.light.temperature, myrandom(k+1))
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
            wavelength: sampleBlackbody(entity.light.temperature, myrandom(i+1))
        };
    });
}

export {samplePointLight, sampleLaserLight, sampleDirectionalLight}