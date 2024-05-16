import createREGL from "regl"




/*
 * GL Renderer
 */
import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLines} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"

import QUAD from "./QUAD.js"
import { loadShader } from "./shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs");
const intersectRaysWithCSGShader = await loadShader("./src/gl-renderer/shaders/intersectRaysWithCSG.fs");
const bounceRaysShader = await loadShader("./src/gl-renderer/shaders/bounceRays.fs")
const wavelengthToColorShader = await loadShader("./src/gl-renderer/shaders/wavelengthToColor.fs");

import { sampleLight } from "./sampleLight.js";
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
        this.LightSamples = Math.pow(4,5);//128*128; //Math.pow(4,4);
        this.MAX_BOUNCE = 6;
        this.viewBox = {x: 0, y: 0, w: 512, h: 512};
        this.outputResolution = [512, 512];
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
                preserveDrawingBuffer: true,
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
                'webgl_draw_buffers', // multiple render targets
                'OES_texture_float'
            ]
        });
    }

    initTextures()
    {
        const lightsCount = 2;
        const RaysCount =16**2; // default size for tyextures
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount));

        const regl = this.regl;

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
    }

    initFramebuffers()
    {
        const regl = this.regl;
        // Framebuffers
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
            color: this.hitDataTexture,
            depth: false
        });

        this.secondaryRayDataFbo = regl.framebuffer({
            color: [
                this.secondaryRayDataTexture, 
                this.secondaryLightDataTexture
            ],
            depth: false
        });
    }

    resizeGL()
    {
        const [width, height] = [this.canvas.clientWidth, this.canvas.clientHeight];
        this.canvas.width = width;
        this.canvas.height = height;
        this.outputResolution = [width, height]
        // console.log("resizeGL", this.outputResolution);
    }

    setViewBox(viewBox){
        this.viewBox = viewBox;
    }

    renderGL(scene)
    {
        // console.log("renderGL", this.outputResolution)
        const regl = this.regl;
        const backgroundLightness = 0.03;

        /*
         * CAST INITIAL RAYS
         */
        /* filter entities to lights */
        const rays = Object.entries(scene)
            .filter( ([key, entity])=>entity.hasOwnProperty("light") && entity.hasOwnProperty("transform") )
            .map( ([key, entity])=>{
                return sampleLight(entity, this.LightSamples);
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

        /* maps scene data to circles */
        const transformData = Object.values(scene)
        .filter(entity=>entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform"))
        .map(entity=>[
            entity.transform.translate.x, 
            entity.transform.translate.y, 
            entity.transform.rotate || 0.0
        ]);

        const shapeData = Object.values(scene)
        .filter(entity=>entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform"))
        .map(entity=>{
            switch (entity.shape.type) {
                case "circle":
                    return [0, entity.shape.radius,0,0];
                case "rectangle":
                    return [1, entity.shape.width, entity.shape.height, 0];
                case "sphericalLens":
                    return [2, entity.shape.diameter, entity.shape.edgeThickness, entity.shape.centerThickness];
                default:
                    break;
            }
            return []
        });

        const circleData = Object.entries(scene)
            .filter(([key, entity])=>{
                return entity.hasOwnProperty("transform")
                    && entity.hasOwnProperty("shape") 
                    && entity.shape.type=="circle"
            })
            .map( ([key, entity])=>[
                entity.transform.translate.x, 
                entity.transform.translate.y, 
                entity.shape.radius,
                {"circle": 1, "rectangle": 2, "sphericalLens": 3}[entity.shape.type]
            ]);

        console.log(transformData);
        console.log(shapeData);
        console.log(circleData);
        /* CLEAR THE CANVAS */
        regl.clear({color: [backgroundLightness,backgroundLightness,backgroundLightness,1.0]});

        /*
         * Trace Rays
         */

        for(let i=0; i<this.MAX_BOUNCE; i++)
        {
            /* INTERSECT RAYS WITH CSG */
            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.hitDataFbo,
                uniforms: {
                    rayDataTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    circleData: circleData.flat(),
                    circleCount: circleData.length,
                    transformData: transformData.flat(),
                    shapeData: shapeData.flat(),
                    shapesCount: shapeData.length
                },
                frag: intersectRaysWithCSGShader
            })();

            /* Bounce rays with hitPoints */
            regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.secondaryRayDataFbo,
                uniforms:{
                    outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentRaysTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentLightsTexture: this.lightDataTexture,
                    hitDataTexture: this.hitDataTexture,
                    hitDataResolution: [this.hitDataTexture.width, this.hitDataTexture.height]
                },
                frag:bounceRaysShader
            })()

            /* draw hitPoints */
            drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.hitDataTexture,
                raysLength: 20.0,
                raysColor: [0,1,0,1],
                outputResolution: this.outputResolution,
                viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h}
            });

            /* draw rays */
            drawLines(regl, {
                linesCount: rays.length,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                colors: this.rayColorsDataTexture,
                outputResolution: this.outputResolution,
                viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
            });

            /* Swap Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo] = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture] = [this.secondaryRayDataTexture, this.rayDataTexture];
            [this.lightDataTexture, this.secondaryLightDataTexture] = [this.secondaryLightDataTexture, this.lightDataTexture];
        }
    }
}

export default GLRaytracer;