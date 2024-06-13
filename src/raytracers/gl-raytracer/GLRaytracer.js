/*
 * GL Renderer
 */
import createREGL from "regl"

import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLines} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"

import QUAD from "./QUAD.js"
import { loadShader } from "./shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/raytracers/gl-raytracer/shaders/PASS_THROUGH_VERTEX_SHADER.fs");
const intersectRaysWithCSGShader = await loadShader("./src/raytracers//gl-raytracer/shaders/intersectRaysWithCSG.fs");
const bounceRaysShader = await loadShader("./src/raytracers//gl-raytracer/shaders/bounceRays.fs")
const wavelengthToColorShader = await loadShader("./src/raytracers//gl-raytracer/shaders/wavelengthToColor.fs");

import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";

import { myrandom } from "../../utils.js";

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

function loadImageData(imagePath){
    return new Promise(resolve => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.src = imagePath;
        im.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = im.width;
            canvas.height = im.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(im, 0, 0);

            const imageData = ctx.getImageData(0, 0, im.width, im.height);
    
            resolve(imageData);
        };
    })
}

const spectralImage = await loadImageData("./src/Spectrum-cropped.png");

Array.prototype.extend = function(value, newLength)
{
    const oldLength = this.length;
    this.length = newLength
    this.fill(value, oldLength, newLength);
    return this
}

class GLRaytracer{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.outputResolution = [16, 16];
        this.listeners = []
        this.totalSamples = 0;
        this.totalPasses = 0;

        // settings
        this.settings = {
            lightSamples: Math.pow(4,5),//128*128; //Math.pow(4,4);
            debug: true,
            maxBounce: 7,
            downres: 1,
        };

        this.animate();

    }

    animate()
    {
        this.animationHandler = requestAnimationFrame(()=>this.animate());
        if(this.passesRendered<this.settings.targetPasses){
            this.renderPass();
        }
    }

    initGL()
    {
        // console.log("init gl", this.outputResolution)
        this.initRegl();
        this.initTextures();
        this.initFramebuffers();
    }

    initRegl(){
        this.regl = createREGL({
            canvas: this.canvas,
            // pixelRatio: 2.0,
            attributes: {
                // width: 1024, heigh: 1024,
                alpha: false,
                depth: false,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                preferLowPowerToHighPerformance: false,
                failIfMajorPerformanceCaveat: false,
                blend: {
                    enable: true,
                    func: {
                        srcRGB: 'one',
                        dstRGB: 'one',
                        srcAlpha: 'one',
                        dstAlpha: 'one',
                    },
                    equation: {
                        rgb: 'add',
                        alpha: 'add'
                    },
                    color: [0,0,0,0]
                },
            },
            extensions: [
                'WEBGL_draw_buffers', // multiple render targets
                'OES_texture_float'
            ]
        });
    }

    initTextures()
    {
        const regl = this.regl;

        /* texture for raytracing */
        const lightsCount = 2;
        const RaysCount =16**2; // default size for tyextures
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount));
        this.spectralTexture = regl.texture({
            data: spectralImage.data,
            flipY:false,
            width: spectralImage.width, 
            height: spectralImage.height,
            wrap: 'clamp',
            format: "rgba",
            type: "uint8"
        });

        this.rayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.secondaryRayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitDataTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.lightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayColorsDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitMaterialTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.secondaryLightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        /* texture for post processing */
        this.sceneTexture = regl.texture({
            width: this.outputResolution[0],
            height: this.outputResolution[1],
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
        this.postTexture1 = regl.texture({
            width: this.outputResolution[0],
            height: this.outputResolution[1],
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
        this.postTexture2 = regl.texture({
            width: this.outputResolution[0],
            height: this.outputResolution[1],
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
    }

    initFramebuffers()
    {
        const regl = this.regl;
        /* Framebuffers for raytracing */
        this.rayDataFbo = regl.framebuffer({
            color: [
                this.rayDataTexture,
                this.lightDataTexture   
            ],
            depth: false
        });

        this.rayColorFbo = regl.framebuffer({
            color: this.rayColorsDataTexture,
            depth: false
        });

        this.hitDataFbo = regl.framebuffer({
            color: [
                this.hitDataTexture,
                this.hitMaterialTexture
            ],
            depth: false
        });

        this.secondaryRayDataFbo = regl.framebuffer({
            color: [
                this.secondaryRayDataTexture, 
                this.secondaryLightDataTexture
            ],
            depth: false
        });

        /* scene fbo */
        this.sceneFbo = regl.framebuffer({
            color: this.sceneTexture,
            depth: false    
        });

        /* Framebuffers for post processing */
        this.postFbo1 = regl.framebuffer({
            color: this.postTexture1,
            depth: false    
        });
        this.postFbo2 = regl.framebuffer({
            color: this.postTexture2,
            depth: false    
        });
    }

    resizeGL()
    {
        const [width, height] = [this.canvas.clientWidth, this.canvas.clientHeight];
        this.canvas.width = width;
        this.canvas.height = height;
        this.outputResolution = [width, height]
    }

    clear()
    {
        const regl = this.regl;
        regl.clear({
            framebuffer: this.postFbo1, 
            color: [0,0,0,1.0]
        });
        regl.clear({
            framebuffer: this.postFbo2, 
            color: [0,0,0,1.0]
        });
        this.totalPasses=0;
        this.totalSamples=0;
    }

    renderPass(scene, viewBox)
    {
        const regl = this.regl;
        /* CLEAR THE CANVAS */
        
        if(!scene || !viewBox)
        {
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }



        const lights = Object.entries(scene)
        .filter( ([key, entity])=>entity.hasOwnProperty("light") && entity.hasOwnProperty("transform"));
        
        if(lights.length<1)
            {
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }
        this.totalPasses+=1;
        

        const backgroundLightness = 0.03;

        /*
         * CAST INITIAL RAYS
         */
        /* filter entities to lights */
        const rays = Object.entries(scene)
            .filter( ([key, entity])=>entity.hasOwnProperty("light") && entity.hasOwnProperty("transform") )
            .map( ([key, entity])=>{
                switch (entity.light.type) {
                    case "point":
                        return samplePointLight(entity, this.settings.lightSamples);
                    case "laser":
                        return sampleLaserLight(entity, this.settings.lightSamples);
                    case "directional":
                        return sampleDirectionalLight(entity, this.settings.lightSamples);
                    default:
                        return {
                            x:0, 
                            y:0, 
                            dx:0, 
                            dy:0,
                            intensity: 0,
                            wavelength: 0
                        }
                }
            }).flat(1);

        // calc output texture resolution to hold rays data
        const dataTextureRadius = Math.ceil(Math.sqrt(rays.length));
    
        // upload data to an RGBA float texture  
        this.rayDataTexture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            format: "rgba",
            type: "float",
            data: rays.map(ray=>[ray.x, ray.y, ray.dx, ray.dy]).extend([0,0,0,0], dataTextureRadius**2)
        });
    
        this.lightDataTexture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            format: "rgba",
            type: "float",
            data: rays.map(ray=>[ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity]).extend([0,0,0,0], dataTextureRadius**2)
        });

        /* resize compute FBO to contain all rays */
        this.rayDataFbo.resize(dataTextureRadius);
        this.secondaryRayDataFbo.resize(dataTextureRadius);
        this.hitDataFbo.resize(dataTextureRadius);
        this.rayColorFbo.resize(dataTextureRadius);

        /* ray colors from wavelength */
        regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
            framebuffer: this.rayColorFbo,
            uniforms:{
                outputResolution: [this.rayColorFbo.width, this.rayColorFbo.height],
                lightDataTexture: this.lightDataTexture,
                lightDataResolution: [this.lightDataTexture.width, this.lightDataTexture.height],
                spectralTexture: this.spectralTexture
            },
            frag: wavelengthToColorShader
        })()

        /* prepare scene data for GPU */
        const shapeEntities = Object.values(scene)
        .filter(entity=>entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform") && entity.hasOwnProperty("material"))

        const transformData = shapeEntities
        .map(entity=>[
            entity.transform.translate.x, 
            entity.transform.translate.y, 
            entity.transform.rotate || 0.0
        ]);

        const shapeData = shapeEntities.map(entity=>{
            switch (entity.shape.type) {
                case "circle":
                    return [0, entity.shape.radius,0,0];
                case "rectangle":
                    return [1, entity.shape.width, entity.shape.height, 0];
                case "sphericalLens":
                    return [2, entity.shape.diameter, entity.shape.edgeThickness, entity.shape.centerThickness];
                case "triangle":
                    return [3, entity.shape.size, 0,0];
                case "line":
                    return [4, entity.shape.length, 0,0];
                default:
                    return [0, 10,0,0];
                    break;
            }
            return []
        });

        const materialData = shapeEntities.map(entity=>{
            switch (entity.material.type) {
                case "mirror":
                    return [0, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                case "glass":
                    return [1, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                case "diffuse":
                    return [2, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                default:
                    break;
            }
        });
        console.log(scene)
        console.log(shapeEntities)
        console.log(shapeData)
        console.log(materialData)

        /*
         * Trace Rays
         */
        regl.clear({framebuffer: this.sceneFbo, color: [0,0,0,1.0]});
        /* resize output framebuffers */
        if(this.sceneFbo.width!=this.outputResolution[0] || this.sceneFbo.height!=this.outputResolution[1])
        {
            this.sceneFbo.resize(this.outputResolution[0], this.outputResolution[1]);
            this.postFbo1.resize(this.outputResolution[0], this.outputResolution[1]);
            this.postFbo2.resize(this.outputResolution[0], this.outputResolution[1]);
        }

        for(let i=0; i<this.settings.maxBounce; i++)
        {
            /* INTERSECT RAYS WITH CSG */

            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.hitDataFbo,
                uniforms: {
                    rayDataTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    shapesCount: shapeData.length,
                    ...shapeEntities.length>0? { // include shape info in uniforms only if they exist. otherwise regl throws an error. TODO: review this
                        transformData: transformData.flat(),
                        shapeData: shapeData.flat(),
                        materialData: materialData.flat()
                    }:{}
                },
                frag: intersectRaysWithCSGShader
            })();

            /* Bounce rays with hitPoints */
            regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.secondaryRayDataFbo,
                uniforms:{
                    outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentRaysTexture: this.rayDataTexture,
                    incidentLightsTexture: this.lightDataTexture,
                    hitDataTexture: this.hitDataTexture,
                    hitMaterialTexture: this.hitMaterialTexture,
                    SEED: myrandom(Math.random())
                },
                frag:bounceRaysShader
            })()

            /*
                Draw rays to sceneFBO;
            */
            /* draw hitPoints */
            drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.hitDataTexture,
                raysLength: 5.0,
                raysColor: [0,1,0,1],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFbo
            });

            /* draw rays */
            drawLines(regl, {
                linesCount: rays.length,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                colors: this.rayColorsDataTexture,
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFbo
            });

            /* Swap Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo] = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture] = [this.secondaryRayDataTexture, this.rayDataTexture];
            [this.lightDataTexture, this.secondaryLightDataTexture] = [this.secondaryLightDataTexture, this.lightDataTexture];
        }

        this.totalSamples+=rays.length;
        // this.emitChange()

        /* POST PROCESSING */

        /* accumulate */
        regl({...QUAD,
            framebuffer: this.postFbo1,
            viewport: {x:0, y:0, width:this.outputResolution[0], height: this.outputResolution[1]},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                textureA: this.sceneTexture,
                textureB: this.postFbo2
            },
            frag:`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D textureA;
            uniform sampler2D textureB;
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main() {
                vec4 texA = texture2D(textureA, vUV).rgba;
                vec4 texB = texture2D(textureB, vUV).rgba;
                gl_FragColor = vec4(texA.rgb+texB.rgb, 1.0);
            }`
        })();

        /* render post processing FBO to screen */
        regl({...QUAD,
            framebuffer: null,
            viewport: {x:0, y:0, width:this.outputResolution[0], height: this.outputResolution[1]},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                texture: this.postFbo1,
                outputResolution: this.outputResolution,
                exposure: 1.0/this.totalPasses
            },
            frag:`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D texture;
            uniform float exposure;
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main() {
                vec4 tex = texture2D(texture, vUV).rgba;
                vec3 color = tex.rgb*exposure;
                color = filmic(color);
                gl_FragColor = vec4(color, 1.0);
            }`
        })();

        //
        [this.postFbo1, this.postFbo2]=[this.postFbo2, this.postFbo1]
        // [this.postTexture1, this.postTexture2]=[this.postTexture2, this.postTexture1]

    }
}

export default GLRaytracer;